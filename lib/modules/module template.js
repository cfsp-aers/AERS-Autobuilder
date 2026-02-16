const _ = require("lodash");
const { load } = require("../../src/main/utils/load.js");
const { app_dir, user_files } = require("../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const { setComponents } = load(app_dir, "main/systems/setComponents.js");
//
//

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

const component_positions = {
    all: ["image", "badge", "heading", "subheading", "bodycopy", "button", "terms"],
    top: [],
    left: [],
    middle: [],
    right: [],
    bottom: []
};

const internal_layout = (current, content, empty) => {
    return {
        block: "gridContainer",
        children: [
            {
                block: "gridRow",
                children: [
                    {
                        block: "gridCol",
                        children: setComponents("all", content)
                    }
                ]
            }
        ]
    };
};

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
