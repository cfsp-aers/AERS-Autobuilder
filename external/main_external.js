/**
 * main_external.js -- the application, outside the .app bundle.
 *
 * The bootstrap (app/main.js) finds this file, puts the app's node_modules on
 * the module search path, and calls init() with the few things this side cannot
 * work out for itself. Everything from there is ours: windows, IPC, and the
 * build engine underneath src/.
 *
 * Changes to anything in this tree reach the team on their next launch, with no
 * rebuild. See docs/adr/0001-engine-runs-outside-the-app-bundle.md.
 *
 * init() is handed an object described in app/main.js. The two sides are
 * versioned separately -- a teammate may be running an older .app against a
 * newer published tree -- so treat every key as possibly absent and degrade
 * rather than crash.
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron/main");
const path = require("node:path");
const fs = require("node:fs");
const XLSX = require("xlsx");

const log = require("electron-log");
log.transports.ipc.level = "debug";

/** Root of the external tree. src/, lib/ and ui/ are all relative to this. */
const external_dir = __dirname;
const ui_dir = path.join(external_dir, "ui");

/** Cache-busting require, so a rebuilt module picks up edited rule files. */
function load(parentLocation, fileName) {
    delete require.cache[require.resolve(path.join(parentLocation, fileName))];
    return require(path.join(parentLocation, fileName));
}

// ---------------------------------------------------------------------------
// Handed in by the bootstrap
// ---------------------------------------------------------------------------

let bootstrap = {};

/*
    Where per-user build state is written. The engine reads REQUIRED_DATA at
    require time from AB_REQUIRED_DATA_PATH, which the bootstrap sets before
    loading this file, so both sides must agree on the same location.

    Falling back to the tree's own src/ keeps this file runnable outside the
    app -- the golden tests do exactly that -- but under ADR 0001 the real run
    is always the userData one. Phase 2 replaces the whole arrangement with a
    configure() call and this fallback goes away with it.
*/
function required_data_path() {
    return process.env.AB_REQUIRED_DATA_PATH || path.join(external_dir, "src/REQUIRED_DATA.json");
}

function previous_required_data_path() {
    return process.env.AB_PREVIOUS_REQUIRED_DATA_PATH || path.join(external_dir, "src/PREVIOUS_REQUIRED_DATA.json");
}

// ---------------------------------------------------------------------------
// Dev settings
// ---------------------------------------------------------------------------

let dev_settings;

try {
    dev_settings = load(external_dir, "dev_settings.json");
    console.log("[dev settings found] : ");
    console.group();
    console.log(dev_settings);
    console.groupEnd();
} catch (_) {
    console.log("no dev settings found");
}

// ---------------------------------------------------------------------------
// Windows
// ---------------------------------------------------------------------------

let mainWindow;
let fileDataWindow;
let file_data_json = {};

/*
    Every console method the main process has, mirrored into the renderer's
    devtools and to electron-log's file transport.

    Phase 2 makes this safe -- arguments go over IPC raw today, so anything
    non-cloneable throws -- and broadcasts to every window rather than just the
    main one. Listed as a behaviour change, so it waits for its own phase.
*/
const FORWARDED_CONSOLE_METHODS = ["assert", "clear", "count", "countReset", "debug", "dir", "dirxml", "error", "group", "groupCollapsed", "groupEnd", "info", "log", "table", "time", "timeEnd", "timeLog", "trace", "warn"];

let console_forwarding_installed = false;

function forwardConsoleToRenderer() {
    // createWindow runs again on "activate"; wrapping the wrappers would
    // duplicate every line for each window that has ever existed.
    if (console_forwarding_installed) return;
    console_forwarding_installed = true;

    FORWARDED_CONSOLE_METHODS.forEach((method) => {
        const original = console[method];
        console[method] = (...args) => {
            original(...args);
            log.info(...args);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send("main-log", method, ...args);
            }
        };
    });
}

const createWindow = () => {
    mainWindow = new BrowserWindow({
        titleBarStyle: "hidden",
        backgroundColor: "#323232",
        width: 1880,
        height: 1000,
        x: 1440,
        y: 200,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(ui_dir, "preload.js")
        }
    });

    forwardConsoleToRenderer();

    mainWindow.loadFile(path.join(ui_dir, "index.html"));
};

const createfileDataWindow = () => {
    fileDataWindow = new BrowserWindow({
        titleBarStyle: "hidden",
        backgroundColor: "#323232",
        width: 1200,
        height: 1000,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(ui_dir, "preload.js")
        }
    });

    fileDataWindow.loadFile(path.join(ui_dir, "file_data.html"));
};

// ---------------------------------------------------------------------------
// Build state
// ---------------------------------------------------------------------------

let REQUIRED_DATA = {
    BRIEF_PARENT_FOLDER: "",
    BRIEF_LOCATION: "",
    OUTPUT_LOCATION: "",
    SELECTED_SHEETS: "",
    ALL_SHEETS: ""
};

let selectedFiles = {
    excel: null,
    sheets: null
};

let fileLocations = {
    excelFolder: null,
    outputFolder: null,
    dataDict: "data_dict.json",
    moduleTemplates: "modules"
};

async function reloadAutobuilder() {
    const result = { success: false, output: null };
    const previous = fs.readFileSync(previous_required_data_path(), { encoding: "UTF-8" });

    if (previous) {
        result.success = true;
        result.output = JSON.parse(previous);
        REQUIRED_DATA = result.output;
        result.output.ALL_SHEETS = XLSX.readFile(result.output.BRIEF_LOCATION).SheetNames;
    }

    return result;
}

/*
    Auto-update is the deferred half of ADR 0001. Until it exists, a new .app is
    distributed by hand -- which is rare, because the .app is a bootstrap and
    almost every change ships through the published tree instead.

    The beta's abandoned attempt at this (a git-clone import used nowhere) has
    been removed. The channel stays so the UI button does not throw.
*/
function updateAutobuilder() {
    return "Updates ship through the published tree. Nothing to do.";
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

function registerHandlers() {
    ipcMain.handle("update-autobuilder", async () => updateAutobuilder());

    ipcMain.handle("reload-autobuilder", async () => await reloadAutobuilder());

    ipcMain.handle("open-file-data", async () => createfileDataWindow());

    ipcMain.handle("get-file-data", async () => file_data_json);

    ipcMain.handle("path_basename", async (event, _path) => path.basename(_path));

    ipcMain.handle("path_foldername", async (event, _output) => path.basename(path.dirname(_output)));

    ipcMain.handle("select-excel-file", async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ["openFile"],
            filters: [{ name: "Excel Files", extensions: ["xlsx", "xls"] }]
        });
        if (result.canceled) return null;

        selectedFiles.excel = result.filePaths[0];
        selectedFiles.sheets = XLSX.readFile(selectedFiles.excel).SheetNames;
        REQUIRED_DATA.BRIEF_LOCATION = result.filePaths[0];
        REQUIRED_DATA.BRIEF_PARENT_FOLDER = path.dirname(path.resolve(result.filePaths[0]));
        return selectedFiles;
    });

    ipcMain.handle("reload-excel-file", async () => {
        selectedFiles.sheets = XLSX.readFile(selectedFiles.excel).SheetNames;
        REQUIRED_DATA.BRIEF_LOCATION = selectedFiles.excel;
        REQUIRED_DATA.BRIEF_PARENT_FOLDER = path.dirname(path.resolve(selectedFiles.excel));
        return selectedFiles;
    });

    ipcMain.handle("select-output-folder", async () => {
        const result = await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory"] });
        if (result.canceled) return null;

        fileLocations.outputFolder = result.filePaths[0];
        REQUIRED_DATA.OUTPUT_LOCATION = result.filePaths[0];
        return fileLocations.outputFolder;
    });

    ipcMain.handle("create-html-file", async (event, selected_sheets_list) => {
        const result = { output: {}, message: "" };

        REQUIRED_DATA.SELECTED_SHEETS = selected_sheets_list;

        // The engine reads this back at require time, which is why it is
        // written before constants.js is loaded rather than passed as an
        // argument. Phase 2 replaces the round-trip with configure().
        fs.writeFileSync(required_data_path(), JSON.stringify(REQUIRED_DATA, null, 2), { encoding: "UTF-8" });

        load(external_dir, "./src/main/constants.js");

        try {
            const aers_main = load(external_dir, "./src/main/main.js");
            result.output = aers_main.buildEmails();
        } catch (error) {
            console.error("custom error", error.toString());
        }

        fs.writeFileSync(previous_required_data_path(), JSON.stringify(REQUIRED_DATA, null, 2), { encoding: "UTF-8" });

        /*
            The gate on the offline cache. A tree that boots proves only that it
            parses; a tree that has produced an email on this Mac is worth
            falling back to. See the cache section of app/main.js.
        */
        if (result.output && result.output.success === true && typeof bootstrap.notifyBuildSucceeded === "function") {
            bootstrap.notifyBuildSucceeded();
        }

        return result;
    });

    ipcMain.handle("open-folder", async (event, folderPath) => shell.showItemInFolder(folderPath));

    ipcMain.on("counter-value", (_event, value) => console.log(value));
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

function init(dependencies) {
    bootstrap = dependencies || {};

    registerHandlers();

    app.whenReady().then(() => {
        createWindow();
        console.log("dev_settings : ", dev_settings);

        if (dev_settings?.dev_mode === true) {
            mainWindow.webContents.send("check-for-dev", true, JSON.stringify(dev_settings, null, "‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ "));
        }
    });

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    app.on("window-all-closed", () => {
        app.quit();
    });

    process.on("uncaughtException", (err) => {
        const options = {
            type: "error",
            title: "Error in Main process",
            message: "Something went wrong!",
            detail: err.message
        };

        console.log("custom error:", options);

        dialog.showMessageBox(null, options);
    });
}

module.exports = { init };
