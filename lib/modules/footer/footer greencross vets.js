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
    palette: "dark",

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
        transition: current.transition,
        children: [
            {
                block: "gridRow",
                children: [
                    {
                        block: "gridCol",
                        padding: "8px 0px 16px",
                        children: [
                            {
                                block: "gridContainer",
                                innerLayout: "single_row",
                                children: [
                                    {
                                        block: "gridCol",
                                        children: [
                                            {
                                                entity_type: "component",
                                                type: "image",
                                                width: "160px",
                                                border_radius: "0px",
                                                content: {
                                                    aem_id: "urn:aaid:aem:e50ef17f-8070-44a3-b8fe-ad48cd8e2779",
                                                    src: "images/logo_GreencrossVets_HalfColour.png",
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
                        padding: "0px 32px",
                        children: [
                            {
                                block: "gridContainer",
                                innerLayout: "single_row",
                                children: [
                                    {
                                        block: "gridCol",
                                        children: [
                                            {
                                                entity_type: "component",
                                                type: "button",
                                                brand: "greencross vets",
                                                background: "#001939",
                                                font_size: "12px",
                                                line_height: "14px",
                                                content: {
                                                    text: "BOOK NOW",
                                                    href: "https://www.greencrossvets.com.au/book-online/"
                                                }
                                            }
                                        ]
                                    },
                                    {
                                        block: "gridCol",
                                        children: [
                                            {
                                                entity_type: "component",
                                                type: "button",
                                                brand: "greencross vets",
                                                background: "#001939",
                                                font_size: "12px",
                                                line_height: "14px",
                                                content: {
                                                    text: "SERVICES",
                                                    href: "https://www.greencrossvets.com.au/services/"
                                                }
                                            }
                                        ]
                                    },
                                    {
                                        block: "gridCol",
                                        children: [
                                            {
                                                entity_type: "component",
                                                type: "button",
                                                brand: "greencross vets",
                                                background: "#001939",
                                                font_size: "12px",
                                                line_height: "14px",
                                                content: {
                                                    text: "CONTACT US",
                                                    href: "https://www.greencrossvets.com.au/contact/"
                                                }
                                            }
                                        ]
                                    },
                                    {
                                        block: "gridCol",
                                        children: [
                                            {
                                                entity_type: "component",
                                                type: "button",
                                                brand: "greencross vets",
                                                background: "#001939",
                                                font_size: "12px",
                                                line_height: "14px",
                                                content: {
                                                    text: "ABOUT US",
                                                    href: "https://www.greencrossvets.com.au/about-greencross-vets/"
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
                        padding: "32px 32px 0px",
                        children: setComponents("all", content)
                    }
                ]
            },
            {
                block: "gridRow",
                children: [
                    {
                        block: "gridCol",
                        padding: "0px 32px 32px",
                        children: [
                            {
                                entity_type: "component",
                                colour: "white",
                                font_size: "12px",
                                line_height: "14px",
                                content: current.transactional
                                    ? `transactional footer`
                                    : `<p><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;">Make sure emails from Greencross Vets make it to your inbox. Add greencrossvets@edm.greencrossvets.com.au to your address book.</span></p> <p><br></p> <p><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;">Can't see the images? <a class="arc-link" data-nl-type="mirrorPage" data-tracking-type="MIRROR_PAGE" style="text-decoration:underline;color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;" href id="acr-link-52530229">View online.</a></span></p><p><br></p><p><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;">Please refer to our <a class="arc-link" data-nl-type="externalLink" style="text-decoration:underline;color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;" href="https://www.greencrossvets.com.au/privacy-policy/" id="acr-link-34318281">PRIVACY POLICY</a> if you are not sure why you received this email or if you have a question about privacy. To protect your privacy, we recommend that you do not forward or otherwise distribute this email.</span></p> <p><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;">This email was sent to you by Greencross Pty Ltd.</span></p> <p><br></p> <p><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;">Greencross Vets Support Office, Quarter One, Level 2, 1 Epping Road, North Ryde NSW 2113.</span></p> <p><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;">P: 1300 836 036 E: info@greencrossvet.com.au</span></p> <p><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;">Click <a class="arc-link" data-nl-type="unsubscription" id="acr-link-15090631" style="text-decoration:underline;color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;" href="https://t1.edm.greencrossvets.com.au/lp/unsubscribe" data-tracking-type="OPT_OUT">HERE</a> to unsubscribe from marketing communications, including vaccination reminders via email. </span></p>`
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
