const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");

`
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            MODULE NAME HERE
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
`;

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

function modify(childrenOf) {
    // ------------- BEGIN RULES ------------- //
    // -------------- END RULES -------------- //
}

function style(childrenOf) {
    // ------------- BEGIN RULES ------------- //
    // -------------- END RULES -------------- //
}

let current, prev, next;
let update;

function setupRules(the, apply) {
    [current, prev, next] = [the.current_item, the.previous_item, the.next_item];
    [update] = [apply.update];

    update(current, default_properties, false);
    update(current, current.user_settings);
}

module.exports = {
    modify: modify,
    style: style,
    default_properties: default_properties,
    modes: modes,
    setupRules: setupRules
};
