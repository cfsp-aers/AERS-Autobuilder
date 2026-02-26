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
    palette: "primary",

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
        background: current.background,
        children: [
            {
                block: "gridRow",
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
                                        width: "50%",
                                        mobile_stack: false,
                                        padding: "0px 16px",
                                        children: [
                                            {
                                                entity_type: "component",
                                                type: "image",
                                                width: "180px",
                                                border_radius: "0px",
                                                align: "left",
                                                content: {
                                                    aem_id: "urn:aaid:aem:e50ef17f-8070-44a3-b8fe-ad48cd8e2779",
                                                    src: "images/GreencrossVets_HeaderLogo.png",
                                                    href: "https://www.greencrossvets.com.au/book-online/"
                                                }
                                            }
                                        ]
                                    },
                                    {
                                        block: "gridCol",
                                        width: "50%",
                                        mobile_stack: false,
                                        padding: "0px 16px",
                                        children: [
                                            {
                                                entity_type: "component",
                                                type: "button",
                                                brand: "greencross vets",
                                                background: "#001939",
                                                margin: "8px 0px",
                                                align: "right",
                                                content: {
                                                    text: "BOOK NOW",
                                                    href: "https://www.greencrossvets.com.au/book-online/"
                                                }
                                            }
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
                children: [
                    {
                        block: "gridCol",
                        children: [
                            {
                                block: "gridContainer",
                                innerLayout: "single_row",
                                background: "#001939",
                                padding: "4px 0px",
                                children: [
                                    {
                                        block: "gridCol",
                                        padding: "4px 0px",
                                        children: [
                                            {
                                                entity_type: "component",
                                                type: "button",
                                                mode: "underline",
                                                brand: "petbarn",
                                                background: "#001939",
                                                border_bottom: "#FFFFFF",
                                                border_radius: "0px",
                                                inner_padding: "0px 4px 4px",
                                                padding: "4px 0px",
                                                font_weight: "normal",
                                                mso_height: "32px",
                                                no_bg: true,
                                                content: {
                                                    text: "Book now!",
                                                    href: "https://www.greencrossvets.com.au/book-online/"
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
                                                type: "button",
                                                mode: "underline",
                                                brand: "petbarn",
                                                background: "#001939",
                                                border_bottom: "#C13C27",
                                                border_radius: "0px",
                                                inner_padding: "0px 4px 4px",
                                                padding: "4px 0px",
                                                font_weight: "normal",
                                                mso_height: "32px",
                                                no_bg: true,
                                                content: {
                                                    text: "Emergency Care",
                                                    href: "https://www.greencrossvets.com.au/emergency-care/"
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
                                                type: "button",
                                                mode: "underline",
                                                background: "#001939",
                                                border_bottom: "#00A651",
                                                border_radius: "0px",
                                                inner_padding: "0px 4px 4px",
                                                padding: "4px 0px",
                                                font_weight: "normal",
                                                mso_height: "32px",
                                                no_bg: true,
                                                content: {
                                                    text: "Healthy Pets Plus",
                                                    href: "https://www.greencrossvets.com.au/healthy-pets-plus/"
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

/*


const internal_layout = (current, content) => {
    return {
        block: "gridContainer",
        background: current.background,
        children: [
            {
                block: "gridRow",
                children: [
                    {
                        block: "gridCol",
                        width: "33.3333%",
                        children: [
                            {
                                entity_type: "component",
                                type: "image",
                                width: "180px",
                                border_radius: "0px",
                                content: {
                                    aem_id: "urn:aaid:aem:e50ef17f-8070-44a3-b8fe-ad48cd8e2779",
                                    src: "images/GreencrossVets_HeaderLogo.png",
                                    href: "https://www.greencrossvets.com.au/book-online/"
                                }
                            }
                        ]
                    },
                    { block: "gridCol", width: "33.3333%", children: [{ entity_type: "component", placeholder_component: true }] },
                    {
                        block: "gridCol",
                        width: "33.3333%",
                        children: [
                            {
                                entity_type: "component",
                                type: "button",
                                brand: "greencross vets",
                                background: "#001939",
                                margin: "8px 0px",
                                content: {
                                    text: "BOOK NOW",
                                    href: "https://www.greencrossvets.com.au/book-online/"
                                }
                            }
                        ]
                    }
                ]
            }
        ]
    };
};

*/

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
