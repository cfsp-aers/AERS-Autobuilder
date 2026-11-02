let excel_json;
let selectedExcelPath = null;
let selectedOutputPath = null;
let generatedFiles = [];
let images_folder = null;

let fileData = {
    original_data: null,
    new_data: null
};

let create_files_result;

let selectedSheets = [];

let previewOpen = false;

/*
    The build option, and its own state -- read at submit rather than mirrored
    into a variable, so there is nothing to keep in step with the checkbox.
*/
const ignoreExistingAssetsToggle = document.getElementById("ignoreExistingAssets");

/*
    The dev library toggle. Shown only when external/lib-dev/ holds a file, off
    on every launch, and never saved -- so it is not restored by "reload" either.
    While it is on, the title bar says so. See dev-library-plan.md.
*/
const useDevLibraryToggle = document.getElementById("useDevLibrary");
const devLibraryBadge = document.getElementById("devLibraryBadge");

useDevLibraryToggle.checked = false;
useDevLibraryToggle.addEventListener("change", () => {
    devLibraryBadge.hidden = !useDevLibraryToggle.checked;
});
window.autobuilds
    .devLibraryAvailable()
    .then((available) => {
        document.getElementById("devLibraryToggle").hidden = !available;
    })
    .catch(() => {});

tick = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
<path d="M9.54998 18L3.84998 12.3L5.27498 10.875L9.54998 15.15L18.725 5.97498L20.15 7.39998L9.54998 18Z" fill="currentColor"/>
</svg>`;

window.electronAPI.checkForDev((dev_status, dev_settings) => {
    if (dev_status) {
        document.getElementById("title_bar").innerText = `${document.getElementById("title_bar").innerText} [DEV MODE]`;
        document.getElementById("dev_settings").innerText = dev_settings;
    }
});

window.onerror = (message, source, lineno, colno, error) => {
    // Do something with the error, e.g., log it
    console.error("Renderer error:", error);
    // Optional: send to main process via IPC
    // window.api.sendErrorToMain(error);
};

window.addEventListener("unhandledrejection", (event) => {
    console.error("Renderer unhandled rejection:", event.reason);
});

window.electronAPI.onMainLog((type, ...messages) => {
    switch (type) {
        case "assert":
            console.assert(...messages);
            break;
        case "clear":
            console.clear(...messages);
            break;
        case "count":
            console.count(...messages);
            break;
        case "countReset":
            console.countReset(...messages);
            break;
        case "debug":
            console.debug(...messages);
            break;
        case "dir":
            console.dir(...messages);
            break;
        case "dirxml":
            console.dirxml(...messages);
            break;
        case "error":
            console.error(...messages);
            break;
        case "group":
            console.group(...messages);
            break;
        case "groupCollapsed":
            console.groupCollapsed(...messages);
            break;
        case "groupEnd":
            console.groupEnd(...messages);
            break;
        case "info":
            console.info(...messages);
            break;
        case "log":
            console.log(...messages);
            break;
        case "table":
            console.table(...messages);
            break;
        case "time":
            console.time(...messages);
            break;
        case "timeEnd":
            console.timeEnd(...messages);
            break;
        case "timeLog":
            console.timeLog(...messages);
            break;
        case "trace":
            console.trace(...messages);
            break;
        case "warn":
            console.warn(...messages);
            break;
        default:
            console.log(...messages);
            break;
    }
});

document.getElementById("showFileDataBtn").addEventListener("click", async () => {
    openFileData();
});

/*
    There is no Update AERS button any more. Each build runs on the latest
    publish by itself; what it cannot pick up mid-session is a change to the
    window and its main-process half, which load once per launch. A build that
    ran on such a publish says so, and this offers the restart. It stays up
    until it is used, and never restarts on its own -- that would close whatever
    the user had open just after an email built.
*/
function showRestartNotice() {
    document.getElementById("restartNotice").hidden = false;
}

document.getElementById("restartToUpdate").addEventListener("click", async () => {
    await window.autobuilds.restartToUpdate();
});

document.getElementById("externalFiles").addEventListener("click", async () => {
    await window.external_files.showPanel();
});

document.getElementById("reloadAutobuilder").addEventListener("click", async () => {
    document.body.classList.add("loading");
    await reloadAutobuilder();
    await sleep(1000).then(() => {
        document.body.classList.remove("loading");
    });
});

const reloadAutobuilder = async () => {
    const result = await window.autobuilds.reloadAutobuilder();

    if (!result.success) {
        // A first launch has nothing to reload, and a brief that has moved since
        // the last build is the common case after that. Both used to be silent.
        showStatus(result.message || "Could not reload the last build.", "error");
        return;
    }

    if (result.success) {
        console.log("previous data", result.output);
        excelWorkbook({ excel: result.output.BRIEF_LOCATION, sheets: result.output.ALL_SHEETS });
        outputFolder(result.output.OUTPUT_LOCATION);

        excel_json = null;
        selectedExcelPath = result.output.BRIEF_LOCATION;
        selectedOutputPath = result.output.OUTPUT_LOCATION;
        generatedFiles = [];
        images_folder = null;

        fileData = {
            original_data: null,
            new_data: null
        };
        create_files_result = null;
        selectedSheets = result.output.SELECTED_SHEETS;
        ignoreExistingAssetsToggle.checked = result.output.IGNORE_EXISTING_ASSETS === true;
        previewOpen = false;
    }
};

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Was an empty function in the beta, so the "show file data" button did nothing.
// The channel and its handler both existed; only this was missing.
const openFileData = async () => {
    await window.user_config.openFileData();
};

const excelWorkbook = async (previous_data = null) => {
    const brief = previous_data ? previous_data : await window.autobuilds.getExcel();
    if (brief) {
        document.getElementById("excelSelected").className = "visible";
        selectedExcelPath = brief.excel;
        document.getElementById("excelPath").textContent = brief.excel;
        document.getElementById("excelName").textContent = await window._path._basename(brief.excel);
        document.getElementById("expand-excelPath").classList.add("selected");
        updateProcessButton();

        // Show sheet selection
        clearSheetSelection();
        displaySheetSelection(brief.sheets);
        document.getElementById("sheetSelection").classList.remove("collapsed");
        document.getElementById("sheetSelection").classList.add("expanded");
        document.getElementById("toggle_check").classList.remove("hidden");
        document.getElementById("sheetListPanel").classList.add("is-open");
    }
};

const checkboxList = document.getElementById("sheet-list");
const checkBetweenBtn = document.getElementById("check-between-btn");

function clearSheetSelection() {
    checkboxList.innerHTML = "";
}
function displaySheetSelection(sheets) {
    // This function is called whenever any checkbox changes state.
    function handleCheckboxChange() {
        // Filter the NodeList to get an array of only the checked checkboxes.
        currentlyChecked = Array.from(allCheckboxes).filter((cb) => cb.checked);

        // If exactly two checkboxes are checked, show the button. Otherwise, hide it.
        if (currentlyChecked.length === 2) {
            checkBetweenBtn.classList.remove("hidden");
        } else {
            checkBetweenBtn.classList.add("hidden");
        }
        updateSelectedSheets();
    }

    // --- 1. Dynamically create the list of checkboxes ---
    // This simulates a list of items coming from a database or API.

    let i = 1;

    sheets.forEach((sheet) => {
        const test_sheet = document.createElement("div");
        test_sheet.classList.add("margin-bottom");
        test_sheet.classList.add("sheet-item");
        test_sheet.id = `${sheet}`;
        test_sheet.innerHTML = `
                            <input type="checkbox" class="check-btn" id="sheet-${sheet}" autocomplete="off" data-index="${i - 1}" value="${sheet}"><label class="check-btn-label" for="sheet-${sheet}">${sheet}</label>`;
        checkboxList.appendChild(test_sheet);
        i++;
    });

    // --- 2. Set up event listeners and state tracking ---
    const allCheckboxes = document.getElementsByClassName("check-btn");
    let currentlyChecked = [];

    // Attach the event listener to every checkbox.
    for (let k = 0; k < allCheckboxes.length; k++) {
        allCheckboxes[k].addEventListener("change", handleCheckboxChange);
    }
    //allCheckboxes.forEach(checkbox => {
    //    checkbox.addEventListener('change', handleCheckboxChange);
    //});

    // --- 3. Implement the "Check In Between" button logic ---
    checkBetweenBtn.addEventListener("click", () => {
        // Safety check: ensure there are exactly two boxes checked before proceeding.
        if (currentlyChecked.length !== 2) return;

        // Get the data-index attributes we stored earlier.
        const index1 = parseInt(currentlyChecked[0].dataset.index, 10);
        const index2 = parseInt(currentlyChecked[1].dataset.index, 10);

        // Determine the start and end points for our selection, regardless of checking order.
        const startIndex = Math.min(index1, index2);
        const endIndex = Math.max(index1, index2);

        // Loop through all checkboxes from the one after the start index
        // up to the one before the end index.
        for (let i = startIndex + 1; i < endIndex; i++) {
            allCheckboxes[i].checked = true;
        }

        // After the action is complete, hide the button again and update the state.
        handleCheckboxChange();
    });
}

function updateSelectedSheets() {
    selectedSheets = [];
    const checkboxes = document.querySelectorAll('#sheet-list input[type="checkbox"]:checked');
    checkboxes.forEach((cb) => selectedSheets.push(cb.value));
}

function updateProcessButton() {
    const processBtn = document.getElementById("processBtn");
    processBtn.disabled = !selectedExcelPath || !selectedOutputPath;
}

const outputFolder = async (previous_data = null) => {
    if (previous_data) output = previous_data;
    else output = await window.autobuilds.outputPath();
    document.getElementById("outputSelected").className = "visible";
    if (output) {
        selectedOutputPath = output;
        document.getElementById("outputPath").textContent = output;
        document.getElementById("folderName").textContent = await window._path._foldername(output);
        document.getElementById("expand-outputPath").classList.add("selected");

        document.getElementById("outputPath").textContent = output;

        updateProcessButton();
    }
};

window.electronAPI.onImageDownloadProgress((done, total) => {
    showStatus(`Downloading images... ${done} of ${total}`, "processing");
});

/*
    The beta waited a fixed three seconds and then offered the folder, whether or
    not anything had been downloaded -- and in fact nothing ever was, because the
    channel had no handler. It now waits for the real result and says what
    happened.
*/
document.getElementById("downloadImages").addEventListener("click", async () => {
    const button = document.getElementById("downloadImages");
    updateSelectedSheets();

    if (selectedSheets.length === 0) {
        showStatus("Select at least one sheet first", "error");
        return;
    }

    button.disabled = true;
    showStatus('Looking up product images... <span class="spinner"></span>', "processing");

    try {
        const result = await window.autobuilds.downloadImages(selectedSheets);
        images_folder = result.path;

        if (result.failed && result.failed.length) {
            const detail = result.failed
                .slice(0, 5)
                .map((f) => `${f.ilc}: ${f.reason}`)
                .join("<br>");
            showStatus(`${result.message}<br>${detail}${result.failed.length > 5 ? "<br>..." : ""}`, "error");
        } else {
            showStatus(result.message, result.downloaded > 0 ? "success" : "error");
        }

        if (result.downloaded > 0) {
            document.getElementById("imageFolder").style.display = "flex";
        }
    } catch (error) {
        showStatus(`Error: ${error.message}`, "error");
    } finally {
        button.disabled = false;
    }
});
document.getElementById("imageFolderBtn").addEventListener("click", async () => {
    openFolder(images_folder);
});

let fetchFile = function (url) {
    return fetch(url).then((res) => res.blob());
};

let exportFile = function (file, name) {
    let a = document.createElement("a");
    a.download = name;
    a.href = URL.createObjectURL(file);
    a.click();
};

const createFile = async (selected_sheets_list) => {
    const result = await window.autobuilds.createHtmlFile(selected_sheets_list, {
        ignoreExistingAssets: ignoreExistingAssetsToggle.checked,
        useDevLibrary: useDevLibraryToggle.checked
    });
    if (result.message) console.log(result.message);
    if (result.restartToUpdate === true) showRestartNotice();
    return result.output;
};

document.getElementById("selectExcelBtn").addEventListener("click", async () => {
    excelWorkbook();
});

document.getElementById("reloadExcelBtn").addEventListener("click", async () => {
    reloadExcel();
});

const reloadExcel = async () => {
    const brief = await window.autobuilds.reloadExcel();
    if (brief) {
        selectedExcelPath = brief.excel;
        updateProcessButton();

        // Show sheet selection
        clearSheetSelection();
        displaySheetSelection(brief.sheets);
    }
};

document.getElementById("selectOutputBtn").addEventListener("click", async () => {
    outputFolder();
});

document.getElementById("mainForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!selectedExcelPath || !selectedOutputPath) {
        showStatus("Please select both Excel file and output folder", "error");
        return;
    }

    showStatus('Processing Excel file... <span class="spinner"></span>', "processing");
    document.getElementById("processBtn").disabled = true;

    updateSelectedSheets();

    if (selectedSheets.length === 0) {
        showStatus("Select at least one sheet to build", "error");
        document.getElementById("processBtn").disabled = false;
        return;
    }

    try {
        document.getElementById("loading").style.display = "flex";
        const startTime = performance.now();

        const result = await createFile(selectedSheets);
        create_files_result = result;

        if (result.success) {
            if (result.dev_files) {
                const count = result.dev_files.length;
                showStatus(`HTML files generated with the <strong>dev library</strong> &mdash; ${count} file${count === 1 ? "" : "s"} from lib-dev/.`, "success");
                console.log("Read from lib-dev/:", result.dev_files);
            } else {
                showStatus("HTML files generated successfully!", "success");
            }
            generatedFiles = result.files;

            displayGeneratedFiles(result.files);

            fileData.original_data = JSON.stringify(result.original_data, null, 2);
            fileData.new_data = JSON.stringify(result.new_data, null, 2);
            document.getElementById("showFileData").style.display = "flex";
            document.getElementById("reloadExcel").style.display = "flex";
        } else {
            showStatus(`Error: ${result.message}`, "error");
        }
        const endTime = performance.now();
        console.log(`Building emails took ${(endTime - startTime) / 1000} seconds`);
    } catch (error) {
        showStatus(`Error: ${error.message}`, "error");
    } finally {
        document.getElementById("processBtn").disabled = false;
        document.getElementById("loading").style.display = "none";
    }

    if (previewOpen) {
        previewFile();
    }
});

function showStatus(message, type) {
    const statusDiv = document.getElementById("status");
    statusDiv.innerHTML = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = "block";
}

document.getElementById("openHtmlFolder").addEventListener("click", async () => {
    openFolder(selectedOutputPath);
});

function displayGeneratedFiles(data) {
    const outputFiles = document.getElementById("outputFiles");
    const fileList = document.getElementById("fileList");

    const generatedFiles = Object.keys(data);

    if (generatedFiles.length === 0) {
        return;
    }

    fileList.innerHTML = "";

    for (const file of generatedFiles) {
        const fileItem = document.createElement("div");
        fileItem.className = "file-item";
        fileItem.classList.add("hrz");
        fileItem.classList.add("py-2");

        fileItem.innerHTML = `
            <div class="file-name" style="white-space:nowrap;margin:auto 8px auto 0">${data[file].fileName}</div>
            <div class="file-actions" style="margin:8px 0;">
                <button class="preview-btn btn btn-sm btn-secondary" id="${data[file].fileName}" onclick="previewFile()">Preview</button>
            </div>
        `;

        fileList.appendChild(fileItem);
    }

    outputFiles.style.display = "block";
    outputFiles.classList.remove("invisible");
    outputFiles.classList.add("is-open");
    outputFiles.classList.add("visible");
}

function previewFile() {
    previewOpen = true;
    let index = 0;

    document.getElementById("sheet-list").classList.add("limitHeight");

    const filePreview = document.getElementById("filePreview");

    document.getElementById("settingsLayout").style.flexDirection = "column";
    filePreview.classList.remove("invisible");
    filePreview.classList.add("visible");

    let previewList = [];
    let i = 0;

    selectedSheets.forEach((sheet) => {
        previewList.push({ fileName: sheet, filePath: `${selectedOutputPath}/${sheet}.html` });
        //previewList.push(create_files_result.files[sheet]);
        i++;
    });
    displayFile(previewList, index);

    document.getElementById("sheetName").textContent = previewList[index].fileName;

    document.getElementById("first").addEventListener("click", () => {
        index = 0;
        displayFile(previewList, index);
        document.getElementById("sheetName").textContent = previewList[index].fileName;
    });
    document.getElementById("last").addEventListener("click", () => {
        index = previewList.length - 1;
        displayFile(previewList, index);
        document.getElementById("sheetName").textContent = previewList[index].fileName;
    });

    document.getElementById("previous").addEventListener("click", () => {
        index--;
        if (index < 0) {
            index = 0;
        }
        displayFile(previewList, index);
        document.getElementById("sheetName").textContent = previewList[index].fileName;
    });
    document.getElementById("next").addEventListener("click", () => {
        index++;
        if (index > previewList.length - 1) {
            index = previewList.length - 1;
        }
        displayFile(previewList, index);
        document.getElementById("sheetName").textContent = previewList[index].fileName;
    });
}
function displayFile(previewList, index) {
    console.log(`Displaying file : ${previewList[index].fileName}`);
    document.getElementById("html-preview-frame").src = previewList[index].filePath;
    document.getElementById("html-preview-frame-mob").src = previewList[index].filePath;
    return;
}

async function openFolder(filePath) {
    const result = await window.autobuilds.openFolder(filePath);
}
