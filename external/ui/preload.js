const { contextBridge, ipcRenderer, shell, ipcMain } = require("electron");

contextBridge.exposeInMainWorld("autobuilds", {
    updateAutobuilder: () => ipcRenderer.invoke("update-autobuilder"),
    reloadAutobuilder: () => ipcRenderer.invoke("reload-autobuilder"),
    getExcel: () => ipcRenderer.invoke("select-excel-file"),
    reloadExcel: () => ipcRenderer.invoke("reload-excel-file"),
    outputPath: () => ipcRenderer.invoke("select-output-folder"),
    downloadImages: (selected_sheets_list) => ipcRenderer.invoke("download-images", selected_sheets_list),
    createHtmlFile: (selected_sheets_list) => ipcRenderer.invoke("create-html-file", selected_sheets_list),
    _test_add_file_locations: (test_files) => ipcRenderer.invoke("_test-add-locations", test_files),
    openFolder: (folderName) => ipcRenderer.invoke("open-folder", folderName)
    // we can also expose variables, not just functions
});

contextBridge.exposeInMainWorld("user_config", {
    setRules: () => ipcRenderer.invoke("set-rules-location"),
    setModuleTemplates: () => ipcRenderer.invoke("set-modules-location"),
    openFileData: () => ipcRenderer.invoke("open-file-data"),
    getFileData: () => ipcRenderer.invoke("get-file-data")
});

/*
    Handled by the bootstrap, not by anything in this tree, so they keep working
    when the external files are missing or fail to load -- which is exactly when
    someone needs to repoint the app. The panel that uses them is phase 2; the
    bridge is here now so the channels are reachable and testable.
*/
contextBridge.exposeInMainWorld("external_files", {
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
    checkForDev: (callback) => ipcRenderer.on("check-for-dev", (_event, dev_status, dev_settings) => callback(dev_status, dev_settings))
});

const log = require("electron-log/preload");

contextBridge.exposeInMainWorld("log", {
    info: (msg) => log.info(msg),
    warn: (msg) => log.warn(msg),
    error: (msg) => log.error(msg),
    debug: (msg) => log.debug(msg)
});
