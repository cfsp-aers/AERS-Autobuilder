const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir, user_files } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const { setComponents } = load(app_dir, "main/systems/setComponents.js");

function test_function(data) {
   _.forEach(data, (item) => {
        _.forIn(item, (value, key) => {
        item[key] = `${value}_modified`;
    });
   });
    
    return data;
}

module.exports = {
    test_function: test_function
};
