const _ = require("lodash");

function formatSpacingToArray(arg) {
    if (!_.isString(arg) && !_.isArray(arg)) return arg;
    let spacing = _.toString(arg).split(/,| /);
    spacing = spacing.map((value) => _.trimEnd(value, "px"));

    let result = [spacing[0], spacing[1] || spacing[0], spacing[2] || spacing[0], spacing[3] || spacing[1] || spacing[0]];

    // returns [#, #, #, #]

    return result;
}

function updateSpacing(arg, updated_value) {
    const spacing = formatSpacingToArray(arg);
    const updated_spacing = formatSpacingToArray(updated_value);
    //console.log(spacing, updated_spacing);

    const result = formatSpacingToString(
        updated_spacing.map((value, index) => {
            if (value == "_") return spacing[index];
            else return value;
        })
    );
    //console.log(result);

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
