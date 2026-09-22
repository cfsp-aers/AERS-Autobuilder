const { load } = require("../../../src/main/utils/load.js");
const { app_dir } = require("../../../src/main/constants.js");
const { single_column } = load(app_dir, "main/systems/layout.js");

`~~~~~~~~~~~ HERO TRADE ~~~~~~~~~~~`;

/*
    The trade catalogue hero: a full-bleed artwork, edge to edge and square
    cornered, on the brand's primary colour.

    Same shape as `hero standard` -- one column of everything -- and differs
    only in its defaults: no module padding, no radius on the image, and the
    primary palette rather than a per-brief one. That is the whole of it, and it
    is why this is a definition of its own rather than a mode of hero standard:
    a designer types "hero trade" in the brief and gets the trade treatment
    without spelling out four settings.

    Two things v2.5's `hero trade` rule carried are deliberately not here:

    `image_margin: "-1px 0px"`, which pulled stacked artwork together over a
    sub-pixel seam. Nothing renders margin on an image in this engine --
    image-component.njk has no margin at all -- so carrying it across would be
    a setting that reads as doing something and does nothing.

    Heading and subheading sizes (h3 / 64px / h4). They were copied verbatim
    from `hero trade large`, and applied to components v2.5's own `order` for
    this type excluded. Sizes come from the heading component and its modes; if
    a trade hero needs a different one, that is a rule to write when a brief
    asks for it.
*/

const default_properties = {
    // ~~ module data ~~
    depth: 1,
    max_siblings: 1,

    // ~~ palette ~~
    // Yellow for Petbarn, which is the brand that runs trade. Left as `primary`
    // rather than pinned to yellow so the module is not wrong for anyone else.
    palette: "primary",

    // ~~ spacing ~~
    // Nothing anywhere: the artwork runs to the edges of the email.
    vertical_align: "top",
    block_padding: "0px",
    padding: "0px",
    container_padding: "0px",

    // ~~ components ~~
    "[heading, subheading, bodycopy]": {
        padding: "0px 32px 8px"
    },
    terms: {
        padding: "16px 32px 8px"
    },
    lockup: {
        padding: "0px 16px 12px"
    },
    button: {
        padding: "12px 16px 12px"
    },
    image: {
        border_radius: "0px"
    }
};

const component_positions = {
    all: ["image", "lockup", "badge", "heading", "subheading", "bodycopy", "button", "terms"]
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
