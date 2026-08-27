/*
    Builds one golden case and collects its artifacts.

    Runs as a child process, one per case. That is deliberate: constants.js
    resolves REQUIRED_DATA at require time and ~44 files destructure it at
    require time in turn, so two cases in one process would fight over the
    module cache. A fresh process per case sidesteps the whole question, and
    costs about a second.

    Usage: node build-case.js <workdir>

    <workdir> must already contain REQUIRED_DATA.json and a copy of the brief.
    Artifacts land in <workdir>/artifacts.
*/

const fs = require("node:fs");
const path = require("node:path");

const workdir = process.argv[2];
if (!workdir) {
    console.error("build-case.js: no workdir given");
    process.exit(2);
}

const repo_root = path.resolve(__dirname, "../..");
const database = path.join(repo_root, "src/database");
const artifacts = path.join(workdir, "artifacts");

const required_data = JSON.parse(fs.readFileSync(path.join(workdir, "REQUIRED_DATA.json"), { encoding: "utf8" }));
const sheet = required_data.SELECTED_SHEETS[0];

// constants.js reads this instead of src/REQUIRED_DATA.json, so a test run
// leaves the user's last real build untouched.
process.env.AB_REQUIRED_DATA_PATH = path.join(workdir, "REQUIRED_DATA.json");

fs.mkdirSync(artifacts, { recursive: true });

// src/database holds the engine's data stores and is gitignored, so it is
// absent from a fresh checkout and the first build would fail writing into it.
fs.mkdirSync(database, { recursive: true });

let result;
try {
    const { buildEmails } = require(path.join(repo_root, "src/main/main.js"));
    result = buildEmails();
} catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
}

if (!result || result.success !== true) {
    console.error(`build reported failure: ${result ? result.message : "no result"}`);
    process.exit(1);
}

// The four intermediate stores. Snapshotting these -- not only the HTML -- is
// what makes a palette change show up as one altered hex value instead of a
// wall of re-flowed markup.
const STORES = ["module_store.json", "entity_store.json", "component_store.json", "email_json.json"];

STORES.forEach((name) => {
    const source = path.join(database, name);
    if (!fs.existsSync(source)) {
        console.error(`engine did not write ${name}`);
        process.exit(1);
    }
    fs.copyFileSync(source, path.join(artifacts, name));
});

const html = path.join(required_data.OUTPUT_LOCATION, `${sheet}.html`);
if (!fs.existsSync(html)) {
    console.error(`engine did not write ${sheet}.html`);
    process.exit(1);
}
fs.copyFileSync(html, path.join(artifacts, "email.html"));

process.exit(0);
