const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir, user_files } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const { setComponents } = load(app_dir, "main/systems/setComponents.js");

`
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            MODULE NAME HERE
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
`;

const default_properties = {
    // ~~ module data ~~
    mode: null,
    // ~~ palette ~~
    //palette: "secondary",
    colour: "body",
    background: null,
    // ~~ spacing ~~
    vertical_align: "middle",
    padding: "0px 0px 4px",
    margin: "0px",
    // ~~ font ~~
    font_size: "12px",
    line_height: "14px",
    font_weight: "normal",
    text_align: "center",
    font: "Outfit",
    text_size_class: null
    // ~~ border ~~
    // border_radius: "0px"
};

function modes() {}

function modify() {
    // ------------- BEGIN RULES ------------- //
    // -------------- END RULES -------------- //
}

function style() {
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
