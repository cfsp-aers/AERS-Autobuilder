const displayFileData = async () => {
    const file_data = await window.user_config.getFileData();

    document.getElementById("original-data").innerText = JSON.stringify(file_data.original_data, null, "‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ");
    document.getElementById("updated-data").innerText = JSON.stringify(file_data.new_data, null, "‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ");
};

document.addEventListener("DOMContentLoaded", (event) => {
    displayFileData();
});
