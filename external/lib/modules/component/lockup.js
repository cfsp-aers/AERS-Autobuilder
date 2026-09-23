`~~~~~~~~~~~ LOCKUP ~~~~~~~~~~~`;

/*
    A lockup has `type: "image"`, so main.njk renders it through
    image-component.njk and it needs the keys that template asks an image for.
    It is the reason `align`, `background` and `max_width` there still fired
    after image.js declared all three: the file a lockup resolves against is
    this one, not image.js. Same three values.
*/
const default_properties = {
    // ~~ palette ~~
    background: "transparent",
    // ~~ spacing ~~
    vertical_align: "middle",
    padding: "0px",
    align: "center",
    // ~~ border ~~
    border_radius: "0px",
    // ~~ size ~~
    width: "180px",
    max_width: "100%"
    // ~~ other ~~
};

function modes() {}

function modify(parent) {
    // ------------- BEGIN RULES ------------- //
    // -------------- END RULES -------------- //
}

function style(parent) {
    // ------------- BEGIN RULES ------------- //
    // -------------- END RULES -------------- //
}

let current, prev, next;
let update;

function setupRules(the, apply) {
    [current, prev, next] = [the.current_item, the.previous_item, the.next_item];
    [update] = [apply.update];
}

module.exports = {
    modify: modify,
    style: style,
    default_properties: default_properties,
    modes: modes,
    setupRules: setupRules
};
