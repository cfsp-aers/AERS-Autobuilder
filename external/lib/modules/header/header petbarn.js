const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const { container, columns, row, col, component, image } = load(app_dir, "main/systems/layout.js");
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

/*
    The nav buttons carry a full style declaration each because nothing styles a
    component a layout declares itself -- structureEDM calls internal_layout
    after the styling passes have run. They differ only in their label, their
    link and the colour of their underline.
*/
const nav_button = (text, href, underline) =>
    component({
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
        border_bottom: underline,
        height: "auto",
        mso_height: "32px",
        width: "auto",
        force_mso_colour: true,
        content: { text: text, href: href }
    });

const internal_layout = (current, content) =>
    container({}, [
        row({}, [
            col({ padding: "16px" }, [
                image({
                    width: "180px",
                    border_radius: "0px",
                    content: {
                        aem_id: "urn:aaid:aem:9a83164b-caa6-434e-8013-0fd01a0ea82d",
                        src: "images/Petbarn_HeaderLogo_wBG.png",
                        href: "https://www.petbarn.com.au"
                    }
                })
            ])
        ]),
        row({}, [
            col({}, [
                columns({ background: "#000000", padding: "4px 0px" }, [
                    col({ padding: "4px 0px" }, [nav_button("Download the App!", "https://www.petbarn.com.au/petbarn-app", "#FEC326")]),
                    col({ padding: "4px 0px" }, [nav_button("Shop Special Offers", "https://www.petbarn.com.au/special-offers", "#F05842")]),
                    col({ padding: "4px 0px" }, [nav_button("Find your local Vet", "https://www.greencrossvets.com.au/find-a-vet/", "#00A651")])
                ])
            ])
        ])
    ]);

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
