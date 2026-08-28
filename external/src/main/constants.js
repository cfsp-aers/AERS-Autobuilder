const path = require("path");

/*
    Where the engine and the library are. Both are derived from this file's own
    location, so the engine works wherever the external tree happens to sit -- a
    dev checkout, the shared volume, or the offline cache in userData. Nothing
    here may assume an absolute location.

    These are the only two things in this file, and that is the point. Forty-five
    files require it; forty-three of them want exactly these two paths. Build
    configuration -- which brief, which sheets, where the output goes -- used to
    live here too, read from REQUIRED_DATA.json at require time and re-exported to
    every one of those importers. It now lives in build_config.js and is set by
    buildEmails(). See the combination plan, section 4.3.
*/

/** external/src -- the root the load() calls elsewhere are relative to. */
const app_dir = path.resolve(path.join(__dirname, "../"));

/** external/lib -- module definitions, templates, palettes. */
const user_files = path.resolve(path.join(__dirname, "../../lib"));

module.exports = {
    app_dir: app_dir,
    user_files: user_files
};
