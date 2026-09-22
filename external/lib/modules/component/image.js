`~~~~~~~~~~~ IMAGE ~~~~~~~~~~~`;

const default_properties = {
    // ~~ palette ~~
    // ~~ spacing ~~
    vertical_align: "middle",
    padding: "0px",
    // ~~ border ~~
    // ~~ size ~~
    width: "100%"
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
