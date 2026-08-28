/*
    Copy this into modules/component/ and rename it. The relative paths below
    are written for that destination, one folder deeper than this file sits, so
    the copy resolves and this template itself does not. Nothing loads it.

    A component has no internal_layout: the module that holds it decides where
    it goes, through component_positions and its layout.
*/

const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");

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
