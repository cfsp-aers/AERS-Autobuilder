/*
    Whether setPalettes() respects the layers that ran before it.

    ADR 0005 puts six layers under every property and says a module user setting
    (6) is the top of them. `applyModifications` honours that. `setPalettes`
    runs afterwards -- main.js:187, still marked NEEDS WORK -- and it does not
    go through `update()` at all: it writes straight onto the item, and it used
    to decide precedence for itself with `user.background ? user.background :
    ...`, where `user` was the item's own `user_settings`.

    That last detail was the whole bug. A module setting aimed at a component --
    `button: { background: blue }` -- never lands in the component's own bag. It
    lands in the module's, and `update()` delivers it to the component as layer
    6. Read the bag instead of the layers and the highest layer there is becomes
    invisible, so it lost to a button palette no brief had asked for -- while
    the same words written in the button's own settings won.

    Every case here is written as "these two must agree" rather than as a
    colour. A button told `background: blue` by its module and a button told
    `background: blue` by itself have been given the same instruction twice, so
    whatever blue turns out to mean the two have to match, and a redesign of the
    palette moves both together. tests/precedence.js reads its expectations out
    of the engine for the same reason.

    Confirmed load-bearing by mutation, against properties/palette.js:
        setButtonColours reads the bag again      only module-user-palette fails
        components pass their bag again           all three button cases fail
        settingsOf's layer cut removed entirely   all nine golden cases fail

    The text case is the control: it passed before the fix and after it, which
    is what says the defect was the button path rather than the whole file.

        node tests/palette.js
        node tests/palette.js --keep     leave the build behind to inspect
*/

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const here = __dirname;
const repo_root = path.resolve(here, "..");

const keep = process.argv.includes("--keep");

const XLSX = require(path.join(repo_root, "node_modules/xlsx"));

// ------------------------------------------------------------------- brief

/*
    One module per case, each marked by the content of its body copy, so a case
    is found by what it says rather than by counting rows.

    Everything is Petbarn and every colour is named rather than hexed: the
    engine swaps a name for its brand's hex at the very end, and a test that
    wrote "#0080C4" would be asserting the colour library rather than the layer
    that chose it.
*/
const HEADER = ["Module Type", "component", "Content", "Offer Details\n(DO NOT TOUCH)", "Brand", "Dynamic Content", "Settings", "Notes"];
const module_row = (type, settings) => [type, null, null, null, null, null, settings || null];
const component_row = (component, content, settings) => [null, component, content, null, null, null, settings || null];

/*
    Each case is a module carrying a button (or, for the control, nothing but
    body copy), and the settings that are put in conflict on it.

    The expectations are never a colour. They are another case: "this must come
    out the same as that one". A button told `background: blue` by its module
    and a button told `background: blue` by itself have been given the same
    instruction twice over, so whatever blue turns out to mean, the two have to
    agree -- and a redesign of the palette moves both together.
*/
/*
    `green/white` is not a named palette. It is the free-form pair the engine
    also accepts -- background before the slash, colour after -- and it is read
    out of `button.user_settings.palette` by hand, one `if` inside
    setButtonColours. So it works from the component's own bag and cannot work
    from the module's, which is the same inversion again in a third property.
*/
const PAIR_PALETTE = "green/white";

const CASES = [
    {
        /*
            Told nothing at all, and the reference every anchor below is read
            against. It carries no `same_as`, so nothing compares two routes to
            it -- its whole job is to be the colour a button comes out when no
            brief has spoken, so the other cases can show they moved off it.
        */
        id: "told-nothing",
        why: "the anchor: a button and a body copy with no settings anywhere",
        module_settings: null,
        button_settings: null
    },
    {
        id: "component-user-button",
        why: "the reference: a component user setting (5) at a button",
        module_settings: null,
        button_settings: "background: blue, colour: yellow"
    },
    {
        id: "module-user-button",
        why: "a module user setting (6) reaches a button",
        module_settings: "button: { background: blue, colour: yellow }",
        button_settings: null,
        same_as: "component-user-button",
        keys: ["background", "colour"]
    },
    {
        id: "module-beats-component-button",
        why: "a module user setting (6) beats a component user setting (5) at a button",
        module_settings: "button: { background: blue, colour: yellow }",
        button_settings: "background: black, colour: white",
        same_as: "component-user-button",
        keys: ["background", "colour"]
    },
    {
        id: "component-user-palette",
        why: "the reference: a component user setting (5) naming a button palette",
        module_settings: null,
        button_settings: `palette: ${PAIR_PALETTE}`
    },
    {
        id: "module-user-palette",
        why: "a module user setting (6) can name a button palette",
        module_settings: `button: { palette: ${PAIR_PALETTE} }`,
        button_settings: null,
        same_as: "component-user-palette",
        keys: ["background", "colour"]
    },
    {
        id: "component-user-text",
        why: "the control: a component user setting (5) at a text component",
        module_settings: null,
        bodycopy_settings: "colour: yellow"
    },
    {
        id: "module-user-text",
        why: "a module user setting (6) reaches a text component",
        module_settings: "bodycopy: { colour: yellow }",
        bodycopy_settings: null,
        same_as: "component-user-text",
        keys: ["colour"],
        component: "bodycopy"
    }
];

function writeBrief() {
    const rows = [
        ["Palette", null, null, null, null, null, "Settings"],
        HEADER,
        ["header", null, "Subject line: Palette\nPreheader: What setPalettes does to a layer", null, "Petbarn"]
    ];

    CASES.forEach((test_case) => {
        rows.push(module_row("text block", test_case.module_settings));
        rows.push(component_row("body copy", `CASE ${test_case.id}`, test_case.bodycopy_settings));
        if (!test_case.component) rows.push(component_row("button", "Click", test_case.button_settings));
    });

    rows.push(module_row("footer"));

    return rows;
}

/*
    The second brief: what one module's colour does to the next one's.

    `setPalettes` copies palette, background and colour from the module before
    when the two share a name, and that copy used to be scoped to the name alone
    -- so an unbroken run of same-named modules all took the first one's colours,
    for as long as the run lasted. A brief that tinted one pair of product tiles
    tinted every pair after it, and there was no way to write "and now stop".
    The `layout` golden case had it: a bare `text block` with no settings at all
    rendered on a yellow band, two hops downstream of a hero.

    It is scoped to the row now. Two tiles sitting side by side share one
    full-width band behind them, so they cannot disagree about its colour -- that
    is a fact about the layout, not a preference -- and a row is exactly the set
    of modules that share one. Nothing carries past it.

    Six product tiles, which group two to a row: a bare pair, a tinted pair, and
    a bare pair after it. No hex appears in the assertions. The claim is "the
    third pair looks like the first", which stays true if someone changes what
    `promo` means.
*/

const TINT = "blue";

// Named on one module of a row, to watch which key carries it to the other.
// Not `product tile`'s own default, or there would be nothing to see.
const ROW_PALETTE = "dark";

function writeInheritanceBrief() {
    const rows = [
        ["Inheritance", null, null, null, null, null, "Settings"],
        HEADER,
        ["header", null, "Subject line: Inheritance\nPreheader: what one module does to the next", null, "Petbarn"]
    ];

    // Adjacent on purpose: any module of another name ends the run, so a
    // separator between the pairs would hide the leak rather than test it.
    [
        ["control-1", null],
        ["control-2", null],
        ["tinted-1", `background: ${TINT}`],
        ["tinted-2", null],
        ["after-1", null],
        ["after-2", null],
        // A row that names a palette rather than a colour. Everything above
        // moves `background`, and `background` is copied across a row whichever
        // key holds the palette -- so without this pair nothing here can tell
        // `palette` and `resolved_palette` apart.
        ["palette-1", `palette: ${ROW_PALETTE}`],
        ["palette-2", null]
    ].forEach(([id, settings]) => {
        rows.push(module_row("product tile", settings));
        rows.push(component_row("body copy", `CASE ${id}`));
    });

    rows.push(module_row("footer"));

    return rows;
}

/*
    The third brief: what a palette name resolves to on the module that names it.

    A palette and a colour are different kinds of thing, and `setPalettes` used
    to end by confusing them -- `if (m.user_settings.palette) m.background =
    m.palette`, which put a palette's *name* where a colour goes. setPalette had
    already resolved that palette to its background one line earlier, so the
    correct hex was overwritten with a word, and the word went all the way to the
    email as `background-color: dark`. No client understands that, so the module
    rendered with no background at all.

    Nothing caught it because of a coincidence in the library: `yellow`, `white`
    and `black` name a palette and a colour both, so the colour library resolved
    them anyway at the end of the build, and those are the ones the golden briefs
    happen to use. The six that are only palettes -- `primary`, `secondary`,
    `light`, `neutral`, `dark`, `promo` -- are the names a brief is actually told
    to write, and every one of them was broken.

    So the names are read out of the brand's palette file rather than listed
    here. Add a palette to Petbarn and it is covered the same day.
*/

const brand_palettes = require(path.join(repo_root, "external/lib/libraries/colour palettes/petbarn palettes.json"));
const PALETTE_NAMES = Object.keys(brand_palettes)
    .filter((name) => name !== "palette links")
    .concat(Object.keys(brand_palettes["palette links"]));

// A brand with its own palette file, to put in front of a slash.
const OTHER_BRAND = "greencross vets";

function writeNamesBrief() {
    const rows = [
        ["Names", null, null, null, null, null, "Settings"],
        HEADER,
        ["header", null, "Subject line: Names\nPreheader: what a palette name resolves to", null, "Petbarn"]
    ];

    PALETTE_NAMES.forEach((name) => {
        rows.push(module_row("text block", `palette: ${name}`));
        rows.push(component_row("body copy", `CASE pal-${name}`));
    });

    // The colour half of the same line, which was right and stays: a colour
    // named on a module is the band it sits on.
    rows.push(module_row("text block", "colour: blue"));
    rows.push(component_row("body copy", "CASE colour-named"));
    rows.push(module_row("text block"));
    rows.push(component_row("body copy", "CASE colour-none"));

    // A brand in front of the slash reaches the button inside. Read nowhere in
    // the golden suite, so it is asserted here or nowhere.
    rows.push(module_row("text block", `palette: ${OTHER_BRAND}/light`));
    rows.push(component_row("body copy", "CASE brand-slash"));
    rows.push(component_row("button", "Click"));
    rows.push(module_row("text block", "palette: light"));
    rows.push(component_row("body copy", "CASE brand-none"));
    rows.push(component_row("button", "Click"));

    rows.push(module_row("footer"));
    return rows;
}

// ------------------------------------------------------------------- build

/*
    Build one generated brief and hand back what it produced, keyed by the
    `CASE <id>` marker in a module's body copy -- so a case is found by what it
    says rather than by counting rows, and inserting a case in the middle of a
    brief moves none of the others.

    Every brief in this file goes through here. Each gets its own working
    directory named after the brief, because a shared one would have the three
    builds overwriting each other's artifacts.
*/
function runBrief(name, sheet_name, rowsOf) {
    const dir = path.join(here, `.palette-${name}-work`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });

    const brief = path.join(dir, `${name}.xlsx`);
    const sheet = XLSX.utils.aoa_to_sheet(rowsOf());
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, sheet_name);
    XLSX.writeFile(book, brief);

    fs.writeFileSync(
        path.join(dir, "REQUIRED_DATA.json"),
        JSON.stringify({ BRIEF_PARENT_FOLDER: dir, BRIEF_LOCATION: brief, OUTPUT_LOCATION: dir, SELECTED_SHEETS: [sheet_name], ALL_SHEETS: "" }, null, 2),
        { encoding: "utf8" }
    );

    const result = spawnSync(process.execPath, [path.join(here, "golden", "build-case.js"), dir], { cwd: repo_root, encoding: "utf8" });
    if (result.status !== 0) {
        console.error(`palette: the ${name} build failed, so nothing in it can be checked.\n${(result.stderr || "").trim()}`);
        process.exit(2);
    }

    const modules = JSON.parse(fs.readFileSync(path.join(dir, "artifacts", "module_store.json"), { encoding: "utf8" }));
    const components = JSON.parse(fs.readFileSync(path.join(dir, "artifacts", "component_store.json"), { encoding: "utf8" }));

    const built = {};
    (Array.isArray(modules) ? modules : Object.values(modules)).forEach((m) => {
        const list = components[m.uuid] || [];
        const marker = list.find((c) => typeof c.content === "string" && c.content.startsWith("CASE "));
        if (!marker) return;
        built[marker.content.slice("CASE ".length)] = {
            module: m,
            bodycopy: list.find((c) => c.name === "bodycopy"),
            button: list.find((c) => c.type === "button")
        };
    });

    if (!keep) fs.rmSync(dir, { recursive: true, force: true });
    return built;
}

// ------------------------------------------------------------------- checks

const results = [];

function check(name, fn) {
    try {
        fn();
        results.push({ name: name, ok: true });
    } catch (error) {
        results.push({ name: name, ok: false, reason: error.message });
    }
}

function is(actual, expected, what) {
    if (actual !== expected) throw new Error(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const built = runBrief("layers", "Palette", writeBrief);

CASES.filter((test_case) => test_case.same_as).forEach((test_case) => {
    const which = test_case.component === "bodycopy" ? "bodycopy" : "button";

    check(`${test_case.id}: ${test_case.why}`, () => {
        const actual = built[test_case.id] && built[test_case.id][which];
        const reference = built[test_case.same_as] && built[test_case.same_as][which];
        if (!actual || !reference) throw new Error("no component built for this case");

        test_case.keys.forEach((key) => {
            is(actual[key], reference[key], `${which}.${key}, against ${test_case.same_as}`);
        });
    });
});

// ------------------------------------------------- that the instruction did anything

/*
    Every case above is a comparison between two routes to one colour, and a
    comparison is satisfied by both routes arriving at nothing.

    That is not hypothetical. Delete the branch of setButtonColours that reads
    the free-form `green/white` pair and all five button cases still pass: the
    pair stops working from the component's own bag and from the module's at the
    same moment, so the two go on agreeing -- at `#000000`, the primary button
    palette, which is neither of the colours either brief named. The suite was
    green on a feature that had been removed.

    So each instruction is also anchored against `told-nothing`. The cases above
    say the two ways of writing a setting agree; these say the setting was read
    at all. Neither is worth much without the other, and the inheritance section
    below carries the same pair of claims for the same reason.
*/

/** That a setting moved a value off what it would have been unasked. */
function moved(actual, reference, key, what) {
    if (!actual || !reference) throw new Error("no component built for this case");
    if (actual[key] === reference[key]) throw new Error(`${what}: ${key} is ${JSON.stringify(reference[key])}, which is what a component told nothing gets`);
}

check("background and colour at a button reach the button", () => {
    moved(built["component-user-button"].button, built["told-nothing"].button, "background", "button");
    moved(built["component-user-button"].button, built["told-nothing"].button, "colour", "button");
});

check("the free-form palette pair is read, not merely agreed upon", () => {
    // `green/white` is no named palette. It is a pair -- background before the
    // slash, colour after -- and one `if` inside setButtonColours is the whole
    // of its implementation.
    moved(built["component-user-palette"].button, built["told-nothing"].button, "background", "button palette pair");
});

check("colour at a text component reaches the text", () => {
    moved(built["component-user-text"].bodycopy, built["told-nothing"].bodycopy, "colour", "bodycopy");
});

// ------------------------------------------------- what carries to the next module

const rows_built = runBrief("inheritance", "Inheritance", writeInheritanceBrief);

function module_of(id) {
    if (!rows_built[id]) throw new Error(`no module built for ${id}`);
    return rows_built[id].module;
}

check("a row shares one background, because it is one band", () => {
    // Two tiles side by side sit on a single full-width band. They can no more
    // disagree about its colour than two halves of one rectangle can.
    is(module_of("tinted-2").background, module_of("tinted-1").background, "tinted-2.background, against tinted-1");
});

check("the tint reaches the row it was written on", () => {
    // The control against itself: without this, a tint that reached nothing at
    // all would satisfy every other case here.
    const tinted = module_of("tinted-1").background;
    const control = module_of("control-1").background;
    if (tinted === control) throw new Error(`background: ${TINT} changed nothing -- tinted and control are both ${JSON.stringify(control)}`);
});

check("a tint does not carry past its own row", () => {
    /*
        The one that was wrong. `after-1` starts a new row and says nothing
        about colour, so it is a plain product tile and must look like the plain
        product tile at the top of the email. It used to be the tinted one.
    */
    is(module_of("after-1").background, module_of("control-1").background, "after-1.background, against control-1");
});

check("nor to the rest of the row after it", () => {
    is(module_of("after-2").background, module_of("control-2").background, "after-2.background, against control-2");
});

// ------------------------------------------------- a palette name is not a colour

const names_built = runBrief("names", "Names", writeNamesBrief);

const COLOUR = /^#[0-9A-Fa-f]{3,8}$/;

check("every palette name resolves to a colour before it reaches the email", () => {
    const unresolved = PALETTE_NAMES.filter((name) => !COLOUR.test(names_built[`pal-${name}`]?.module?.background));
    if (unresolved.length) {
        const shown = unresolved.map((name) => `palette: ${name} -> background-color: ${names_built[`pal-${name}`]?.module?.background}`);
        throw new Error(`${unresolved.length} of ${PALETTE_NAMES.length} palettes reach the email as a name, which no client renders:\n        ${shown.join("\n        ")}`);
    }
});

check("the palettes do not all collapse to one colour", () => {
    // Guards the check above against passing for the wrong reason: every module
    // holding the same valid hex would satisfy it.
    const distinct = new Set(PALETTE_NAMES.map((name) => names_built[`pal-${name}`]?.module?.background));
    if (distinct.size < 2) throw new Error(`every palette resolved to ${JSON.stringify([...distinct][0])}`);
});

check("a colour named on a module still reaches its band", () => {
    // The half of that line which was correct, and which the fix keeps.
    moved(names_built["colour-named"].module, names_built["colour-none"].module, "background", "module told `colour: blue`");
});

check("a brand in front of the slash reaches the button", () => {
    moved(names_built["brand-slash"].button, names_built["brand-none"].button, "brand", "button under a slashed palette");
    moved(names_built["brand-slash"].button, names_built["brand-none"].button, "background", "button under a slashed palette");
});

// ------------------------------------------------- the question and the answer

/*
    `palette` is what was asked for. `resolved_palette` is what the derivation in
    properties/palette.js made of it.

    They used to be one key, and derivation won every time. A button declaring
    `palette: "primary"` in its own default_properties came out of the build
    holding `yellow/black`, and no part of the record said `primary` any more --
    so the only surviving copy of the question was the layer stack, and
    settingsOf() existed to go back and read it. Splitting them is what lets a
    key have one writer: `palette` is written by update() and nobody else,
    `resolved_palette` by the derivation and nobody else, and a key with one
    writer has no precedence question to answer.

    `primary` is a good witness because it is not a button palette at all. It is
    a question put to the colour palette the button stands on -- "whichever
    button you call primary" -- and the answer is a real palette like
    `yellow/black`. So the two keys are guaranteed to disagree, and a build that
    collapsed them back into one could not pass both checks below.
*/

const button_palettes = require(path.join(repo_root, "external/lib/libraries/button palettes.json")).petbarn;

check("a button's palette still says what was asked for", () => {
    // button.js declares `palette: "primary"` at layer 1 and nothing overrides
    // it here, so this is the whole of what anyone asked for.
    is(built["told-nothing"].button.palette, "primary", "button.palette");
});

check("and resolved_palette says what that turned into", () => {
    const resolved = built["told-nothing"].button.resolved_palette;
    if (resolved === "primary") throw new Error("resolved_palette is still `primary`, so the indirection through the colour palette did not happen");
    if (!button_palettes[resolved]) throw new Error(`resolved_palette is ${JSON.stringify(resolved)}, which the button palette library does not name`);
});

check("a palette the brief names survives derivation intact", () => {
    // The free-form pair is the case most likely to be rewritten in passing:
    // setPalette does not recognise it, resets it, and setButtonColours puts it
    // back. Through all of that, what was asked for must still be readable.
    is(built["component-user-palette"].button.palette, PAIR_PALETTE, "button.palette");
});

check("a palette carries across a row in resolved_palette", () => {
    // The row is one band, so the second tile has to end up on the first one's
    // palette. That is an answer, and it belongs in the answer key.
    is(module_of("palette-2").resolved_palette, module_of("palette-1").resolved_palette, "palette-2.resolved_palette, against palette-1");
    is(module_of("palette-1").resolved_palette, ROW_PALETTE, "palette-1.resolved_palette");
});

check("a module that inherits a row's colour keeps its own palette", () => {
    /*
        Inheritance is an answer, not a question. `after-1` never named a
        palette, so its `palette` is the one `product tile` declares, the same as
        every other tile in the brief -- what it picked up from the row belongs
        in `resolved_palette` and in `background`. This used to be written
        straight over `m.palette`, outside the layer system that had just set it.
    */
    is(module_of("after-1").palette, module_of("control-1").palette, "after-1.palette, against control-1");
    is(module_of("tinted-2").palette, module_of("control-1").palette, "tinted-2.palette, against control-1");

    // The sharp one: `palette-2` sits on `palette-1`'s band but never asked for
    // it, so its own `palette` is still the one `product tile` declares.
    is(module_of("palette-2").palette, module_of("control-1").palette, "palette-2.palette, against control-1");
    is(module_of("palette-1").palette, ROW_PALETTE, "palette-1.palette");
});

// ------------------------------------------------------------------ report

console.log(`\nChecking ${results.length} cases\n`);
results.forEach((result) => {
    console.log(`  ${result.ok ? "ok  " : "FAIL"}  ${result.name}`);
    if (!result.ok) console.log(`        ${result.reason}`);
});

const failures = results.filter((result) => !result.ok);
console.log(`\n${"=".repeat(72)}\n${results.length - failures.length}/${results.length} passing`);
if (failures.length && !keep) console.log(`re-run with --keep to inspect ${path.relative(repo_root, here)}/.palette-*-work/`);

process.exit(failures.length ? 1 : 0);
