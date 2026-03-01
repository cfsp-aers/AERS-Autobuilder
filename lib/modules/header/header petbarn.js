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

const internal_layout = (current, content) => {
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
                                    aem_id: "urn:aaid:aem:9a83164b-caa6-434e-8013-0fd01a0ea82d",
                                    src: "images/Petbarn_HeaderLogo_wBG.png",
                                    href: "https://www.petbarn.com.au"
                                }
                            }
                        ]
                    }
                ]
            },
            {
                block: "gridRow",
                children: [
                    {
                        block: "gridCol",
                        children: [
                            {
                                block: "gridContainer",
                                innerLayout: "single_row",
                                background: "#000000",
                                padding: "4px 0px",
                                children: [
                                    {
                                        block: "gridCol",
                                        padding: "4px 0px",
                                        children: [
                                            {
                                                entity_type: "component",
                                                category: "component",
                                                type: "button",
                                                name: "button",
                                                brand: "petbarn",
                                                parent_brand: "petbarn",
                                                mode: "underline",
                                                colour: "#FFFFFF",
                                                background: "#000000",
                                                vertical_align: "middle",
                                                padding: "12px 16px 12px 16px",
                                                margin: "0px 0px 0px 0px",
                                                inner_padding: "4px 4px 4px 4px",
                                                font_size: "16px",
                                                line_height: "18px",
                                                font_weight: "normal",
                                                text_align: "center",
                                                font: "Outfit",
                                                border_radius: "0px",
                                                border_bottom: "#FEC326",
                                                height: "auto",
                                                width: "auto",
                                                force_mso_colour: true,
                                                content: {
                                                    text: "Download the App!",
                                                    href: "https://www.petbarn.com.au/petbarn-app"
                                                }
                                            }
                                        ]
                                    },
                                    {
                                        block: "gridCol",
                                        padding: "4px 0px",
                                        children: [
                                            {
                                                entity_type: "component",
                                                category: "component",
                                                type: "button",
                                                name: "button",
                                                brand: "petbarn",
                                                parent_brand: "petbarn",
                                                mode: "underline",
                                                colour: "#FFFFFF",
                                                background: "#000000",
                                                vertical_align: "middle",
                                                padding: "12px 16px 12px 16px",
                                                margin: "0px 0px 0px 0px",
                                                inner_padding: "4px 4px 4px 4px",
                                                font_size: "16px",
                                                line_height: "18px",
                                                font_weight: "normal",
                                                text_align: "center",
                                                font: "Outfit",
                                                border_radius: "0px",
                                                border_bottom: "#F05842",
                                                height: "auto",
                                                width: "auto",
                                                force_mso_colour: true,
                                                content: {
                                                    text: "Shop Special Offers",
                                                    href: "https://www.petbarn.com.au/special-offers"
                                                }
                                            }
                                        ]
                                    },
                                    {
                                        block: "gridCol",
                                        padding: "4px 0px",
                                        children: [
                                            {
                                                entity_type: "component",
                                                category: "component",
                                                type: "button",
                                                name: "button",
                                                brand: "petbarn",
                                                parent_brand: "petbarn",
                                                mode: "underline",
                                                colour: "#FFFFFF",
                                                background: "#000000",
                                                vertical_align: "middle",
                                                padding: "12px 16px 12px 16px",
                                                margin: "0px 0px 0px 0px",
                                                inner_padding: "4px 4px 4px 4px",
                                                font_size: "16px",
                                                line_height: "18px",
                                                font_weight: "normal",
                                                text_align: "center",
                                                font: "Outfit",
                                                border_radius: "0px",
                                                border_bottom: "#00A651",
                                                height: "auto",
                                                width: "auto",
                                                force_mso_colour: true,
                                                content: {
                                                    text: "Find your local Vet",
                                                    href: "https://www.greencrossvets.com.au/find-a-vet/"
                                                }
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
