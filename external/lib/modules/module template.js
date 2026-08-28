/*
    Copy this into modules/<group>/ and rename it. The relative paths below are
    written for that destination, one folder deeper than this file sits, so the
    copy resolves and this template itself does not. Nothing loads it.

    lodash and `aers` are here for the rules blocks further down, which is where
    a module does anything conditional. Delete them if you write no rules.
*/

const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const { single_column } = load(app_dir, "main/systems/layout.js");

`~~~~~~~~~~~ MODULE NAME ~~~~~~~~~~~`;

const default_properties = {
    // ~~ module data ~~
    depth: 1,
    max_siblings: 1,

    // ~~ palette ~~
    palette: "light",
    colour: "", // applies to text
    background: "", // applies to depth 2 modules

    // ~~ spacing ~~
    vertical_align: "", // multi-column modules & components
    padding: "", // modules & components
    container_padding: "", // modules
    block_padding: "", // modules
    margin: "", // modules & components
    inner_padding: "", // buttons

    // ~~ font ~~
    font_size: "", // text & buttons
    line_height: "", // text & buttons
    font_weight: "", // text
    text_align: "", // text, buttons & images
    font: "", // text
    text_size_class: "", // text

    // ~~ border ~~
    border_radius: "", // text, buttons & images
    border_top: "", // buttons
    border_right: "", // buttons
    border_bottom: "", // buttons
    border_left: "", // buttons

    // ~~ size ~~
    height: "", // buttons & images
    width: "" // buttons & images
};

/*
    Which components go in which slot. A layout asks for a slot by name, and
    slots that come out empty are dropped before the layout ever sees them.
*/
const component_positions = {
    all: ["image", "badge", "heading", "subheading", "bodycopy", "button", "terms"],
    top: [],
    left: [],
    middle: [],
    right: [],
    bottom: []
};

/*
    The three presets in main/systems/layout.js cover the shapes the existing
    modules repeat:

        single_column(content, { container, column })
        two_columns(content, { container, left, right })
        stacked_rows(content, { container, top, bottom })

    Every option is a bag of node properties -- padding, width, background,
    mobile_stack -- applied to that one node.

    For anything else, import the constructors instead and build the tree:
    container, columns, row, stack, col, plus component, image and button for
    components the layout declares itself. See `header petbarn.js` for a
    hand-built layout and `footer greencross vets.js` for one that branches on
    module state.
*/
const internal_layout = (current, content) => single_column(content);

function modes() {}

function modify(childrenOf) {
    // ------------- BEGIN RULES ------------- //
    // -------------- END RULES -------------- //
}

function style(childrenOf) {
    // ------------- BEGIN RULES ------------- //
    // -------------- END RULES -------------- //
}

//
// IGNORE BELOW
// --------------------------------------------------------------------------------

let current, prev, next, module_at, child_at, childOf;
let update;

function setupRules(the, apply) {
    [current, prev, next, module_at, child_at, childOf] = [the.current_item, the.previous_item, the.next_item, the.module_at, the.child_at, the.childOf];
    [update] = [apply.update];

    update(current, default_properties);
    update(current, current.user_settings);
}

module.exports = {
    modify: modify,
    style: style,
    default_properties: default_properties,
    internal_layout: internal_layout,
    component_positions: component_positions,
    modes: modes,
    setupRules: setupRules
};
