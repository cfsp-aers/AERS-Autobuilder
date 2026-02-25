const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir, user_files } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const { setComponents } = load(app_dir, "main/systems/setComponents.js");

`~~~~~~~~~~~ HERO STANDARD ~~~~~~~~~~~`;

const default_properties = {
    // ~~ module data ~~
    depth: 1,
    max_siblings: 1,

    // ~~ palette ~~
    palette: "primary",

    // ~~ spacing ~~
    vertical_align: "top",
    block_padding: "0px",
    padding: "16px 0px 0px",
    container_padding: "0px",
    "[heading, subheading, bodycopy, terms]": {
        padding: "0px 32px 8px"
    },
    "components/1": {
        padding: "16px 32px 4px"
    },
    button: {
        padding: "12px 16px 12px"
    }
};

const component_positions = {
    all: ["image", "badge", "heading", "subheading", "bodycopy", "button", "terms"]
};

const internal_layout = (current, content) => {
    return {
        block: "gridContainer",
        innerLayout: "single_row",
        children: [
            {
                block: "gridCol",
                children: setComponents("all", content)
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

    if (childrenOf[current.uuid][0].type == "image") {
        console.log("firstchild is image");
        update(current, {
            padding: "0px"
        });
    }

    if (childrenOf[current.uuid]?.length == 1 && childrenOf[current.uuid][0].type == "image") {
        update(current, {
            hide_transition: true,
            padding: "0px",
            palette: "white",
            image: {
                border_radius: "0px 0px 24px 24px"
            }
        });
    }
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
