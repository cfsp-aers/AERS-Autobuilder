const _ = require("lodash");

const { app_dir, user_files } = require("../constants.js");
const { load } = require("../utils/load.js");

const { setBrand } = load(app_dir, "main/properties/brand.js");
const { layersOf, LAYERS } = load(app_dir, "main/processing/update.js");

/*
    What the brief asked for, read off the layers rather than out of the bag.

    Every branch below wants to know "did anyone actually ask for this colour,
    or is this only what the defaults left?", and it used to ask the item's own
    `user_settings`. That is the wrong question by one step. A module aiming a
    setting at its components -- `button: { background: blue }` -- never writes
    into the button's bag: it writes into the module's, and `update` delivers it
    to the button as layer 6, the highest layer ADR 0005 has. Asking the bag
    made the top layer invisible, so a brief that set a button's colour through
    its module lost to a button palette nobody had asked for, while the same
    words written in the button's own settings won.

    Layer 5 is the cut because 1 to 4 are the library talking to itself --
    defaults and styling rules -- and 5 and 6 are the brief talking. Everything
    this file does afterwards is derivation: turning a palette name into the
    colours it stands for. Derivation may read what the brief said; it may not
    outrank it.

    It survives the palette/resolved_palette split, which was expected to retire
    it. Splitting the keys fixed the half of the problem it was covering for --
    derivation no longer overwrites the question -- but not this half. A module
    aiming `button: { palette: green/white }` at its button writes into the
    module's bag, and `update()` delivers it to the button as layer 6. The
    button's own bag never sees it, so a function reading bags cannot find it,
    however clean the keys are. Drop `palette` from the list below and
    `module-user-palette` in tests/palette.js fails on its own.

    What would retire it is the same split applied to `background` and `colour`,
    which are still narrowed in place -- a palette's background name, then the
    hex `replaceColours` turns it into. That is a bigger change than this one:
    those two are what all 23 template reads read, so it moves every rendered
    email, where splitting `palette` moved none.

    Asserted in tests/palette.js.
*/
function settingsOf(item) {
    const asked = Object.assign({}, item.user_settings);
    ["palette", "background", "colour"].forEach((key) => {
        const top = layersOf(item, key).pop();
        if (top && top.layer >= LAYERS.component_user) asked[key] = item[key];
    });
    return asked;
}

function setPalettes(db) {
    const { ms, cs } = db;

    /*
        A fold, not a map, and it has to stay one: `m` is mutated in place and
        returned, so `db.ms[i - 1]` below is the previous module as this loop
        already left it. The inheritance is a chain, and reordering or
        parallelising this changes what it means.
    */
    db.ms = db.ms.map((m, i) => {
        const prev = i > 0 ? db.ms[i - 1] : {};

        /*
            A row shares one background, because it is one band.

            Two modules side by side sit on a single full-width strip, so they
            cannot disagree about its colour -- that is a fact about the layout
            rather than a preference, and it is why this copy exists at all.
            `row_index` is the module's place in its sibling group, so
            `row_index > 1` is exactly "there is a module to my left".

            It used to be scoped to `m.name == prev.name` alone, with no row in
            it, which made the copy run the length of an unbroken run of
            same-named modules instead of stopping at the row. Tint one pair of
            product tiles and every pair after it was tinted too, with no way to
            write "and now stop": only a module of another name ended it. The
            `layout` golden case had been recording it as expected -- a bare
            `text block` with no settings of its own, rendering on a yellow band
            it had inherited from a hero two modules upstream.

            A second block below this one said `if (m.row_index > 1)` and copied
            the palette again. It could never fire on anything the block above
            had not already taken, because a row is by construction a run of
            same-named modules, so it was dead in every build. It is gone, and
            its condition is the one kept here: it was the correct scope, written
            by someone who had seen this, and shadowed by the broader copy above.

            Asserted from both sides in tests/palette.js -- widen it and the leak
            cases fail, remove it and the row splits down the middle.
        */
        if (m.row_index > 1 && m.name == prev.name) {
            m.resolved_palette = m.user_settings?.palette ? m.user_settings.palette : prev.resolved_palette;
            m.background = m.user_settings?.background ? m.user_settings.background : prev.background;
            m.colour = m.user_settings?.colour ? m.user_settings.colour : prev.colour;
        }

        // Unscoped on purpose, and only fills a background that is not there:
        // a container with no background of its own sits on whatever it is
        // sitting on. `product tile` has one in its defaults, so this reaches
        // only the modules that do not -- `text block` at depth 2 is the one
        // in the suite.
        if (m.depth == 2) {
            m.background ??= m.user_settings.background ? m.user_settings.background : db.ms[i - 1]?.background;
        }
        m = setPalette(m, settingsOf(m), m);

        db.cs[m.uuid]?.forEach((c) => {
            c = setPalette(c, settingsOf(c), m);
        });
        /*
            A colour named on a depth-1 module is the band it sits on.

            `colour` and `background` mean nearly the same thing on a module --
            setPalette resolves an unasked `colour` to the palette's own
            background -- so a brief that names one has named the band, and this
            carries it across. `palette` still wins over `colour` when both are
            written, which is what the `else if` this replaced said.

            What that `else if` also said was `m.background = m.palette`, and
            that was a bug: it put the palette's *name* into a colour field.
            setPalette has already resolved the palette to its background by the
            time this runs, so the line overwrote a correct hex with a word.

            It survived because the words it was tested with are also colours.
            `yellow`, `white` and `black` name a palette and a colour both, so
            the colour library resolved them at the end of the build and no one
            saw it. The palettes that are only palettes are exactly the ones a
            brief is meant to use -- `primary`, `secondary`, `light`, `neutral`,
            `dark`, `promo` -- and each of those reached the email as
            `background-color: dark`, which no client understands, so the module
            rendered with no background at all.

            Asserted in tests/palette.js against every name the brand's own
            palette file defines, so a new palette cannot reintroduce it.
        */
        if (m.depth == 1 && m.user_settings?.colour && !m.user_settings.palette) m.background = m.colour;
        return m;
    });

    return;
}

function setPalette(item, user = {}, parent = {}) {
    /*
        `palette` is the question; `resolved_palette` is the answer.

        Everything below this line derives, and derivation used to write its
        answers back over `item.palette` -- the same key `update()` had just
        resolved through six layers. A button asking for `primary` came out
        holding `yellow/black`, and the record no longer said `primary` anywhere.
        That is why settingsOf() exists: with the question overwritten, the only
        surviving copy of it was the layer stack, so every branch here had to go
        back and read the stack to find out what had been asked.

        Splitting them costs one key and settles the argument. `palette` is
        written by `update()` and by nothing else, so it keeps its layers, its
        provenance and its clobber detection, and it still says `primary` at the
        end of the build. `resolved_palette` is written here and by nothing else,
        so it needs no layers at all -- a key with one writer has no precedence
        question to answer. That is the whole trick: the split turns a conflict
        the layer system could not express into two keys that never compete.

        Seeded with `??=` rather than `=` because setPalettes may already have
        decided: a module sharing a row has taken the row's palette before this
        runs, and that decision outranks its own default.
    */
    if (item.entity_type !== "component") item.resolved_palette ??= user.palette ? user.palette : item.palette || "default";
    else item.resolved_palette ??= item.palette;

    item.background = user.background ? user.background : item.background || null;
    item.colour = user.colour ? user.colour : item.colour || null;

    let active_palette;

    if (item.entity_type === "component") {
        if (item.type === "button") {
            const btn_brand = parent.resolved_palette.includes("/") ? setBrand(parent.resolved_palette.split("/")[0], item.brand) : item.brand.toLowerCase();
            item.brand = btn_brand;
            active_palette = getPalette(item.brand, item.parent_brand, parent.resolved_palette);

            const btn_lib = load(user_files, "libraries/button palettes.json");
            const btn_palettes = btn_lib[btn_brand] ? btn_lib[btn_brand] : btn_lib.default;

            /*
                `primary` and `secondary` are not button palettes. They are a
                question put to the colour palette the button is standing on --
                "whichever button you call primary" -- and the answer is a real
                button palette like `yellow/black`. Both spellings are also keys
                in `button palettes.json`, as a fallback for a brand whose colour
                palette does not answer.
            */
            if (item.resolved_palette == "primary") {
                item.resolved_palette = active_palette.button.primary;
            } else if (item.resolved_palette == "secondary") {
                item.resolved_palette = active_palette.button.secondary;
            }
            if (Object.keys(btn_palettes).indexOf(item.resolved_palette) < 0) {
                item.resolved_palette = "primary";
            }
            if (item.background != "transparent") {
                item.background = user.background ? user.background : btn_palettes[item.resolved_palette].background;
                item.colour = user.colour ? user.colour : btn_palettes[item.resolved_palette].colour;
            } else {
                item.colour = user.colour ? user.colour : active_palette.text.body;
            }

            item = setButtonColours(item, user, btn_palettes, active_palette);
        } else if (item.type === "image") {
            // Deliberately nothing. An image has no colours of its own, and
            // this empty arm is the whole of what keeps it out of the text
            // branch below -- remove it and seven of the nine golden cases
            // change, because every image picks up a text colour it then
            // renders nowhere.
        } else {
            // A text component has no palette of its own -- `button.js` is the
            // only component definition that declares one -- so unless the brief
            // named it, this is the parent's answer, not a question of its own.
            item.resolved_palette = user.palette ? user.palette : parent.resolved_palette;
            active_palette = getPalette(item.brand, item.parent_brand, item.resolved_palette);

            // This used to say the line above twice more, with the `getPalette`
            // call between them, and re-assign `background` to itself besides.
            // `getPalette` takes three strings and mutates nothing, so the
            // second write could only ever land the value the first one had
            // just landed; `background` was settled at the top of the function.
            if (active_palette.text[item.colour]) {
                item.colour = active_palette.text[item.colour];
            } else {
                item.colour ??= active_palette.text.body || null;
            }
        }
    } else {
        active_palette = getPalette(item.brand, item.parent_brand, item.resolved_palette);

        /*
            A depth-2 module is a container. It sits on whatever is behind it and
            takes no background from its own palette, so only depth 1 falls back
            to one -- the depth-2 arm of this was `background = background`, an
            assignment to itself standing in for the absence of a rule.
        */
        if (item.depth != 2) item.background ??= user.background ? user.background : active_palette.background;

        item.colour = user.colour ? user.colour : active_palette.background;
    }

    /*
    ------------------------------------------------------------------------
    A sketch, not a description. What follows is the design as someone wanted
    it, kept because it is the only written statement of intent for this file --
    but it is not what the code above does, and it should not be read as though
    it were.

    Two lines of it are known to be unbuilt. "if no palette given, try using
    background instead. If not valid, try colour" describes a fallback chain
    that nothing implements; the code goes the other way, deriving background
    from palette. And the depth-1 rule below is the one that was implemented
    backwards for long enough to ship -- `background = palette` put a name where
    a colour goes, and every palette that is not also a colour reached the email
    unrenderable. See the comment on that line in setPalettes.
    ------------------------------------------------------------------------

    special palettes (palette links per brand):
    - default
    - primary
    - secondary
    - accent
    - promo
    - light
    - neutral
    - dark
    // If palette exists here, swap it for the corresponding value

    overall palette colours
    - primary       : background colour :   yellow  /   black   /   white
    - secondary     : secondary colour :    white   /   white
    - text
        - primary   : specific colour name
        - secondary : specific colour name
        - body      : specific colour name
    - button
        - primary   : button palette name
        - secondary : button palette name

    cases:
    - module depth 1:
        - palette       :   changes overall colour scheme for module
        - background    :   changes overall colour scheme for module
        - colour        :   changes overall colour scheme for module

        if no palette given, try using background instead. If not valid, try colour. If not valid again, set palette to default and background to whatever the background was.

    - module depth 2
        - palette       :   changes overall colour scheme for ~container~
        - background    :   changes background behind ~container~
        - colour        :   changes overall colour scheme for ~container~
    
    - button
    // buttons should have their own palettes i.e. light = white bg, black text
    // naming for button palettes ? light/primary
        - palette       :   changes colour scheme for button
        - background    :   changes background behind ~container~
        - colour        :   changes overall colour scheme for ~container~

    */

    return item;
}

/*
    The colours a button ends up with, and the borders told to match them.

    `user` is what the brief asked for, from settingsOf(). This body used to
    reach past it to `button.user_settings`, which is the same one-step-short
    mistake settingsOf() exists to fix -- and it is why a module could not name
    a button's palette.

    What this function returns is discarded, and always was. setPalette assigns
    it back over its own `item`, and setPalettes drops that on the floor: it
    calls setPalette inside `forEach((c) => { c = setPalette(c, ...) })`, so the
    assignment lands on the loop variable and nothing else. Only what is mutated
    onto `button` here has ever survived.

    That matters because this used to end `return { ...button, ...result }`,
    where `result` held the button palette's own background and colour -- the
    same colours the outline and underline branch below had just deliberately
    replaced with the parent's. The note here said the two were in competition
    and that nothing was safe to tidy until someone decided which was meant to
    win. Neither was, and neither could be: the spread was unobservable from
    anywhere in the program. Taking it out moved no golden file and no rendered
    button in any of the three modes. What survives of `result` is the single
    value the borders read.
*/
function setButtonColours(button, user, button_palettes, parent_palette) {
    /*
        Puts back what setPalette may have just taken away. A palette it does
        not recognise is reset to "primary" up there, which is what makes the
        pair below reachable: `green/white` is no button palette, so by here
        `button.palette` says "primary" and `user.palette` still says the pair.
    */
    button.resolved_palette = user.palette ? user.palette : button.resolved_palette || "primary";
    let active_palette = button_palettes[button.resolved_palette] ? button_palettes[button.resolved_palette] : button_palettes.primary;

    // The free-form pair: background before the slash, colour after, for a
    // palette no library names. Anchored in tests/palette.js -- every case
    // there had been a comparison between two routes to this, and deleting it
    // broke both routes at once, so the suite went on agreeing at the wrong
    // colour.
    if (user.palette?.includes("/") && !button_palettes[button.resolved_palette]) {
        button.background = user.palette.split("/")[0];
        button.colour = user.palette.split("/")[1];
    }

    if (button.mode == "underline" || button.mode == "outline") {
        button.colour = user.colour ? user.colour : parent_palette.text.body;
        button.background = parent_palette.background;
    }

    // What a border means when it says `match/background`: the background the
    // button's own palette gives it, which is not necessarily the background
    // the button ends up with -- an outline button has its parent's.
    const matched = user.background ? user.background : active_palette.background;

    if (button.border_top == "match/background") button.border_top = matched;
    if (button.border_right == "match/background") button.border_right = matched;
    if (button.border_bottom == "match/background") button.border_bottom = matched;
    if (button.border_left == "match/background") button.border_left = matched;

    return button;
}

function getPalette(item_brand, parent_brand, target_palette) {
    let palette = target_palette.includes("/") ? target_palette.split("/")[1] : target_palette?.toLowerCase();
    const brand = target_palette.includes("/") ? setBrand(target_palette.split("/")[0], item_brand) : item_brand.toLowerCase();

    /*
        Three tiers, each falling back to the one under it. Most brands have no
        palettes file of their own, so a missing file is the ordinary case and
        not an error -- the fallback is already assigned before the load is
        tried, which is what the empty catches are for.
    */
    const default_palettes = load(user_files, `libraries/colour palettes/default palettes.json`);
    let parent_brand_palettes = default_palettes;
    try {
        parent_brand_palettes = load(user_files, `libraries/colour palettes/${parent_brand?.toLowerCase()} palettes.json`);
    } catch (_) {}
    let brand_palettes = parent_brand_palettes;
    try {
        brand_palettes = load(user_files, `libraries/colour palettes/${brand?.toLowerCase()} palettes.json`);
    } catch (_) {}

    if (brand_palettes["palette links"][palette]) {
        palette = brand_palettes["palette links"][palette];
    }

    if (brand_palettes[palette]) {
        return brand_palettes[palette];
    } else if (parent_brand_palettes[palette]) {
        return parent_brand_palettes[palette];
    } else if (default_palettes[palette]) {
        return default_palettes[palette];
    } else {
        return default_palettes.default;
    }
}

module.exports = {
    setPalettes: setPalettes
};
