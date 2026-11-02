const nunjucks = require("nunjucks");
const path = require("node:path");
const { app_dir, lib_dev } = require("../constants.js");
const { load } = require("../utils/load.js");
const { libraryRoots } = require("./library.js");
const { noteDevFile } = require("../build_config.js");
const aers = load(app_dir, "main/utils/aers utilities.js");

/** lib/html templates -- main.njk and everything it includes. */
const TEMPLATES_FOLDER = "html templates";

function renderEmail(outputLocation, content) {
    /*
        One search path per library root, lib-dev/ first while the dev library
        is on. Nunjucks takes the first path that has a name, so an include --
        components/..., layouts/..., fragments/... -- is overlaid exactly like
        main.njk itself. That only holds because main.njk is rendered by name:
        an absolute path would pin it, and every include, to lib/.
    */
    var env = nunjucks.configure(
        libraryRoots().map((root) => path.join(root, TEMPLATES_FOLDER)),
        { noCache: true, autoescape: false }
    );
    
    env.addFilter('typeof', function(obj) {
      return typeof obj;
    });

    env.on("load", (name, source) => {
        if (source.path.startsWith(lib_dev + path.sep)) noteDevFile(path.relative(lib_dev, source.path));
    });
    console.log("Rendering eDM ...");
    let result = {
        fileName: content.name,
        filePath: outputLocation,
        fileContent: env.render("main.njk", aers.clean(content))
    };
    console.log("Successfully Rendered eDM");
    return result.fileContent; //.replaceAll(/\n\n/g, "");
}

module.exports = {
    renderEmail: renderEmail
};
