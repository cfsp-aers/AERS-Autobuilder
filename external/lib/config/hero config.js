const _ = require("lodash");
const config = (item) => {
    item.modified = false;

    if (item.name == "hero" && item.orientation != "horizontal") {
        item.name = "hero standard";
    }

    return item;
};

module.exports = {
    config: config
};
