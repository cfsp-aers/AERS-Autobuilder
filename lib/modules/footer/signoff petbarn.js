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

const internal_layout = (current, content) => {
    return {
        block: "gridContainer",
        transition: current.transition,
        inner_block: "single_row",
        children: [
            {
                block: "gridCol",
                padding: "0px 32px 24px",
                children: [
                    {
                        entity_type: "component",
                        type: "image",
                        padding: "16px 0px",
                        border_radius: "0px",
                        width: "180px",
                        content: { src: "images/PLP_Logo_Dog.png" }
                    },
                    {
                        entity_type: "component",
                        colour: "black",
                        font_size: "16px",
                        line_height: "18px",
                        padding: "16px",
                        content: '<span style="font-weight:bold;color:#000000;font-size:16px;line-height:18px;">We can\'t wait to see you and your pet soon</span>\nThe team at Petbarn!'
                    },
                    {
                        block: "gridContainer",
                        innerLayout: "single_row",
                        children: [
                            { block: "gridCol" },
                            {
                                block: "gridCol",
                                children: [
                                    {
                                        block: "gridContainer",
                                        innerLayout: "single_row",
                                        children: [
                                            {
                                                block: "gridCol",
                                                padding: "8px",
                                                mobile_stack: false,
                                                children: [{ entity_type: "component", type: "image", width: "32px", content: { src: "images/pb-fb.png", href: "https://www.facebook.com/petbarn" } }]
                                            },
                                            {
                                                block: "gridCol",
                                                padding: "8px",
                                                mobile_stack: false,
                                                children: [{ entity_type: "component", type: "image", width: "32px", content: { src: "images/pb-in.png", href: "https://www.instagram.com/petbarn/#" } }]
                                            },
                                            {
                                                block: "gridCol",
                                                padding: "8px",
                                                mobile_stack: false,
                                                children: [{ entity_type: "component", type: "image", width: "32px", content: { src: "images/pb-yt.png", href: "https://www.youtube.com/channel/UCMmNH-oEDpTqkcEbegRRvUQ" } }]
                                            },
                                            {
                                                block: "gridCol",
                                                padding: "8px",
                                                mobile_stack: false,
                                                children: [{ entity_type: "component", type: "image", width: "32px", content: { src: "images/pb-tt.png", href: "https://www.tiktok.com/@petbarnau" } }]
                                            }
                                        ]
                                    }
                                ]
                            },
                            { block: "gridCol" }
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
    if (current.transactionl) update(current, { lock: { remove: true } });

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
