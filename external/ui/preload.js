/*
    The renderer's whole view of the main process. Every function here must have
    a matching ipcMain handler, or the button that calls it rejects at runtime
    with nothing to say why.

    That had drifted badly in the beta: downloadImages, setRules,
    setModuleTemplates and _test_add_file_locations were all exposed with no
    handler anywhere. The Download Images button was dead in the shipped app.
    Keep this file and the handlers in main_external.js in step.
*/
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("autobuilds", {
    updateAutobuilder: () => ipcRenderer.invoke("update-autobuilder"),
    reloadAutobuilder: () => ipcRenderer.invoke("reload-autobuilder"),
    getExcel: () => ipcRenderer.invoke("select-excel-file"),
    reloadExcel: () => ipcRenderer.invoke("reload-excel-file"),
    outputPath: () => ipcRenderer.invoke("select-output-folder"),
    downloadImages: (selected_sheets_list) => ipcRenderer.invoke("download-images", selected_sheets_list),
    createHtmlFile: (selected_sheets_list) => ipcRenderer.invoke("create-html-file", selected_sheets_list),
    openFolder: (folderName) => ipcRenderer.invoke("open-folder", folderName)
});

contextBridge.exposeInMainWorld("user_config", {
    openFileData: () => ipcRenderer.invoke("open-file-data"),
    getFileData: () => ipcRenderer.invoke("get-file-data")
});

/*
    Handled by the bootstrap, not by anything in this tree, so they keep working
    when the external files are missing or fail to load -- which is exactly when
    someone needs to repoint the app.
*/
contextBridge.exposeInMainWorld("external_files", {
    showPanel: () => ipcRenderer.invoke("show-external-panel"),
    getLocation: () => ipcRenderer.invoke("get-external-location"),
    changeLocation: () => ipcRenderer.invoke("change-external-location"),
    resetLocation: () => ipcRenderer.invoke("reset-external-location"),
    openLocation: () => ipcRenderer.invoke("open-external-location")
});

contextBridge.exposeInMainWorld("_path", {
    _basename: (_path) => ipcRenderer.invoke("path_basename", _path),
    _foldername: (_output) => ipcRenderer.invoke("path_foldername", _output)
});

contextBridge.exposeInMainWorld("electronAPI", {
    onMainLog: (callback) => ipcRenderer.on("main-log", (_event, type, ...message) => callback(type, ...message)),
    checkForDev: (callback) => ipcRenderer.on("check-for-dev", (_event, dev_status, dev_settings) => callback(dev_status, dev_settings)),
    onImageDownloadProgress: (callback) => ipcRenderer.on("image-download-progress", (_event, done, total) => callback(done, total))
});

const log = require("electron-log/preload");

contextBridge.exposeInMainWorld("log", {
    info: (msg) => log.info(msg),
    warn: (msg) => log.warn(msg),
    error: (msg) => log.error(msg),
    debug: (msg) => log.debug(msg)
});
