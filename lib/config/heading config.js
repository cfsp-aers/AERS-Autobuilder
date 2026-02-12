const _ = require("lodash");
const config = (item) => {
    item.modified = false;

    return item;
};

module.exports = {
    config: config
};
