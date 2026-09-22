const _ = require("lodash");
const { load } = require("../utils/load.js");
const { app_dir } = require("../constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");

/*
    Two brief templates reach this engine, and designers have live campaigns in
    both.

    The brief template the beta was written for gives every *component* a row. A
    module row names the type in `Module Type`, and the rows beneath it each
    carry one component as a `component` / `Content` pair:

        Module Type | component | Content
        hero trade  |           |
                    | image     | HERO_01
                    | terms     | *T&Cs apply.

    The brief template v2.5 was written for gives every *module* a row and spreads its
    components across columns, under a machine-readable key row that sits below
    the human-readable headings:

        moduleType | image   | subheading1_text      | terms
        hero trade | HERO_01 | Members Double Up     | *T&Cs apply.

    Rather than teach the engine two content models, the wide sheet is turned
    into the tall one here -- at the point a sheet becomes objects, before
    anything has looked at them. setupContent, formatProperties, grouping and
    styling all see one shape and cannot tell which of the two a brief came from.

    v2.5 read the wide template by deleting a fixed two rows so the machine-key
    row became the header (main_external.js:944). This engine finds that row by
    looking for `moduleType` in it, which lands on the same row for the same
    reason -- both header rows spell it, and find_header_row takes the last of a
    run.
*/

/*
    The discriminator. Only the component-per-row template has a `component`
    column; the wide one has no way to name a component except by which column
    the value sits in.

    Detecting on the header rather than on the data matters for a short sheet: a
    tall sheet whose modules happen to carry no components at all would have no
    `component` value anywhere in its rows, but it still has the column.
*/
const TALL_MARKER = "component";

/*
    What a button says when the brief gives a link but no label.

    The wide template splits a button across `button1_text` and `button1_link`
    and campaigns routinely fill in only the link. "SHOP NOW" is what both v2.5
    (its CTA_TEXT global default) and this engine's Offer Library path
    (setup.js) already put there.
*/
const DEFAULT_BUTTON_TEXT = "SHOP NOW";

/** Trimmed string, or "" for null, undefined and numbers Excel handed back. */
function text_of(value) {
    return value === undefined || value === null ? "" : String(value).trim();
}

function is_url(value) {
    return text_of(value).toLowerCase().startsWith("http");
}

/*
    An absolute URL, cut at the first character that cannot be part of one.

    A countdown timer's artwork is a URL copied out of the service that renders
    it, and what gets pasted is routinely the whole <img> tag it came wrapped in
    -- `https://.../scale_2x" alt="motionmailapp.com`. Left alone that reaches
    the src attribute whole, closes it early, and injects the remainder into the
    email as markup. The brief template even asks for it that way, so this is
    the normal case rather than a typo worth stopping for.
*/
function clean_url(value) {
    return text_of(value).split(/["'\s]/)[0];
}

/*
    The image, carrying the row's link if it has one.

    v2.5 applies `button1_link` to a row's image as much as to its button: every
    image macro in components.njk wraps its <img> in <a href="{{ button1_link }}">
    when the column is filled. This engine puts the link on the component
    instead, in the `NAME (url)` form formatRichText parses.

    An absolute src is left unlinked. formatRichText tests for `http` only on
    the branch with no brackets, so `https://... (url)` would be looked for in
    the campaign's images folder and come out as `images/https://...`.
*/
function image_content(row) {
    const image = text_of(row.image);
    if (!image) return "";
    if (is_url(image)) return clean_url(image);

    const link = text_of(row.button1Link);
    return link ? `${image} (${link})` : image;
}

/*
    The disclaimer symbol is a column of its own, and v2.5 renders it as a
    superscript on the main offer -- `subheading1_text` -- rather than as a
    component in its own right (components.njk:208).

    `^x` is the marker formatRichText turns into a <sup>, and is the convention
    the Offer Library path in setup.js already uses for exactly this.
*/
function with_disclaimer(text, symbol) {
    const body = text_of(text);
    const mark = text_of(symbol);
    if (!body || !mark) return body;
    return `${body}^${mark}`;
}

/*
    v2.5 keeps a button's label and its link in two columns; this engine takes
    the single "TEXT (link)" string formatRichText parses. A link with no label
    still makes a button. A label with no link does not -- there is nothing for
    it to do, and an empty href renders as a dead button.
*/
function button_content(row) {
    const link = text_of(row.button1Link);
    if (!link) return "";
    return `${text_of(row.button1Text) || DEFAULT_BUTTON_TEXT} (${link})`;
}

/*
    A wide row's settings, in the "key: value" string the tall template's
    Settings column carries and formatUserInput already parses.

    Only the palette crosses over. The wide template has no free-text settings
    column -- everything else it can say, it says by filling in a named column.
*/
function settings_of(row) {
    const palette = text_of(row.palette);
    return palette ? `palette: ${palette}` : undefined;
}

/*
    A wide row's components, in the order they should render.

    The order is the point, not a detail. structureEDM filters a module's
    children by component_positions but never sorts them, so the sequence they
    are emitted in here is the sequence they appear in the email. This is the
    order every module definition lists in its component_positions.
*/
function components_of(row) {
    const components = [];
    const push = (component, content) => {
        if (text_of(content)) components.push({ component: component, content: text_of(content) });
    };

    push("image", image_content(row));
    push("badge", row.badge);
    push("heading", row.headingText);
    push("subheading", with_disclaimer(row.subheading1Text, row.disclaimer));
    push("subheading", row.subheading2Text);
    push("bodycopy", row.bodycopyText);
    push("button", button_content(row));
    push("terms", row.terms);

    return components;
}

/*
    One wide row becomes a module row followed by its component rows.

    A row with no moduleType is a continuation of the module above it -- v2.5
    calls these INLINE rows (main_external.js:968). That needs no special case
    here: emitting its components and no module row attaches them to the
    preceding module, which is exactly how the tall template says the same
    thing.

    moduleName is carried through because it is the name a designer gave the
    module and the one the ILC downloader files images under. Columns this
    engine has no use for -- the ILC codes, NOTES -- are dropped. The ILC
    downloader reads the sheet itself, so nothing here can take those from it.
*/
function widen_row(row) {
    const rows = [];

    if (text_of(row.moduleType)) {
        rows.push({
            moduleType: text_of(row.moduleType),
            ...(text_of(row.brand) ? { brand: text_of(row.brand) } : {}),
            ...(text_of(row.moduleName) ? { moduleName: text_of(row.moduleName) } : {}),
            ...(settings_of(row) ? { settings: settings_of(row) } : {})
        });
    }

    return rows.concat(components_of(row));
}

/**
 * Read one content sheet of a brief, whichever brief template it was written from.
 *
 * @param {object} ws          the worksheet
 * @param {string} description what to call this sheet in an error
 * @returns {object[]} rows in the component-per-row shape setupContent expects
 */
function read_content_sheet(ws, description) {
    const wide = !aers.header_keys(ws, "moduleType", description).includes(TALL_MARKER);
    const rows = aers.sheet_to_objects(ws, "moduleType", description);

    return wide ? _.flatMap(rows, widen_row) : rows;
}

module.exports = {
    read_content_sheet: read_content_sheet
};
