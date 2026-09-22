const { load } = require("../../../src/main/utils/load.js");
const { app_dir } = require("../../../src/main/constants.js");
const { single_column } = load(app_dir, "main/systems/layout.js");

`~~~~~~~~~~~ TRADE IMAGE BANNER ~~~~~~~~~~~`;

/*
    A single piece of artwork, inset from the edges with rounded corners, on
    light grey.

    The combination plan read this as `text block` carrying one image and left
    it out of the module library on that basis. That was right about the shape
    and wrong about the consequence: trade briefs name it as a type of its own,
    so a brief that uses it stopped at "not a module this builder knows". It is
    cheaper to define than to explain, and it does differ from `text block` --
    light grey rather than white, and no text slots at all.

    v2.5's rule, for the record:
        _depth 1, order ["image"], modulePaddingTop 32px, modulePaddingSide 32px,
        image_borderRadius 24px, palette "Light Grey"
*/

const default_properties = {
    // ~~ module data ~~
    depth: 1,
    max_siblings: 1,

    // ~~ palette ~~
    palette: "light grey",

    // ~~ spacing ~~
    // v2.5 set top and side padding and left the bottom at its 0px default, so
    // consecutive banners sit flush and the next module provides the gap.
    vertical_align: "top",
    block_padding: "32px 0px 0px",
    padding: "0px 32px",

    // ~~ components ~~
    image: { border_radius: "24px" }
};

/*
    The artwork and nothing else, which is what `order: ["image"]` said. Terms
    are kept because a trade banner routinely carries a date or a legal line and
    there is nowhere else on the module to put one.
*/
const component_positions = {
    all: ["image", "terms"]
};

const internal_layout = (current, content) => single_column(content);

function modes() {}

function modify(childrenOf) {
    // ------------- BEGIN RULES ------------- //
    // -------------- END RULES -------------- //
}

function style(childrenOf) {
    // ------------- BEGIN RULES ------------- //
    // -------------- END RULES -------------- //
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
