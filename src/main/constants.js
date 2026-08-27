const _ = require("lodash");
const path = require("path");
const fs = require("node:fs");

const app_dir = path.resolve(path.join(__dirname, "../"));

const user_files = path.resolve(path.join(__dirname, "../../lib"));

/*
    The app writes REQUIRED_DATA.json next to the engine and it is read back
    here, at require time. AB_REQUIRED_DATA_PATH lets a caller point somewhere
    else -- used by the golden tests so a test run does not overwrite whatever
    the user last built.

    This is a stopgap. Under ADR 0001 the engine lives on a shared volume, where
    writing per-user build state next to itself is wrong outright: two people
    building at once would overwrite each other, and a read-only mount would
    fail. The fix is configure() -- see the combination plan, section 4.3.
*/
const required_data_path = process.env.AB_REQUIRED_DATA_PATH || path.join(app_dir, "../src/REQUIRED_DATA.json");

const REQUIRED_DATA = JSON.parse(fs.readFileSync(required_data_path, { encoding: "UTF-8" }));

const { BRIEF_PARENT_FOLDER, BRIEF_LOCATION, OUTPUT_LOCATION, SELECTED_SHEETS } = REQUIRED_DATA;

const AERS_FILES_LOCATION = path.resolve(path.join(BRIEF_PARENT_FOLDER, "AERS files"));

const aers_library_location = path.resolve(path.join(__dirname, "../../../aers_lib"));

const LOG_LOCATION = path.resolve(path.join(AERS_FILES_LOCATION, "log.txt"));

const database = path.resolve(path.join(__dirname, "../database"));

module.exports = {
    app_dir: app_dir,
    user_files: user_files,
    database: database,
    BRIEF_PARENT_FOLDER: BRIEF_PARENT_FOLDER,
    BRIEF_LOCATION: BRIEF_LOCATION,
    OUTPUT_LOCATION: OUTPUT_LOCATION,
    SELECTED_SHEETS: SELECTED_SHEETS,
    AERS_FILES_LOCATION: AERS_FILES_LOCATION,
    aers_library_location: aers_library_location
};
