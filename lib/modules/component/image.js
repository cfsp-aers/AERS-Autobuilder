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
    // ~~ spacing ~~
    vertical_align: "middle",
    padding: "0px",
    // ~~ border ~~
    border_radius: "0px",
    // ~~ size ~~
    width: "100%"
    // ~~ other ~~
};

function modes() {
    const presets = {
        default: {
            // what properties change for default
        },
        outline: {
            border_top: "match/background",
            border_right: "match/background",
            border_bottom: "match/background",
            border_left: "match/background"
        },
        underline: {
            border_radius: "0px",
            border_bottom: "match/background",
            inner_padding: "4px",
            mso_height: "32px"
        }
    };
    if (presets[current.mode]) update(current, presets[current.mode]);
}

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
