const _ = require("lodash");

/** The pixel count of "54px", "54" or 54. Zero if it is none of those. */
function pixels(value) {
    return _.toInteger(_.trimEnd(_.toString(value), "px"));
}

/**
    The leading for a font size.

    A mode preset is two numbers, and the pair only holds while the type is the
    size the preset said. A brief that asks for a size of its own gets the
    preset's leading anyway, which is how a 60px heading came to sit on 26px
    lines and overlap itself.

    So leading is derived from whatever size actually resolved, rather than read
    off the preset beside it. A size the scale already knows keeps exactly the
    leading it was designed with -- that is the first branch, and it is why this
    changes nothing for a heading that is just using its mode. A size the scale
    does not know has no designed answer, so it gets a ratio: 1.1, rounded up to
    an even number of pixels because the scale is drawn in even numbers.

    @param {string|number} font_size  the resolved size, not the preset's
    @param {object} presets  the mode table of the component asking
*/
function leading(font_size, presets) {
    const size = pixels(font_size);
    if (!size) return font_size;

    const designed = _.find(_.values(presets), (preset) => preset.line_height && pixels(preset.font_size) === size);
    if (designed) return designed.line_height;

    return `${Math.ceil((size * 1.1) / 2) * 2}px`;
}

module.exports = {
    leading: leading,
    pixels: pixels
};
