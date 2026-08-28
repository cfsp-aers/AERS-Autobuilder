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
    Per-user scratch space, handed over by the bootstrap. Under ADR 0001 the tree
    this file sits in is on a shared volume, so nothing per-user may be written
    beside it: two people building at once would overwrite each other, and a
    read-only mount would fail outright.

    The fallback keeps this file runnable straight out of a checkout. An older
    .app may not send buildStateDir at all, which is the same case -- the
    contract is versioned separately from this tree, so every key is treated as
    possibly absent.
*/
function build_state_dir() {
    return bootstrap.buildStateDir || path.join(external_dir, "src");
}

/** The four intermediate data stores the engine writes on the way through. */
function database_location() {
    return path.join(build_state_dir(), "database");
}

/**
 * The last build's settings, so "reload" can pick up where the user left off.
 * Genuine per-user session state, and the only thing here that outlives a build.
 */
function previous_build_path() {
    return path.join(build_state_dir(), "PREVIOUS_REQUIRED_DATA.json");
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
*/
const FORWARDED_CONSOLE_METHODS = ["assert", "clear", "count", "countReset", "debug", "dir", "dirxml", "error", "group", "groupCollapsed", "groupEnd", "info", "log", "table", "time", "timeEnd", "timeLog", "trace", "warn"];

/** Send to every open window. The file data window has a console too. */
function send_to_windows(channel, ...args) {
    BrowserWindow.getAllWindows().forEach((window) => {
        if (!window.isDestroyed()) {
            window.webContents.send(channel, ...args);
        }
    });
}

/*
    IPC arguments are cloned with the structured clone algorithm, which throws on
    anything it cannot represent -- an Error, a function, a class instance, a
    circular object. The beta sent console arguments across raw, so
    `console.error("failed:", err)` threw *inside the error handler*, replacing a
    diagnosable failure with a confusing one.

    Errors are the case that matters, since they are what gets logged when
    something is already wrong, and they clone to `{}` even when they do get
    through -- their message and stack are not own enumerable properties.
*/
function for_ipc(value, depth = 0) {
    if (value instanceof Error) {
        return value.stack || `${value.name}: ${value.message}`;
    }
    if (value === null || typeof value !== "object") {
        return typeof value === "function" || typeof value === "symbol" || typeof value === "bigint" ? String(value) : value;
    }
    if (depth >= 4) {
        return "[nested]";
    }
    try {
        if (Array.isArray(value)) {
            return value.map((item) => for_ipc(item, depth + 1));
        }
        const plain = {};
        Object.keys(value).forEach((key) => {
            plain[key] = for_ipc(value[key], depth + 1);
        });
        return plain;
    } catch (_) {
        // Getters that throw, proxies, anything else exotic.
        return String(value);
    }
}

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
            try {
                log.info(...args);
                send_to_windows("main-log", method, ...args.map((arg) => for_ipc(arg)));
            } catch (error) {
                // Never let logging be the thing that breaks a build. The
                // original call above has already run, so the message is not
                // lost -- it just did not reach the renderer.
                original(`[log forwarding failed: ${error.message}]`);
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
    // Focus the existing one rather than stacking up duplicates.
    if (fileDataWindow && !fileDataWindow.isDestroyed()) {
        fileDataWindow.focus();
        return;
    }

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
    const result = { success: false, output: null, message: "" };

    try {
        const previous = JSON.parse(fs.readFileSync(previous_build_path(), { encoding: "UTF-8" }));
        // The brief has to still be there. It usually lives on a share, so
        // "reload" a day later is exactly when this fails.
        previous.ALL_SHEETS = XLSX.readFile(previous.BRIEF_LOCATION).SheetNames;

        REQUIRED_DATA = previous;
        selectedFiles.excel = previous.BRIEF_LOCATION;
        selectedFiles.sheets = previous.ALL_SHEETS;

        result.success = true;
        result.output = previous;
    } catch (error) {
        // A first launch has no previous build, which is not a failure worth
        // shouting about. Anything else is, and the renderer shows the message.
        result.message = error.code === "ENOENT" ? "No previous build to reload." : `Could not reload the last build: ${error.message}`;
        console.warn(result.message);
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

    /*
        Removed rather than implemented: set-rules-location and
        set-modules-location.

        preload.js exposed both and nothing has ever handled them -- pressing
        either button in the config popup rejected. They are v2.5's three-folder
        configuration, where rules and module templates were separately
        relocatable. There is one external location now and the bootstrap owns
        it, so there is nothing left for them to set. See the combination plan,
        section 4.6.

        _test-add-locations went the same way: a test hook for a test that does
        not exist. Golden tests cover this ground now.
    */

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

        try {
            const aers_main = load(external_dir, "./src/main/main.js");
            result.output = aers_main.buildEmails({
                briefLocation: REQUIRED_DATA.BRIEF_LOCATION,
                briefParentFolder: REQUIRED_DATA.BRIEF_PARENT_FOLDER,
                outputLocation: REQUIRED_DATA.OUTPUT_LOCATION,
                selectedSheets: selected_sheets_list,
                databaseLocation: database_location()
            });
        } catch (error) {
            console.error("Build failed:", error.stack || error.message);
            result.output = { success: false, message: error.message };
        }

        // What the "show file data" window reads. Kept here rather than asked
        // for on demand, because the build that produced it has finished by then.
        file_data_json = {
            original_data: (result.output && result.output.original_data) || {},
            new_data: (result.output && result.output.new_data) || {}
        };

        // Only a build worth returning to. Writing this after a failure would
        // hand "reload" a configuration that is known not to work.
        if (result.output && result.output.success === true) {
            try {
                fs.mkdirSync(path.dirname(previous_build_path()), { recursive: true });
                fs.writeFileSync(previous_build_path(), JSON.stringify(REQUIRED_DATA, null, 2), { encoding: "UTF-8" });
            } catch (error) {
                console.warn(`Could not save the last build's settings: ${error.message}`);
            }

            /*
                The gate on the offline cache. A tree that boots proves only that
                it parses; a tree that has produced an email on this Mac is worth
                falling back to. See the cache section of app/main.js.
            */
            if (typeof bootstrap.notifyBuildSucceeded === "function") {
                bootstrap.notifyBuildSucceeded();
            }
        }

        return result;
    });

    /*
        v2.5's downloader never worked -- see the header of ilc_images.js for
        what was wrong with it. The button in the beta was worse still: preload
        exposed the channel and nothing registered a handler, so pressing it
        rejected, and the renderer then read .path off the rejection.
    */
    ipcMain.handle("download-images", async (event, selected_sheets_list) => {
        if (!REQUIRED_DATA.BRIEF_LOCATION) {
            return { path: null, total: 0, downloaded: 0, failed: [], message: "Select a brief first." };
        }
        if (!selected_sheets_list || selected_sheets_list.length === 0) {
            return { path: null, total: 0, downloaded: 0, failed: [], message: "Select at least one sheet." };
        }

        const chosen = await dialog.showOpenDialog(mainWindow, {
            title: "Where should the images be saved?",
            properties: ["openDirectory", "createDirectory"]
        });
        if (chosen.canceled) {
            return { path: null, total: 0, downloaded: 0, failed: [], message: "Cancelled." };
        }

        try {
            const { downloadImages } = load(external_dir, "./src/main/ilc_images.js");
            return await downloadImages({
                briefLocation: REQUIRED_DATA.BRIEF_LOCATION,
                selectedSheets: selected_sheets_list,
                saveTo: chosen.filePaths[0],
                onProgress: (done, total) => send_to_windows("image-download-progress", done, total)
            });
        } catch (error) {
            console.error("Image download failed:", error.stack || error.message);
            return { path: chosen.filePaths[0], total: 0, downloaded: 0, failed: [], message: `Could not download images: ${error.message}` };
        }
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
