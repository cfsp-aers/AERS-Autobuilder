const _ = require("lodash");

function formatSpacingToArray(arg) {
    // A bare number means that many pixels -- briefs write `padding: 24`, and the
    // brief parser coerces bare digits to integers before spacing ever sees them.
    if (!_.isString(arg) && !_.isArray(arg) && !_.isFinite(arg)) return arg;
    let spacing = _.toString(arg).split(/,| /);
    spacing = spacing.map((value) => _.trimEnd(value, "px"));

    let result = [spacing[0], spacing[1] || spacing[0], spacing[2] || spacing[0], spacing[3] || spacing[1] || spacing[0]];

    // returns [#, #, #, #]

    return result;
}

function updateSpacing(arg, updated_value) {
    const spacing = formatSpacingToArray(arg);
    const updated_spacing = formatSpacingToArray(updated_value);

    const result = formatSpacingToString(
        updated_spacing.map((value, index) => {
            if (value == "_") return spacing[index];
            else return value;
        })
    );

    // returns "#px #px #px #px"

    return result;
}

function formatSpacingToString(arg) {
    const spacing = formatSpacingToArray(arg);

    const result = spacing.map((value) => `${value}px`).join(" ");

    // returns "#px #px #px #px"

    return result;
}

module.exports = {
    formatSpacingToArray: formatSpacingToArray,
    formatSpacingToString: formatSpacingToString,
    updateSpacing: updateSpacing
};
