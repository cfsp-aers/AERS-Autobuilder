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
    // ~~ palette ~~
    palette: "primary",
    // ~~ spacing ~~
    vertical_align: "middle",
    padding: "0px 0px 4px",
    inner_padding: "8px 16px",
    // ~~ font ~~
    font_size: "16px",
    line_height: "18px",
    font_weight: "bold",
    //text_align: "",
    font: "Outfit",
    // ~~ border ~~
    border_radius: "32px",
    border_top: false,
    border_right: false,
    border_bottom: false,
    border_left: false,
    // ~~ size ~~
    height: "",
    width: ""
    // ~~ other ~~
};

function modes() {
    const presets = {
        default: {
            // what properties change for default
        },
        outline: {
            no_bg: "true",
            border_top: "match/background",
            border_right: "match/background",
            border_bottomt: "match/background",
            border_left: "match/background"
        },
        underline: {
            no_bg: "true",
            border_radius: "0px",
            border_top: "none",
            border_right: "none",
            border_bottom: "match/background",
            border_left: "none",
            inner_padding: "4px"
        }
    };
    if (presets[current.mode]) update(current, presets[current.mode]);
}

function modify(cs) {
    // ------------- BEGIN RULES ------------- //
    // -------------- END RULES -------------- //
}

function style(cs) {
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
