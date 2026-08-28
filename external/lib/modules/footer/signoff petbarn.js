const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const { columns, col, component, image } = load(app_dir, "main/systems/layout.js");
//
//

`~~~~~~~~~~~ MODULE NAME ~~~~~~~~~~~`;

const default_properties = {
    // ~~ module data ~~
    depth: 1,
    max_siblings: 1,

    // ~~ palette ~~
    palette: "primary",

    // ~~ spacing ~~
    vertical_align: "top",
    padding: "0px",
    container_padding: "0px",
    block_padding: "32px 16px 16px",
    group_padding: "0px",

    // ~~ component settings ~~
    components: {
        padding: "0px 16px 16px"
    }
};

const component_positions = {
    all: ["image", "badge", "heading", "subheading", "bodycopy", "button", "terms"]
};

const social = (src, href, aem_id) => col({ padding: "8px", mobile_stack: false }, [image({ width: "32px", content: { src: src, href: href, aem_id: aem_id } })]);

const internal_layout = (current, content) =>
    columns({ transition: current.transition, transition_id: current.transition_id }, [
        col({ padding: "0px 32px 24px" }, [
            image({
                padding: "16px 0px",
                border_radius: "0px",
                width: "180px",
                content: { src: "images/PLP_Logo_Dog.png", aem_id: "urn:aaid:aem:e01e0b05-4750-4aec-b420-cbdfc3e3b87e" }
            }),
            component({
                colour: "black",
                font_size: "16px",
                line_height: "18px",
                padding: "16px",
                content: '<span style="font-weight:bold;color:#000000;font-size:16px;line-height:18px;">We can\'t wait to see you and your pet soon</span>\nThe team at Petbarn!'
            }),
            columns({}, [
                col({}),
                col({}, [
                    columns({}, [
                        social("images/pb-fb.png", "https://www.facebook.com/petbarn", "urn:aaid:aem:2bb931cf-f45f-424a-9ea0-68b755a721dc"),
                        social("images/pb-in.png", "https://www.instagram.com/petbarn/#", "urn:aaid:aem:1f1fa734-3055-4fca-ab50-a393b9951fea"),
                        social("images/pb-yt.png", "https://www.youtube.com/channel/UCMmNH-oEDpTqkcEbegRRvUQ", "urn:aaid:aem:b7cfe5a0-2e25-48b2-9837-247d078ba7e8"),
                        social("images/pb-tt.png", "https://www.tiktok.com/@petbarnau", "urn:aaid:aem:ddbf85b9-7fe7-4874-abcb-14e6a0855d48")
                    ])
                ]),
                col({})
            ])
        ])
    ]);

function modes() {}

function modify(childrenOf) {
    // ------------- BEGIN RULES ------------- //
    if (current.transactional) update(current, { ignore: true });

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
