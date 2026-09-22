const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir } = require("../../../src/main/constants.js");
const { leading } = load(app_dir, "main/properties/typography.js");

`~~~~~~~~~~~ HEADING ~~~~~~~~~~~`;

const default_properties = {
    // ~~ module data ~~
    mode: "h2",
    // ~~ palette ~~
    //palette: "secondary",
    colour: "primary",
    background: null,
    // ~~ spacing ~~
    vertical_align: "middle",
    padding: "0px 0px 4px",
    margin: "0px",
    // ~~ font ~~
    font_size: "32px",
    line_height: "36px",
    font_weight: "bold",
    text_align: "center",
    font: "Outfit",
    text_size_class: "heading-large"
    // ~~ border ~~
    // border_radius: "0px"
};

function modes() {
    const presets = {
        h1: {
            font_size: "54px",
            line_height: "56px"
        },

        h2: {
            font_size: "44px",
            line_height: "48px"
        },

        h3: {
            font_size: "36px",
            line_height: "40px"
        },

        h4: {
            font_size: "32px",
            line_height: "36px"
        },

        h5: {
            font_size: "28px",
            line_height: "30px"
        },

        h6: {
            font_size: "24px",
            line_height: "26px"
        },

        h7: {
            font_size: "20px",
            line_height: "22px"
        },

        h8: {
            font_size: "18px",
            line_height: "20px"
        }
    };
    if (presets[current.mode]) update(current, { font_size: presets[current.mode].font_size });

    /*
        Read back rather than taking the preset's own `line_height`: what
        `current.font_size` resolves to is the explicit size if the brief gave
        one, and the preset's if it did not. That is what makes an explicit size
        drag its leading along instead of keeping the mode's.
    */
    update(current, { line_height: leading(current.font_size, presets) });

    switch (true) {
        case _.toInteger(_.trimEnd(current.font_size, "px")) >= 44:
            update(current, { text_size_class: "heading-extra-large" });
            break;
        case _.toInteger(_.trimEnd(current.font_size, "px")) >= 32:
            update(current, { text_size_class: "heading-large" });
            break;
        case _.toInteger(_.trimEnd(current.font_size, "px")) >= 24:
            update(current, { text_size_class: "heading-medium" });
            break;
        case _.toInteger(_.trimEnd(current.font_size, "px")) >= 20:
            update(current, { text_size_class: "heading-small" });
            break;
        case _.toInteger(_.trimEnd(current.font_size, "px")) > 16:
            update(current, { text_size_class: "heading-extra-small" });
            break;
        default:
            update(current, { text_size_class: "heading-extra-small" });
            break;
    }
}

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
