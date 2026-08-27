const _ = require("lodash");
const config = (item) => {
    // item.modified = false;

    // item.orientation = setOrientation(item); // set by moduleType or by user settings
    // item.layout = setLayout(item); // set by moduleType or by user settings

    // item.name = setName(item); // combination of category and layout

    return item;
};

/*
const setOrientation = (item) => {
    switch (true) {
        case item.horizontal == true:
            return "horizontal";
        case item.vertical == true:
            return "vertical";
        case item.moduleType?.includes("horizontal") || item.orientation == "horizontal":
            return "horizontal";
        case item.moduleType?.includes("vertical") || item.orientation == "vertical":
            return "vertical";
        default:
            return;
    }
};
const setLayout = (item) => {
    switch (true) {
        case item.block == true:
            return "block";
        case item.banner == true:
            return "banner";
        case item.tile == true:
            return "tile";
        case item.card == true:
            return "card";
        case item.moduleType?.includes("block") || item.layout == "block":
            return "block";
        case item.moduleType?.includes("banner") || item.layout == "banner":
            return "banner";
        case item.moduleType?.includes("tile") || item.layout == "tile":
            return "tile";
        case item.moduleType?.includes("card") || item.layout == "card":
            return "card";
        default:
            return "default";
    }
};

const setName = (item) => {
    let [category, layout, orientation] = [item.category, item.layout, item.orientation];
    // set the name of the module based on it's category and layout
    switch (true) {
        case item.layout == "default":
            layout = "standard";
            break;
        default:
            break;
    }

    if (item.category == "basic") orientation = null;
    if (item.category == "default") category = null;
    if (item.moduleType == "icon") category = "icon";

    return _.compact([category, layout, orientation]).join(" ");
};

*/

module.exports = {
    config: config
};
