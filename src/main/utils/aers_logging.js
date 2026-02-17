let mainWindow;

function setupLog(win) {
    mainWindow = win;
}

function logToRenderer(message) {
    mainWindow.webContents.send("main-log", message);
}

const originalLog = console.log;

const log = (...args) => {
    originalLog(...args);
    logToRenderer(args.join(" "));
};

module.exports = {
    log: log,
    setupLog: setupLog,
    logToRenderer: logToRenderer,
    originalLog: originalLog
};
