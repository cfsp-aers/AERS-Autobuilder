const { load } = require("../../../src/main/utils/load.js");
const { app_dir } = require("../../../src/main/constants.js");
const { columns, col, component, image, rawString } = load(app_dir, "main/systems/layout.js");
//
//

`~~~~~~~~~~~ SIGNOFF PETBARN ~~~~~~~~~~~`;

const default_properties = {
  hide_transition: true
};

const component_positions = {};


const internal_layout = (current, content) =>
  rawString(
    `{{!-- [acr-start-fragment] --}}{{ fragment id="ajo:5ed43500-14d2-41ce-a42c-277e2cad5f7b" name="Petbarn Standard Signoff" mode="inline" }}{{!-- [acr-end-fragment] --}}`);

function modes() {}

function modify(childrenOf) {}

function style(childrenOf) {}



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
