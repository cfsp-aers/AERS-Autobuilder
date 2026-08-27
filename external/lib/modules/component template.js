const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir, user_files } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const { setComponents } = load(app_dir, "main/systems/setComponents.js");
//
//

`~~~~~~~~~~~ COMPONENT NAME ~~~~~~~~~~~`;

const default_properties = {};

function modes() {}

function modify(the, apply) {
    const [current, prev, next] = [the.current_item, the.previous_item, the.next_item];

    // ------------- BEGIN RULES ------------- //

    // -------------- END RULES -------------- //
}

function style(the, apply) {
    const [current, prev, next] = [the.current_item, the.previous_item, the.next_item];

    // ------------- BEGIN RULES ------------- //

    // -------------- END RULES -------------- //
}

module.exports = {
    modify: modify,
    style: style,
    default_properties: default_properties,
    modes: modes
};
