/*
    Node constructors for internal_layout.

    Every module definition returns a tree of plain objects that main.njk walks.
    Before this file each definition wrote that tree as a nested object literal,
    which is why `banner.js` and `banner flipped.js` were 111 lines apiece
    differing in two padding values, and why two footers shipped `inner_block`
    where they meant `innerLayout` -- a bare string key nothing validates.

    See docs/adr/0003-layouts-are-composed-not-configured.md.

    ~~~~~~~~~~~ the grammar ~~~~~~~~~~~

    The templates in lib/html templates/layouts/ define a strict nesting:
    a container holds rows, a row holds columns, a column holds components or
    another container. Two of those levels can be implied rather than written,
    through an `innerLayout` flag, and each constructor below is one point in
    that grammar:

        container(options, rows)        gridContainer -- children are rows
        columns(options, cols)          gridContainer + an implied single row
        row(options, cols)              gridRow -- children are columns
        stack(options, components)      gridRow + an implied single column
        col(options, children)          gridCol

    So `columns()` is the shorthand for "a container of one row", and `stack()`
    for "a row of one column". They exist because those two shapes are most of
    what the module definitions ask for, and because writing the flag by hand is
    how `inner_block` happened.

    ~~~~~~~~~~~ components ~~~~~~~~~~~

    A module's own components arrive through setComponents(slot, content) and
    are dropped into a column. The helpers here are for the ones a layout
    declares itself -- the logo in a header, the legal text in a footer:

        component(options)              a text component (no `type` set)
        image(options)                  type: "image"
        button(options)                 type: "button"

    ~~~~~~~~~~~ key order ~~~~~~~~~~~

    Every constructor emits `{ block, [innerLayout], ...options, children }`, so
    the options bag lands in the object in the order it was written. This is not
    cosmetic: tests/golden compares email_json.json byte for byte, and the tree
    these constructors build is serialised into it. Write the options bag in the
    order the node needs its keys.

    `children` is left undefined when not passed, rather than defaulting to [],
    because a spacer column is `{ block: "gridCol" }` and an empty array is not
    the same bytes.
*/

const fs = require("node:fs");
const path = require("node:path");

const { load } = require("../utils/load.js");
const { app_dir, user_files } = require("../constants.js");

const { setComponents } = load(app_dir, "main/systems/setComponents.js");

// ------------------------------------------------------------- constructors

/** A grid container. Its children are rows. */
function container(options, children) {
    return Object.assign({ block: "gridContainer" }, options, { children: children });
}

/** A grid container holding one implied row. Its children are columns. */
function columns(options, children) {
    return Object.assign({ block: "gridContainer", innerLayout: "single_row" }, options, { children: children });
}

/** A row. Its children are columns. */
function row(options, children) {
    return Object.assign({ block: "gridRow" }, options, { children: children });
}

/** A row holding one implied column. Its children are components. */
function stack(options, children) {
    return Object.assign({ block: "gridRow", innerLayout: "single_column" }, options, { children: children });
}

/** A column. Its children are components, or a nested container. */
function col(options, children) {
    return Object.assign({ block: "gridCol" }, options, { children: children });
}

// ---------------------------------------------------------------- component

/*
    Where a layout-declared component gets its defaults.

    A component from the brief is built by setBasicProperties, lands in db.cs,
    and applyModifications gives it its rule file's `default_properties` as
    layer 1. A component a layout declares is born here instead -- structureEDM
    calls internal_layout() long after the three phases have finished -- so
    there is no pass left to resolve it. It arrived carrying only the keys its
    call site wrote.

    The keys it did not write were still being answered, just not here: the
    templates answered them, through `{{ element.font or "Outfit" }}` and the
    `{%-if element.border_radius %}...{% else %}0px{% endif-%}` pairs in
    button-component.njk. That is the same design opinion living in a second
    place, and a place that cannot be overridden by a brief or read by a rule.

    So the defaults come from the component rule files -- the same files, and
    the same `default_properties`, a brief-declared component resolves against.
    This is not a new home for styling opinions; it is the existing one, reached
    by the one kind of component that was missing it.

    See docs/adr/0005-property-resolution-is-layered.md, and step 4 of
    property-resolution-plan.md, which this unblocks.
*/
function defaultsFor(name) {
    const file = `modules/component/${name}.js`;
    if (!fs.existsSync(path.resolve(path.join(user_files, file)))) return {};
    return load(user_files, file).default_properties || {};
}

/*
    Which definition produced this node.

    `template` means the same thing here it means everywhere else -- the file
    that configures the item -- and formatObjects writes it as `category/name.js`
    for everything that comes through the brief. A layout-declared component had
    no such record, which cost twice.

    A human reading email_json.json could not tell which definition to open for a
    node that had no name, no uuid and no template. And tests/golden attributes
    each difference to the nearest ancestor carrying `template`, so a change to
    `component/image.js` was charged to whichever module happened to enclose the
    image -- reported as differences falling outside the definitions that
    changed, when they fell squarely inside one. The manifest already records a
    hash per `component/*.js`; the node was the only part not saying which it
    used.

    Nothing dispatches on it. Every reader of `.template` is in structureEDM or
    applyModifications, and both work from db.ms and db.cs, which these nodes are
    never in.
*/
function templateFor(name) {
    return `component/${name}.js`;
}

/*
    Fill what the call site left unsaid, and nothing it said.

    Written as an append rather than as `Object.assign({}, defaults, options)`
    because of the key-order contract above: the options bag has to land in the
    order it was written, so defaults are added after it, not merged in front of
    it. A key the call site wrote is never touched, whatever its value -- an
    explicit `padding: 0` has to beat a default, and `0` is falsy.
*/
function fill(node, defaults) {
    Object.keys(defaults).forEach((key) => {
        if (node[key] === undefined) node[key] = defaults[key];
    });
    return node;
}

/*
    A component declared by the layout itself. With no `type`, it renders as
    text, so it defaults against `bodycopy` -- the library's plain paragraph.
    `component({ name: "terms", ... })` reaches terms.js instead, and a name
    with no rule file falls back to no defaults rather than throwing, which is
    what applyModifications does with an unknown template.
*/
function component(options) {
    const settings = options || {};
    const name = settings.name || "bodycopy";
    return fill(Object.assign({ entity_type: "component", template: templateFor(name) }, settings), defaultsFor(name));
}

function image(options) {
    return fill(Object.assign({ entity_type: "component", type: "image", template: templateFor("image") }, options || {}), defaultsFor("image"));
}

function button(options) {
    return fill(Object.assign({ entity_type: "component", type: "button", template: templateFor("button") }, options || {}), defaultsFor("button"));
}

/*
    A node that renders nothing, for a branch that drops part of a layout --
    `current.no_nav ? nothing() : row(...)`. main.njk falls through to its
    recursive case for a node with no `block` and no `entity_type`, finds no
    children, and emits nothing. Written out as `{}` at a call site this reads
    like an oversight.
*/
function nothing() {
    return {};
}

// ------------------------------------------------------------------ presets

/*
    The shapes the existing definitions actually repeat, and nothing else.

    ADR 0003 says presets should mirror v2.5's seven templates. Three of those
    seven turned out to have an analogue here; the rest describe how v2.5
    grouped whole modules, which is structureEDM's job in this engine, not a
    module's. Inventing the other four now would be the speculative design the
    ADR warns against -- each is three lines when a definition needs it.

    Every preset takes per-slot option bags, so nothing is given up by using one:
    anything a preset cannot express is written with the constructors above, and
    the two mix at any depth because they emit the same nodes.
*/

/** One column holding every component. The shape of a text block or a hero. */
function single_column(content, options) {
    const settings = options || {};
    return columns(settings.container, [col(settings.column, setComponents("all", content))]);
}

/** Two columns side by side, from the `left` and `right` slots. */
function two_columns(content, options) {
    const settings = options || {};
    return columns(settings.container, [col(settings.left, setComponents("left", content)), col(settings.right, setComponents("right", content))]);
}

/** Two full-width rows, from the `top` and `bottom` slots. */
function stacked_rows(content, options) {
    const settings = options || {};
    return container(settings.container, [stack(settings.top, setComponents("top", content)), stack(settings.bottom, setComponents("bottom", content))]);
}

module.exports = {
    container: container,
    columns: columns,
    row: row,
    stack: stack,
    col: col,
    component: component,
    image: image,
    button: button,
    nothing: nothing,
    single_column: single_column,
    two_columns: two_columns,
    stacked_rows: stacked_rows,
    // Re-exported so a definition needs one import line, whether it reaches for
    // a preset, a constructor, or both.
    setComponents: setComponents
};
