const fs = require("node:fs");
const path = require("path");
const _ = require("lodash");
const { load } = require("./load.js");
const XLSX = require("xlsx");

const { AERS_FILES_LOCATION, database } = load("", "../constants.js");

function getDb() {
    return {
        es: load(database, "ENTITY_STORE.json"),
        mo: load(database, "EDM_ORDER.json").module,
        co: load(database, "EDM_ORDER.json").component,
        rs: load(database, "RAW_STORE.json")
    };
}

function getEntityStore() {
    return load(database, "ENTITY_STORE.json");
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
    fs.writeFileSync(path.join(database, "ENTITY_STORE.json"), "");
    fs.writeFileSync(path.join(database, "ENTITY_STORE.json"), JSON.stringify(data, null, 2));
}

function getEdmOrder() {
    return load(database, "EDM_ORDER.json");
}

function startLog() {
    const LOG_LOCATION = path.join(AERS_FILES_LOCATION, "log.txt");
    fs.mkdirSync(AERS_FILES_LOCATION, { recursive: true });
    fs.writeFileSync(LOG_LOCATION, Date(), { encoding: "UTF-8" });
}

function log(...messages) {
    const LOG_LOCATION = path.join(AERS_FILES_LOCATION, "log.txt");
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
    let data_file;
    if (custom_location) data_file = path.join(custom_location, filename);
    else data_file = path.join(AERS_FILES_LOCATION, filename);
    const f_data = addDate ? `[\n"${Date()}",\n${JSON.stringify(data, null, 2)}]` : JSON.stringify(data, null, 2);
    fs.writeFileSync(data_file, f_data, { encoding: "UTF-8" });
}

function readData(filename, custom_location = null) {
    try {
        let data_file;
        if (custom_location) data_file = path.join(custom_location, filename);
        else data_file = path.join(AERS_FILES_LOCATION, filename);
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

module.exports = {
    load: load,
    startLog: startLog,
    log: log,
    clean: clean,
    exists: exists,
    isEmpty: isEmpty,
    isThisButNot: isThisButNot,
    delete_row: delete_row,
    writeData: writeData,
    readData: readData,
    getEntityStore: getEntityStore,
    getEdmOrder: getEdmOrder,
    updateEntityStore: updateEntityStore,
    getDb: getDb
};
