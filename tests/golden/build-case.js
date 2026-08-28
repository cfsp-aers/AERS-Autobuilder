/*
    Builds one golden case and collects its artifacts.

    Runs as a child process, one per case.

    Originally that was forced: constants.js read REQUIRED_DATA at require time
    and every importer destructured it at require time in turn, so two cases in
    one process fought over the module cache. buildEmails() taking its
    configuration as an argument removed that constraint.

    It stays because the isolation is still worth its second: the engine loads
    the module library and rule files into module-level state, and a case that
    dies part way through cannot leave that state behind for the next one. If
    these ever get slow enough to matter, running them in-process is now a real
    option -- it was not before.

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
const database = path.join(workdir, "database");
const artifacts = path.join(workdir, "artifacts");

const required_data = JSON.parse(fs.readFileSync(path.join(workdir, "REQUIRED_DATA.json"), { encoding: "utf8" }));
const sheet = required_data.SELECTED_SHEETS[0];

fs.mkdirSync(artifacts, { recursive: true });

/*
    The same object the app passes, built from the case's own REQUIRED_DATA.json.
    databaseLocation keeps the data stores inside the scratch directory, so a
    test run leaves the user's last real build untouched.

    REQUIRED_DATA.json is the case fixture format, not something the engine reads
    any more -- it predates buildEmails() taking its configuration as an argument
    and is kept because it is a readable way to write a case down.
*/
let result;
try {
    const { buildEmails } = require(path.join(repo_root, "external/src/main/main.js"));
    result = buildEmails({
        briefLocation: required_data.BRIEF_LOCATION,
        briefParentFolder: required_data.BRIEF_PARENT_FOLDER,
        outputLocation: required_data.OUTPUT_LOCATION,
        selectedSheets: required_data.SELECTED_SHEETS,
        databaseLocation: database
    });
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
