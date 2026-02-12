const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir, user_files } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const { setComponents } = load(app_dir, "main/systems/setComponents.js");
//
//

`~~~~~~~~~~~ MODULE NAME ~~~~~~~~~~~`;

const default_properties = {
    // ~~ module data ~~
    depth: 1,
    max_siblings: 1,
    hide_transition: true,

    // ~~ palette ~~
    palette: "yellow",

    // ~~ spacing ~~
    vertical_align: "top",
    padding: "0px",
    container_padding: "0px",
    block_padding: "0px",
    group_padding: "0px",

    // ~~ component settings ~~
    components: {
        padding: "0px 16px 16px"
    }
};

const component_positions = {
    all: ["image", "badge", "heading", "subheading", "bodycopy", "button", "terms"]
};

const internal_layout = (content) => {
    return {
        block: "gridContainer",
        children: [
            {
                block: "gridRow",
                children: [
                    {
                        block: "gridCol",
                        padding: "16px",
                        children: [
                            {
                                entity_type: "component",
                                type: "image",
                                width: "180px",
                                border_radius: "0px",
                                content: {
                                    src: "images/Petbarn_HeaderLogo_wBG.png",
                                    href: "https://www.petbarn.com.au"
                                }
                            }
                        ]
                    }
                ]
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
    // ------------- BEGIN RULES -------------
    // ------------- END RULES -------------
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
