const { load } = require("../../../src/main/utils/load.js");
const { app_dir } = require("../../../src/main/constants.js");
const { container, columns, row, col, component, image, nothing, rawString } = load(app_dir, "main/systems/layout.js");
//
//

`~~~~~~~~~~~ HEADER PETBARN ~~~~~~~~~~~`;

const default_properties = {
hide_transition: true,
no_nav: true
};

const component_positions = {};


const internal_layout = (current, content) =>
    current.no_nav ?
    rawString(`{{!-- [acr-start-fragment] --}}{{ fragment id="ajo:07f1347c-ef56-4c1a-859f-06cdc0616ede" name="Petbarn Header" mode="inline" }}{{!-- [acr-end-fragment] --}}`) :
    rawString(`{{!-- [acr-start-fragment] --}}{{ fragment id="ajo:414a20cb-e87c-45a5-8671-b78ad42dbb7a" name="Petbarn Header with Nav" mode="inline" }}{{!-- [acr-end-fragment] --}}`);
    

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
