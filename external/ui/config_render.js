const setRulesLocation = async () => {
    const rulesLocation = await window.user_config.setRules();
    document.getElementById("rulesLocation").textContent = rulesLocation;
};
const setModuleTemplates = async () => {
    const modulesLocation = await window.user_config.setModuleTemplates();
    document.getElementById("moduleTemplatesLocation").textContent = modulesLocation;
};
const confirmSettings = async () => {
    const user_settings = await window.user_config.confirmSettings();
};

document.getElementById("setRulesLocation").addEventListener("click", async () => {
    setRulesLocation();
});

document.getElementById("setModuleTemplates").addEventListener("click", async () => {
    setModuleTemplates();
});

document.getElementById("confirmUserSettings").addEventListener("click", async () => {
    confirmSettings();
});
