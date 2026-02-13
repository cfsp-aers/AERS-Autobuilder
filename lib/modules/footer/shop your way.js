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

    // ~~ palette ~~
    palette: "light",

    // ~~ spacing ~~
    vertical_align: "top",
    padding: "0px",
    container_padding: "0px",
    block_padding: "16px",
    group_padding: "0px",

    // ~~ component settings ~~
    components: {
        padding: "0px 16px 16px"
    }
};

const component_positions = { all: ["image", "badge", "heading", "subheading", "bodycopy", "button", "terms"] };

const internal_layout = (current, content) => {
    return {
        block: "gridContainer",
        ignore: current.transactional === true ? true : current.ignore,
        transition: current.transition,
        inner_block: "single_row",
        children: [
            {
                block: "gridCol",
                padding: "0px 0px 24px",
                children: [
                    { entity_type: "component", colour: "black", font_size: "32px", line_height: "36px", font_weight: "bold", padding: "16px", content: "Nobody fetches like Petbarn!<sup>^</sup>" },
                    {
                        block: "gridContainer",
                        children: [
                            {
                                block: "gridRow",
                                group: "internal",
                                children: [
                                    {
                                        block: "gridCol",
                                        children: [
                                            {
                                                block: "gridContainer",
                                                innerLayout: "single_row",
                                                children: [
                                                    {
                                                        block: "gridCol",
                                                        padding: "4px",
                                                        children: [
                                                            { entity_type: "component", type: "image", width: "180px", content: { src: "images/SYW_2hrdelivery_wShadow_2x.png", href: "https://www.petbarn.com.au/delivery-information" } },
                                                            { entity_type: "component", colour: "black", font_size: "14px", line_height: "16px", content: "Free on orders over $149" }
                                                        ]
                                                    },
                                                    {
                                                        block: "gridCol",
                                                        padding: "4px",
                                                        children: [
                                                            { entity_type: "component", type: "image", width: "180px", content: { src: "images/SYW_nextdaydelivery_wShadow_2x.png", href: "https://www.petbarn.com.au/delivery-information" } },
                                                            { entity_type: "component", colour: "black", font_size: "14px", line_height: "16px", content: "Free on orders $99 & over" }
                                                        ]
                                                    },
                                                    {
                                                        block: "gridCol",
                                                        padding: "4px",
                                                        children: [
                                                            { entity_type: "component", type: "image", width: "180px", content: { src: "images/SYW_freestandarddelivery_wShadow_2x.png", href: "https://www.petbarn.com.au/delivery-information" } },
                                                            { entity_type: "component", colour: "black", font_size: "14px", line_height: "16px", content: "Free on orders over $49" }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                block: "gridRow",
                                group: "internal",
                                children: [
                                    {
                                        block: "gridCol",
                                        children: [
                                            {
                                                block: "gridContainer",
                                                innerLayout: "single_row",
                                                children: [
                                                    {
                                                        block: "gridCol",
                                                        padding: "4px",
                                                        children: [
                                                            { entity_type: "component", type: "image", width: "180px", content: { src: "images/SYW_clickcollect_wShadow_2x.png", href: "https://www.petbarn.com.au/delivery-information" } },
                                                            { entity_type: "component", colour: "black", font_size: "14px", line_height: "16px", content: "Available within 30 mins" }
                                                        ]
                                                    },
                                                    {
                                                        block: "gridCol",
                                                        padding: "4px",
                                                        children: [
                                                            { entity_type: "component", type: "image", width: "180px", content: { src: "images/SYW_over220stores_wShadow_2x.png", href: "https://www.petbarn.com.au/store-finder" } },
                                                            { entity_type: "component", colour: "black", font_size: "14px", line_height: "16px", content: "Visit our friendly team." }
                                                        ]
                                                    },
                                                    {
                                                        block: "gridCol",
                                                        padding: "4px",
                                                        children: [
                                                            { entity_type: "component", type: "image", width: "180px", content: { src: "images/SYW_repeatdelivery_wShadow_2x.png", href: "https://www.petbarn.com.au/w/repeat-delivery" } },
                                                            { entity_type: "component", colour: "black", font_size: "14px", line_height: "16px", content: "Save up to 25%" }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
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
