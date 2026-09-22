const { load } = require("../../../src/main/utils/load.js");
const { app_dir } = require("../../../src/main/constants.js");
const { single_column } = load(app_dir, "main/systems/layout.js");

`~~~~~~~~~~~ COUNTDOWN TIMER ~~~~~~~~~~~`;

/*
    The ticking clock on a last-chance send.

    There is no clock here. The timer is an animated GIF rendered on demand by
    an external service (motionmailapp), and the brief gives its URL in the
    image column. formatRichText passes any src beginning with `http` straight
    through without looking for it in the campaign's images folder, so a remote
    timer needs no special handling -- which is why this module is only a
    narrower image banner.

    That also means the artwork is not in the designer's hands: if the service
    is down or the URL expires, the email renders a broken image and nothing
    here can tell. Worth knowing before one goes out.

    v2.5's rule, for the record:
        _depth 1, order ["image"], image_max_width 80%, image_borderRadius 24px,
        modulePaddingTop 32px, modulePaddingSide 0px, modulePaddingBottom 32px,
        palette "Light Grey", background_colour "Light Grey"
*/

const default_properties = {
    // ~~ module data ~~
    depth: 1,
    max_siblings: 1,

    // ~~ palette ~~
    palette: "light grey",

    // ~~ spacing ~~
    // No side padding: the 80% max-width below is what insets the timer, so it
    // stays centred and keeps its proportions rather than being squeezed.
    vertical_align: "top",
    block_padding: "32px 0px 32px",
    padding: "0px",

    // ~~ components ~~
    image: { max_width: "80%", border_radius: "24px" }
};

/*
    The timer and nothing else. Terms are kept for the end-date line that
    normally sits under a countdown.
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
