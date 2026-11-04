const path = require("path");

/*
    Where the engine and the library are. Both are derived from this file's own
    location, so the engine works wherever the external tree happens to sit -- a
    dev checkout, the shared volume, or the offline cache in userData. Nothing
    here may assume an absolute location.

    These paths are the only things in this file, and that is the point. Forty-five
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

/**
 * external/lib-dev -- the dev library: experimental library files, mirroring
 * lib/, read first while the dev library toggle is on. Never published. Read it
 * through utils/library.js, never directly. See dev-library-plan.md.
 */
const lib_dev = path.resolve(path.join(__dirname, "../../lib-dev"));

/**
 * external/lib-test -- the test library: a frozen library the snapshot suites
 * build against, so editing lib/ cannot move a baseline. Never published, and
 * never read by the app. Selected with build_config.useBaseLibrary(). See
 * test-library-plan.md.
 */
const lib_test = path.resolve(path.join(__dirname, "../../lib-test"));

module.exports = {
    app_dir: app_dir,
    user_files: user_files,
    lib_dev: lib_dev,
    lib_test: lib_test
};
