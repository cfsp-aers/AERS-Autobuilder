const _ = require("lodash");
const path = require("path");
const fs = require("node:fs");

const app_dir = path.resolve(path.join(__dirname, "../"));

const user_files = path.resolve(path.join(__dirname, "../../lib"));

const REQUIRED_DATA = JSON.parse(fs.readFileSync(path.join(app_dir, "../src/REQUIRED_DATA.json"), { encoding: "UTF-8" }));

console.log("const req_dat", REQUIRED_DATA);

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
