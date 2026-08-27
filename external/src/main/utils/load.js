const path = require("path");

function load(parentLocation, fileName) {
    delete require.cache[require.resolve(path.join(parentLocation, fileName))];
    return require(path.join(parentLocation, fileName));
}
module.exports = {
    load: load
};
