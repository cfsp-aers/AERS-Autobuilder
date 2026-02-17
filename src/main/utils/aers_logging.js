let mainWindow;

function setupLog(log_window) {
    mainWindow ??= logWindow;
}

function logToRenderer(window = mainWindow, message) {
    window.webContents.send("main-log", message);
}

const log =
    (window = mainWindow) =>
    (...args) => {
        if (window != undefined) logToRenderer(window, args.join(" "));
    };

module.exports = {
    log: log,
    logToRenderer: logToRenderer,
    setupLog: setupLog
};
