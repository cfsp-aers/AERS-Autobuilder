function logToRenderer(window, message) {
    window.webContents.send("main-log", message);
}

const log =
    (window) =>
    (...args) => {
        if (window != undefined) logToRenderer(window, args.join(" "));
    };

module.exports = {
    log: log,
    logToRenderer: logToRenderer
};
