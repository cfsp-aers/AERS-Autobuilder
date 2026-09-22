//
//

`~~~~~~~~~~~ DEFAULT ~~~~~~~~~~~`;

const default_properties = {};

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
