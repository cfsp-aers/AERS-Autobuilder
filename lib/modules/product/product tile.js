const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir, user_files } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const { setComponents } = load(app_dir, "main/systems/setComponents.js");

`~~~~~~~~~~~ PRODUCT TILE ~~~~~~~~~~~`;

const default_properties = {
    // ~~ module data ~~
    depth: 2,
    max_siblings: 2,

    // ~~ palette ~~
    palette: "promo",
    background: "light grey",

    // ~~ spacing ~~
    vertical_align: "top",
    block_padding: "0px 24px",
    padding: "8px",
    container_padding: "0px",

    // ~~ border ~~
    border_radius: "24px",

    // ~~ component settings ~~
    "heading/1": {
        colour: "secondary"
    },
    heading: { mode: "h6" },
    subheading: { mode: "h7" },
    components: {
        text_align: "left"
    }
};

const component_positions = {
    top: ["image"],
    bottom: ["badge", "heading", "subheading", "bodycopy", "button", "terms"]
};

const internal_layout = (current, content) => {
    return {
        block: "gridContainer",
        children: [
            {
                block: "gridRow",
                innerLayout: "single_column",
                children: setComponents("top", content)
            },
            {
                block: "gridRow",
                innerLayout: "single_column",
                padding: "16px 16px 24px",
                children: setComponents("bottom", content)
            }
        ]
    };
};

function modes() {}

function modify(childrenOf) {
    // ------------- BEGIN RULES ------------- //

    if (current.row_index == 1 && current.name != next.name) {
        update(current, {
            name: "product banner"
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
