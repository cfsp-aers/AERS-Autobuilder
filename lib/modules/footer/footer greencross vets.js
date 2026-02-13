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
    transition: true,

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
        children: [
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
                                content: `^For Shop Your Way full terms and conditions see our
<a href="https://www.petbarn.com.au/delivery-information" style="color:#FFFFFF;line-height:14px;">Delivery Information page.</a> (https://www.petbarn.com.au/delivery-information)

Make sure emails from Petbarn make it to your inbox.
Add Petbarn@edm.petbarn.com.au to your address book.
Can't see the images? <a class="arc-link" data-nl-type="mirrorPage" data-tracking-type="MIRROR_PAGE" style="text-decoration:underline;color:rgb(255, 255, 255);" href="">View online.</a>

Please refer to our <a href="https://www.petbarn.com.au/w/privacy-policy" style="color:#FFFFFF;line-height:14px;">PRIVACY POLICY</a> if you are not sure why you received this email or if you have a question about privacy. To protect your privacy, we recommend that you do not forward or otherwise distribute this email.

This email was sent to you by Petbarn Pty Ltd.

Petbarn Support Office, Quarter One, Level 2, 1 Epping Road, North Ryde NSW 2113.
P: 1300 655 896 E: Petbarn@edm.petbarn.com

If you wish to unsubscribe, please <a class="arc-link" data-nl-type="unsubscription" style="text-decoration:underline;color:rgb(255, 255, 255);" href="https://t1.edm.petbarn.com.au/lp/unsubscribe" data-tracking-type="OPT_OUT">click here.</a>`
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
