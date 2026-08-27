const _ = require("lodash");
const path = require("path");
const fs = require("node:fs");

/*
    Everything here is relative to this file, so the engine works wherever the
    external tree happens to sit -- a dev checkout, the shared volume, or the
    offline cache in userData. Nothing may assume an absolute location.
*/

/** external/src -- the root the load() calls elsewhere are relative to. */
const app_dir = path.resolve(path.join(__dirname, "../"));

/** external/lib -- module definitions, templates, palettes. */
const user_files = path.resolve(path.join(__dirname, "../../lib"));

/*
    Per-user build state: the configuration for the build about to run, and the
    intermediate data stores it writes on the way through.

    Both default to sitting beside the engine, which is where the beta put them
    and what the golden tests rely on. In the app they do not: the bootstrap
    points them at userData, because under ADR 0001 the engine lives on a shared
    volume, and writing per-user state there is wrong outright -- two people
    building at once would overwrite each other, and a read-only mount would
    fail.

    The environment variables are a stopgap for a file-based round-trip that
    should not exist at all. The fix is configure() -- see the combination plan,
    section 4.3.
*/
const required_data_path = process.env.AB_REQUIRED_DATA_PATH || path.join(app_dir, "REQUIRED_DATA.json");

const database = process.env.AB_DATABASE_PATH || path.resolve(path.join(__dirname, "../database"));

const REQUIRED_DATA = JSON.parse(fs.readFileSync(required_data_path, { encoding: "UTF-8" }));

const { BRIEF_PARENT_FOLDER, BRIEF_LOCATION, OUTPUT_LOCATION, SELECTED_SHEETS } = REQUIRED_DATA;

const AERS_FILES_LOCATION = path.resolve(path.join(BRIEF_PARENT_FOLDER, "AERS files"));

const LOG_LOCATION = path.resolve(path.join(AERS_FILES_LOCATION, "log.txt"));

module.exports = {
    app_dir: app_dir,
    user_files: user_files,
    database: database,
    BRIEF_PARENT_FOLDER: BRIEF_PARENT_FOLDER,
    BRIEF_LOCATION: BRIEF_LOCATION,
    OUTPUT_LOCATION: OUTPUT_LOCATION,
    SELECTED_SHEETS: SELECTED_SHEETS,
    AERS_FILES_LOCATION: AERS_FILES_LOCATION
};
