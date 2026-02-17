function logToRenderer(window, message) {
    window.webContents.send("main-log", message);
}

const originalLog = console.log;

const log =
    (window) =>
    (...args) => {
        originalLog(...args);
        logToRenderer(window, args.join(" "));
    };

module.exports = {
    log: log,
    logToRenderer: logToRenderer,
    originalLog: originalLog
};
