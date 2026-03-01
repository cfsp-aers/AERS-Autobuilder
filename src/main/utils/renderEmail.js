const nunjucks = require("nunjucks");
const path = require("node:path");
const { app_dir, user_files, AERS_FILES_LOCATION, BRIEF_PARENT_FOLDER, BRIEF_LOCATION, OUTPUT_LOCATION, SELECTED_SHEETS } = require("../constants.js");
const { load } = require("../utils/load.js");
const aers = load(app_dir, "main/utils/aers utilities.js");

function renderEmail(outputLocation, content) {
    var env = nunjucks.configure(path.join(user_files, "html templates"), { noCache: true, autoescape: false });
    console.log("Rendering eDM ...");
    let result = {
        fileName: content.name,
        filePath: outputLocation,
        fileContent: env.render(path.join(path.join(user_files, "html templates"), "main.njk"), aers.clean(content))
    };
    console.log("Successfully Rendered eDM");
    return result.fileContent; //.replaceAll(/\n\n/g, "");
}

module.exports = {
    renderEmail: renderEmail
};
