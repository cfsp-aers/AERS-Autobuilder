const _ = require("lodash");
const config = (item) => {
    item.modified = false;

    item.fragment = true;

    return item;
};

module.exports = {
    config: config
};
