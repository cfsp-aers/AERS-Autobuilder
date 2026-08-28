const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const { container, columns, row, col, component, image, button, nothing, setComponents } = load(app_dir, "main/systems/layout.js");
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

const footer_button = (text, href) =>
    col({}, [
        button({
            brand: "greencross vets",
            background: "#001939",
            font_size: "12px",
            line_height: "14px",
            content: { text: text, href: href }
        })
    ]);

const social = (src, href, aem_id) => col({ padding: "8px", mobile_stack: false }, [image({ width: "32px", content: { src: src, href: href, aem_id: aem_id } })]);

const legal = (options) => component(Object.assign({ colour: "white", font_size: "12px", line_height: "14px" }, options));

const internal_layout = (current, content) =>
    container({ transition: current.transition, transition_id: current.transition_id }, current.transactional ? transactional(current, content) : marketing(current, content));

const transactional = (current, content) => [row({}, [col({ padding: "16px 32px 32px" }, [legal({ content: `transactional footer` })])])];

const marketing = (current, content) => [
    row({}, [
        col({ padding: "8px 0px 16px" }, [
            columns({}, [
                col({}, [
                    image({
                        width: "180px",
                        border_radius: "0px",
                        content: {
                            aem_id: "urn:aaid:aem:b3c3b85a-967c-4906-a798-aae821debaac",
                            src: "images/logo_GreencrossVets_HalfColour.png",
                            href: "https://www.greencrossvets.com.au"
                        }
                    })
                ])
            ])
        ])
    ]),
    row({}, [
        col({ padding: "0px 32px 32px" }, [
            columns({}, [
                footer_button("BOOK NOW", "https://www.greencrossvets.com.au/book-online"),
                footer_button("SERVICES", "https://www.greencrossvets.com.au/services"),
                footer_button("CONTACT US", "https://www.greencrossvets.com.au/contact"),
                footer_button("ABOUT US", "https://www.greencrossvets.com.au/about-greencross-vets")
            ])
        ])
    ]),
    row({}, [col({ padding: "0px 32px 0px" }, setComponents("all", content))]),
    row({}, [
        col({ padding: "0px 32px 32px" }, [
            current.hpp ? legal({ padding: "0px 0px 16px", content: `*Healthy Pets Plus Benefits must not be abused, including in ways that are not for the benefit of the pet covered by the membership. Benefits offered subject to availability. Savings based on prices for non-Healthy Pets Plus members and cannot be used in conjunction with any other offer or discount unless stated otherwise. See <a href="https://www.greencrossvets.com.au/healthy-pets-plus/terms-and-conditions-v2/" style="font-weight:normal;color:#FFFFFF;font-size:12px;line-height:14px;">HERE.</a> for Healthy Pets Plus T&Cs. ` }) : nothing(),
            legal({ content: `<p><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;">Make sure emails from Greencross Vets make it to your inbox. Add greencrossvets@edm.greencrossvets.com.au to your address book.</span></p> <p><br></p> <p><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;">Can't see the images? <a class="arc-link" data-nl-type="mirrorPage" data-tracking-type="MIRROR_PAGE" style="text-decoration:underline;color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;" href id="acr-link-52530229">View online.</a></span></p><p><br></p><p><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;">Please refer to our <a class="arc-link" data-nl-type="externalLink" style="text-decoration:underline;color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;" href="https://www.greencrossvets.com.au/privacy-policy/" id="acr-link-34318281">PRIVACY POLICY</a> if you are not sure why you received this email or if you have a question about privacy. To protect your privacy, we recommend that you do not forward or otherwise distribute this email.</span></p> <p><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;"><br/>This email was sent to you by Greencross Pty Ltd.</span><br/><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;">Greencross Vets Support Office, Quarter One, Level 2, 1 Epping Road, North Ryde NSW 2113.</span></p> <p><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;">P: 1300 836 036 E: info@greencrossvet.com.au</span></p><br/><p><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;">Click <a class="arc-link" data-nl-type="unsubscription" id="acr-link-15090631" style="text-decoration:underline;color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;" href="https://t1.edm.greencrossvets.com.au/lp/unsubscribe" data-tracking-type="OPT_OUT">HERE</a> to unsubscribe from marketing communications, including vaccination reminders via email. </span></p>` })
        ])
    ]),
    row({}, [
        col({ padding: "0px 32px 32px" }, [
            columns({}, [
                col({}),
                col({}, [
                    columns({}, [
                        social("images/gxv-fb.png", "https://www.facebook.com/GreencrossVets/", "urn:aaid:aem:042f6065-6098-4967-89ee-670c3b8bd540"),
                        social("images/gxv-in.png", "https://www.instagram.com/greencrossvets/", "urn:aaid:aem:fd8c01bf-5189-4bac-938f-519889eec1fd"),
                        social("images/gxv-yt.png", "https://www.youtube.com/user/Greenxvets", "urn:aaid:aem:c9f3614c-7e5b-4969-b219-32797bf75ac0")
                    ])
                ]),
                col({})
            ])
        ])
    ])
];

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
