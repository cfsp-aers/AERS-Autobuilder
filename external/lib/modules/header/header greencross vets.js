const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const { container, columns, row, col, component, image, button, nothing } = load(app_dir, "main/systems/layout.js");
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

const book_now = () =>
    component({
        category: "component",
        type: "button",
        name: "button",
        brand: "greencross vets",
        parent_brand: "greencross vets",
        depth: 1,
        max_siblings: 1,
        mode: "default",
        transition: false,
        palette: "navy/white",
        colour: "#FFFFFF",
        background: "#001939",
        vertical_align: "middle",
        padding: "12px 16px 12px 16px",
        margin: "0px 0px 0px 0px",
        inner_padding: "8px 16px 8px 16px",
        font_size: "16px",
        line_height: "18px",
        font_weight: "bold",
        text_align: "center",
        font: "Outfit",
        border_radius: "32px",
        height: "auto",
        width: "auto",
        align: "right",
        content: {
            text: "BOOK NOW",
            href: "https://www.greencrossvets.com.au/book-online/"
        }
    });

const nav_button = (text, href, underline) =>
    button({
        mode: "underline",
        brand: "greencross vets",
        background: "#001939",
        border_bottom: underline,
        border_radius: "0px",
        inner_padding: "0px 4px 4px",
        padding: "4px 0px",
        font_weight: "normal",
        mso_height: "32px",
        force_mso_colour: true,
        content: {
            text: text,
            href: href
        }
    });

const nav = () =>
    row({}, [
        col({}, [
            columns({ background: "#001939", padding: "4px 0px" }, [
                col({ padding: "4px 0px", width: "33.3333%" }, [nav_button("WebVet 24/7", "https://www.greencrossvets.com.au/webvet/", "#FFFFFF")]),
                col({ padding: "4px 0px", width: "33.3333%" }, [nav_button("Emergency Care", "https://www.emergencyvet.com.au/", "#C13C27")]),
                col({ padding: "4px 0px", width: "33.3333%" }, [nav_button("Healthy Pets Plus", "https://www.greencrossvets.com.au/healthy-pets-plus/", "#00A651")])
            ])
        ])
    ]);

const internal_layout = (current, content) =>
    container({ background: current.background }, [
        row({}, [
            col({}, [
                columns({}, [
                    col({ width: "50%", mobile_stack: false, padding: "0px 16px" }, [
                        image({
                            width: "180px",
                            border_radius: "0px",
                            align: "left",
                            content: {
                                aem_id: "urn:aaid:aem:e50ef17f-8070-44a3-b8fe-ad48cd8e2779",
                                src: "images/GreencrossVets_HeaderLogo.png",
                                href: "https://www.greencrossvets.com.au"
                            }
                        })
                    ]),
                    col({ width: "50%", mobile_stack: false, padding: "0px 16px" }, [book_now()])
                ])
            ])
        ]),
        current.no_nav ? nothing() : nav()
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
