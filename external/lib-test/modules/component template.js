/*
    Copy this into modules/component/ and rename it. Nothing loads this file
    itself; the engine picks a component's rules by name, so only the copy runs.

    A component has no internal_layout and no component_positions: the module
    holding it decides where it goes, through its own component_positions and
    layout. What a component owns is its default_properties, its modes, and its
    two rule blocks.

    No imports are needed for a component that only sets defaults. Add lodash,
    or anything under src/main/properties/, when a rule block wants it -- see
    heading.js, which loads `leading` from properties/typography.js.
*/

`~~~~~~~~~~~ COMPONENT NAME ~~~~~~~~~~~`;

const default_properties = {};

/*
    Named presets, chosen by the brief writing `mode: <name>`. This runs after
    resolution has settled, so `current` already holds everything the layers
    decided -- and an explicit value in the brief still beats the preset,
    because update() records the layer rather than assigning the property.

    Write it the way button.js and heading.js do:

        const presets = { <name>: { <property>: <value> } };
        if (presets[current.mode]) update(current, presets[current.mode]);
*/
function modes() {}

/*
    `parent` is the module this component sits in -- not its siblings. Reach a
    sibling through `prev` and `next`, which setupRules wires up below.
*/
function modify(parent) {
    // ------------- BEGIN RULES ------------- //
    // -------------- END RULES -------------- //
}

function style(parent) {
    // ------------- BEGIN RULES ------------- //
    // -------------- END RULES -------------- //
}

//
// IGNORE BELOW
// --------------------------------------------------------------------------------

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
