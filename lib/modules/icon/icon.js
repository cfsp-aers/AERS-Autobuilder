const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir, user_files } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const { setComponents } = load(app_dir, "main/systems/setComponents.js");

`~~~~~~~~~~~ PRODUCT TILE ~~~~~~~~~~~`;

const default_properties = {
    // ~~ module data ~~
    //depth: 2,
    //max_siblings: 3,

    // ~~ palette ~~
    palette: "light",
    background: "light grey",

    // ~~ spacing ~~
    vertical_align: "top",
    block_padding: "0px 24px",
    padding: "8px",
    container_padding: "24px 16px",

    // ~~ border ~~
    border_radius: "24px",

    // ~~ component settings ~~
    icon: { border_radius: "64px", width: "64px" },
    image: { border_radius: "12px" },
    heading: { mode: "h7" },
    subheading: { mode: "h8" }
};

const component_positions = {
    top: ["icon", "lockup"],
    bottom: ["image", "badge", "heading", "subheading", "bodycopy", "button", "terms"]
};

const internal_layout = (content) => {
    return {
        block: "gridContainer",
        children: [
            {
                block: "gridRow",
                innerLayout: "single_column",
                padding: "0px 0px 16px",
                children: setComponents("top", content)
            },
            {
                block: "gridRow",
                innerLayout: "single_column",
                padding: "0px",
                children: setComponents("bottom", content)
            }
        ]
    };
};

function modes() {}

function modify(childrenOf) {
    // ------------- BEGIN RULES ------------- //

    if (current.row_index == 1 && current.group_size == 1) {
        update(current, {
            name: "icon block"
        });
    }
    if (current.name == prev.name && !current.user_settings.depth) {
        update(current, {
            lock: { depth: prev.depth }
        });
    }

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
