const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir, user_files } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const { setComponents } = load(app_dir, "main/systems/setComponents.js");

`
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            MODULE NAME HERE
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
`;

const default_properties = {
    depth: 1,
    max_siblings: 1,

    palette: "light",

    padding: "0px 32px",
    group_padding: "0px",
    block_padding: "0px",
    container_padding: "16px",

    "button/1": {
        background: "yellow"
    }
};

const component_positions = {
    all: ["image", "badge", "heading", "subheading", "bodycopy", "button", "terms"]
};

const internal_layout = (components) => {
    return {
        block: "gridContainer",
        innerLayout: "single_row",
        background_colour: "background_colour",
        children: [
            {
                block: "gridCol",
                padding: "block_padding",
                children: setComponents("all", components)
            }
        ]
    };
};

function modes() {}

function modify() {
    // ------------- BEGIN RULES ------------- //
    // -------------- END RULES -------------- //
}

function style() {
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
