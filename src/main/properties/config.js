const fs = require("fs");
const path = require("node:path");

const { user_files } = require("../constants.js");

function setConfigLocation(item) {
    // find config by type
    let config = `${item.type} config.js`;
    if (!fs.existsSync(path.resolve(path.join(user_files, "config", config)))) config = "default config.js";
    return config;
}

module.exports = {
    setConfigLocation: setConfigLocation
};
