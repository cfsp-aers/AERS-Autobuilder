const { load } = require("../../../src/main/utils/load.js");
const { app_dir } = require("../../../src/main/constants.js");
const { single_column } = load(app_dir, "main/systems/layout.js");

`~~~~~~~~~~~ SPECIALS BANNER ~~~~~~~~~~~`;

/*
    Petbarn's weekly specials artwork: one image in a rounded red container,
    with its terms underneath inside the same container.

    v2.5 shipped this as a hand-written fragment, `specials banner_Petbarn.njk`,
    with the container colour, the terms styling and the link to
    petbarn.com.au/special-offers all written into the markup. None of that has
    to be. The image and its link come from the brief like any other image, the
    red comes from the palette, and the terms are the terms component's own
    defaults -- 12px/14px, centred, palette body colour -- which is why nothing
    below styles them.
*/

const default_properties = {
    // ~~ module data ~~
    depth: 2,
    max_siblings: 1,

    /*
        ~~ palette ~~

        At depth 2 the container's colour is the palette's *background* -- see
        setPalette() in main/properties/palette.js -- so a red container needs a
        red palette rather than `colour: "red"`, which setPalette overwrites.
        `background` is the strip behind the container.

        `red` is petbarn's #F05842, and was added to the petbarn palette library
        for this module. It carries white text throughout, which is what makes
        the terms legible without a rule here.
    */
    palette: "red",
    background: "light grey",

    // ~~ spacing ~~
    vertical_align: "top",
    block_padding: "32px 0px 0px",
    padding: "0px 32px",
    container_padding: "0px 0px 16px"
};

/*
    An image and its terms, and nothing else.

    The rest of the component set is left out on purpose: a specials banner is a
    piece of artwork, and a heading typed into one has nowhere to go. v2.5 said
    the same thing with `order: ["image", "t_and_c"]`, and its fragment could
    not have rendered anything else if it wanted to.
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
