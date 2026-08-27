const _ = require("lodash");
const fs = require("fs");
const path = require("node:path");

const { user_files } = require("../constants.js");
const { load } = require("../utils/load.js");

const module_library = load(user_files, "libraries/modules.json");

function getTypeAndName(item) {
    if (!item.type) return item;
    const type_and_name = _.findKey(module_library[item.entity_type], (m) => m.indexOf(item.type) >= 0) ? _.findKey(module_library[item.entity_type], (m) => m.indexOf(item.type) >= 0) : item.type;
    let [type, name] = type_and_name.split("/");
    name ??= item.name;

    return [type, name];
}

function setType(item) {
    return getTypeAndName(item)[0];
}

function setName(item) {
    return getTypeAndName(item)[1];
}

module.exports = {
    setType: setType,
    setName: setName
};
