const fs = require("node:fs");
const path = require("path");
const _ = require("lodash");
const { load } = require("./load.js");
const XLSX = require("xlsx");

/*
    Required directly rather than through load(), which would delete it from
    require.cache and hand this file a fresh, unconfigured instance.

    Read inside each function, never at module scope: this file is loaded by five
    others, some of them before buildEmails() has configured anything.
*/
const { buildConfig } = require("../build_config.js");

function getDb() {
    const { databaseLocation } = buildConfig();
    return {
        es: load(databaseLocation, "ENTITY_STORE.json"),
        mo: load(databaseLocation, "EDM_ORDER.json").module,
        co: load(databaseLocation, "EDM_ORDER.json").component,
        rs: load(databaseLocation, "RAW_STORE.json")
    };
}

function getEntityStore() {
    return load(buildConfig().databaseLocation, "ENTITY_STORE.json");
}

function updateEntityStore(data, reset_user_settings = true) {
    const { rs } = getDb();
    if (reset_user_settings) {
        _.forIn(data, (value, key) => {
            _.forIn(value, (v, k) => {
                if (rs[value.uuid].user_settings[k]) {
                    data[key][k] = rs[value.uuid].user_settings[k];
                } else if (typeof v == "object")
                    _.forIn(v, (v, p) => {
                        if (rs[value.uuid].user_settings[p]) {
                            data[key][k][p] = rs[value.uuid].user_settings[p];
                        }
                    });
            });
        });
    }
    const { databaseLocation } = buildConfig();
    fs.writeFileSync(path.join(databaseLocation, "ENTITY_STORE.json"), "");
    fs.writeFileSync(path.join(databaseLocation, "ENTITY_STORE.json"), JSON.stringify(data, null, 2));
}

function getEdmOrder() {
    return load(buildConfig().databaseLocation, "EDM_ORDER.json");
}

function logLocation() {
    return path.join(buildConfig().aersFilesLocation, "log.txt");
}

function startLog() {
    fs.mkdirSync(buildConfig().aersFilesLocation, { recursive: true });
    fs.writeFileSync(logLocation(), Date(), { encoding: "UTF-8" });
}

function log(...messages) {
    const LOG_LOCATION = logLocation();
    const formatted_messages = messages.map((msg) => {
        if (typeof msg == "object") {
            return JSON.stringify(msg, null, 2);
        } else {
            return _.toString(msg);
        }
    });
    const message = formatted_messages.join("\n");
    fs.appendFileSync(LOG_LOCATION, `\n${message}`);
}

function writeData(filename, data, addDate = true, custom_location = null) {
    const data_file = path.join(custom_location || buildConfig().aersFilesLocation, filename);
    const f_data = addDate ? `[\n"${Date()}",\n${JSON.stringify(data, null, 2)}]` : JSON.stringify(data, null, 2);
    fs.writeFileSync(data_file, f_data, { encoding: "UTF-8" });
}

function readData(filename, custom_location = null) {
    try {
        const data_file = path.join(custom_location || buildConfig().aersFilesLocation, filename);
        const f_data = fs.readFileSync(data_file, { encoding: "UTF-8" });
        return JSON.parse(f_data);
    } catch (e) {
        log(`Couldn't read ${filename}, not found`);
    }
}

function clean(item) {
    return JSON.parse(JSON.stringify(item));
}

function exists(item) {
    if (item === undefined || item === null || item === NaN || _.isEmpty(item)) {
        return false;
    } else {
        return true;
    }
}
function isEmpty(item) {
    if (item === undefined || item === null || item === NaN || _.isEmpty(item)) {
        return true;
    } else {
        return false;
    }
}

function isThisButNot(item, ...empty_items) {
    if (isEmpty(item) || exists(_.compact(empty_items))) {
        return false;
    } else {
        return true;
    }
}

function delete_row(ws, rows_to_delete) {
    for (let i = 0; i < rows_to_delete; i++) {
        let variable = XLSX.utils.decode_range(ws["!ref"]);
        for (let R = 0; R < variable.e.r; ++R) {
            for (let C = variable.s.c; C <= variable.e.c; ++C) {
                ws[ec(R, C)] = ws[ec(R + 1, C)];
            }
        }
        variable.e.r--;
        ws["!ref"] = XLSX.utils.encode_range(variable.s, variable.e);
    }
}

function ec(r, c) {
    return XLSX.utils.encode_cell({ r: r, c: c });
}

/*
    Brief sheets carry a title bar above their real header row, so the header has
    to be skipped past before the rows can be read as objects.

    That used to be done by counting -- delete two rows from the Offer Library,
    one from a content sheet. The counts held for the current brief template and
    for nothing else. The previous generation of the template carries one header
    row in the Offer Library where the current one carries two, so opening an
    older brief silently consumed the first offer as the header, every alias
    lookup missed, and the build died on `Cannot read properties of undefined
    (reading 'offerAlias')` -- which names neither the sheet nor the brief.

    Looking for the header instead costs a scan of the first few rows and works
    on both templates.
*/

/** How far down to look before giving up. Title bars are one or two rows. */
const HEADER_SCAN_LIMIT = 10;

/** The key a column heading becomes once sheet_to_json has been through it. */
function column_key(value) {
    return _.camelCase(String(value).split("\n")[0]);
}

/** The keys a given row of the sheet would contribute as column headings. */
function keys_in_row(ws, row, range) {
    const keys = [];
    for (let C = range.s.c; C <= range.e.c; C++) {
        const cell = ws[ec(row, C)];
        if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim()) {
            keys.push(column_key(cell.v));
        }
    }
    return keys;
}

/**
 * Find the header row of a sheet by looking for a column that must be in it.
 *
 * @param {object} ws              the worksheet
 * @param {string} required_column the column key the header must contain,
 *                                 camelCased -- "offerAlias", "moduleType"
 * @param {string} description     what to call this sheet if it is not found
 * @returns {number} the header's row index, counted from the top of the sheet
 */
function find_header_row(ws, required_column, description) {
    if (!ws || !ws["!ref"]) {
        throw new Error(`${description} is empty.`);
    }

    const range = XLSX.utils.decode_range(ws["!ref"]);
    const last_row = Math.min(range.e.r, HEADER_SCAN_LIMIT - 1);

    let header = -1;
    for (let R = 0; R <= last_row; R++) {
        if (keys_in_row(ws, R, range).includes(required_column)) {
            header = R;
        } else if (header !== -1) {
            /*
                Stop at the first row that is not a header. The current template
                repeats the Offer Library header twice, and it is the second that
                the data sits under -- take the first and the duplicate becomes a
                junk offer.
            */
            break;
        }
    }

    if (header === -1) {
        throw new Error(`Could not find the header row of ${description}: no "${required_column}" column in the first ${HEADER_SCAN_LIMIT} rows.`);
    }

    return header;
}

/**
 * Read a sheet into objects, keyed by its header row wherever that row is.
 *
 * @param {object} ws              the worksheet
 * @param {string} required_column camelCased column key the header must contain
 * @param {string} description     what to call this sheet in an error
 */
function sheet_to_objects(ws, required_column, description) {
    delete_row(ws, find_header_row(ws, required_column, description));

    return XLSX.utils.sheet_to_json(ws, { raw: false }).map((item) => {
        let prepared_item = {};
        _.forIn(item, (value, key) => {
            if (!_.isEmpty(value)) prepared_item[column_key(key)] = value;
        });
        return prepared_item;
    });
}

module.exports = {
    load: load,
    startLog: startLog,
    log: log,
    clean: clean,
    exists: exists,
    isEmpty: isEmpty,
    isThisButNot: isThisButNot,
    delete_row: delete_row,
    find_header_row: find_header_row,
    sheet_to_objects: sheet_to_objects,
    writeData: writeData,
    readData: readData,
    getEntityStore: getEntityStore,
    getEdmOrder: getEdmOrder,
    updateEntityStore: updateEntityStore,
    getDb: getDb
};
