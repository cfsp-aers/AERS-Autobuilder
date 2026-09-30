const { load } = require("../../../src/main/utils/load.js");
const { app_dir } = require("../../../src/main/constants.js");
const { columns, container, row, col, component, image } = load(app_dir, "main/systems/layout.js");
//
//

`~~~~~~~~~~~ SHOP YOUR WAY PETBARN ~~~~~~~~~~~`;

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

const delivery_tile = (src, href, caption) =>
    col({ padding: "4px" }, [
        image({ width: "180px", content: { src: src, href: href } }),
        component({ colour: "black", font_size: "14px", line_height: "16px", content: caption })
    ]);

const tile_row = (tiles) => row({ group: "internal" }, [col({}, [columns({}, tiles)])]);

const internal_layout = (current, content) =>
    columns({ transition: current.transition, transition_id: current.transition_id }, [
        col({ padding: current.transition ? "0px 0px 24px" : "24px 0px 24px" }, [
            component({
                colour: "black",
                font_size: "32px",
                line_height: "36px",
                font_weight: "bold",
                padding: "16px",
                content: "Nobody fetches like Petbarn!<sup>^</sup>"
            }),
            container({}, [
                tile_row([
                    delivery_tile("images/SYW_2hrdelivery_wShadow_2x.png", "https://www.petbarn.com.au/delivery-information", "Free on orders over $149"),
                    delivery_tile("images/SYW_nextdaydelivery_wShadow_2x.png", "https://www.petbarn.com.au/delivery-information", "Free on orders $99 & over"),
                ]),
                tile_row([
                    delivery_tile("images/SYW_freestandarddelivery_wShadow_2x.png", "https://www.petbarn.com.au/delivery-information", "Free on orders over $49"),
                    delivery_tile("images/SYW_clickcollect_wShadow_2x.png", "https://www.petbarn.com.au/delivery-information", "Available within 30 mins")
                ]),
                tile_row([
                    delivery_tile("images/SYW_over220stores_wShadow_2x.png", "https://www.petbarn.com.au/store-finder", "Visit our friendly team."),
                    delivery_tile("images/SYW_repeatdelivery_wShadow_2x.png", "https://www.petbarn.com.au/w/repeat-delivery", "Save up to 25%")
                ])
            ])
        ])
    ]);

function modes() {}

function modify(childrenOf) {
    // ------------- BEGIN RULES ------------- //
    if (current.transactional) {
        update(current, { ignore: true });
    }

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
