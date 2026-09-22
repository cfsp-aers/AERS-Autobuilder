`~~~~~~~~~~~ BADGE ~~~~~~~~~~~`;

const default_properties = {
    // ~~ module data ~~
    // ~~ palette ~~
    //palette: "secondary",
    colour: "primary",
    background: "yellow",
    // ~~ spacing ~~
    vertical_align: "middle",
    inner_padding: "2px 4px",
    padding: "0px",
    // ~~ font ~~
    font_size: "14px",
    line_height: "16px",
    font_weight: "bold",
    text_align: "center",
    font: "Outfit",
    text_size_class: "heading-extra-small",
    // ~~ border ~~
    border_radius: "4px"
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
