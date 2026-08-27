const fs = require("fs");
const path = require("node:path");

const { user_files } = require("../constants.js");

function setTemplate(entity_type, type, name) {
    let template = [`${type}`, `${name}.js`];

    if (entity_type == "component") {
        template = [`${entity_type}`, `${type}.js`];
    }
    // Check if there's a folder for the module's type / entity type, if not, set to default
    if (!fs.existsSync(path.resolve(path.join(user_files, "modules", template[0])))) template[0] = "default";

    // Check if there's a folder for the module's name / type, if not, set to default
    if (!fs.existsSync(path.resolve(path.join(user_files, "modules", template[0], template[1])))) {
        template[0] = "default";
        template[1] = "default.js";
    }
    return template;
}

module.exports = {
    setTemplate: setTemplate
};
