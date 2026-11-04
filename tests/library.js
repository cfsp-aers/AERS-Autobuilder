/*
    The library smoke test: does the real library still build?

    The snapshot suites build against the test library, external/lib-test/, so
    editing external/lib/ cannot move a baseline. That leaves the real library
    with no check at all unless something builds it, and a broken module must
    still stop a publish. This is that something. It asks whether the library
    builds, never what it produces:

      - every golden case's brief and sheet builds against lib/ and writes all
        four stores and the HTML (build-case.js --library real, one child
        process per case, as golden.js does)
      - every module definition in lib/ can be required, and its
        internal_layout() returns a node tree for every variant the layout
        snapshots use, without throwing

    It compares nothing to a baseline, so there is nothing to accept: a failure
    means a real brief would fail to build. A module that only looks different
    passes. See docs/adr/0011-snapshots-build-against-a-test-library.md.

    The golden briefs name real module types, so retiring a type one of them
    uses means updating the brief -- the same edit a designer's brief would
    need.

        node tests/library.js
*/

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { VARIANTS, current_for, content_for, definition_files } = require("./layouts/fixtures.js");

const repo_root = path.resolve(__dirname, "..");
const golden_root = path.join(__dirname, "golden");
const { user_files } = require(path.join(repo_root, "external/src/main/constants.js"));

const results = [];

function check(name, fn) {
    try {
        fn();
        results.push({ name: name, ok: true });
    } catch (error) {
        results.push({ name: name, ok: false, reason: error.message });
    }
}

// ------------------------------------------------------------------- builds

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "ab-library-"));
const cases = JSON.parse(fs.readFileSync(path.join(golden_root, "cases.json"), { encoding: "utf8" }));

/*
    The same scratch layout golden.js builds a case in: the brief copied in, so
    the "AERS files" folder the engine writes beside it lands in scratch, and
    the case written down as REQUIRED_DATA.json for build-case.js to read.
*/
function build(test_case) {
    const workdir = path.join(scratch, test_case.id);
    fs.mkdirSync(workdir, { recursive: true });

    const brief = path.join(workdir, test_case.brief);
    fs.copyFileSync(path.join(golden_root, "briefs", test_case.brief), brief);

    fs.writeFileSync(
        path.join(workdir, "REQUIRED_DATA.json"),
        JSON.stringify({ BRIEF_PARENT_FOLDER: workdir, BRIEF_LOCATION: brief, OUTPUT_LOCATION: workdir, SELECTED_SHEETS: [test_case.sheet], ALL_SHEETS: "" })
    );

    const run = spawnSync(process.execPath, [path.join(golden_root, "build-case.js"), workdir, "--library", "real"], { cwd: repo_root, encoding: "utf8" });

    if (run.status !== 0) {
        const stderr = (run.stderr || "").split("\n").filter((line) => line.trim()).slice(0, 8).join("\n        ");
        throw new Error(stderr || `build exited ${run.status}`);
    }
}

cases.forEach((test_case) => {
    check(`builds: ${test_case.id} (${test_case.brief}, ${test_case.sheet})`, () => build(test_case));
});

// ------------------------------------------------------------------ layouts

const modules_root = path.join(user_files, "modules");

definition_files(modules_root).forEach((file) => {
    const id = path.relative(modules_root, file);

    let definition;
    try {
        definition = require(file);
    } catch (error) {
        results.push({ name: `lays out: ${id}`, ok: false, reason: `could not be required: ${error.message}` });
        return;
    }

    // The same set the layout snapshots cover: a definition with no layout of its own has nothing to call.
    if (typeof definition.internal_layout !== "function") return;

    check(`lays out: ${id}`, () => {
        Object.keys(VARIANTS).forEach((variant) => {
            let tree;
            try {
                tree = definition.internal_layout(current_for(variant), content_for(definition.component_positions));
            } catch (error) {
                throw new Error(`${variant}: threw ${error.message}`);
            }
            if (tree === null || (typeof tree !== "object" && typeof tree !== "string")) throw new Error(`${variant}: returned ${JSON.stringify(tree)}, not a node tree`);
        });
    });
});

// ------------------------------------------------------------------- report

fs.rmSync(scratch, { recursive: true, force: true });

console.log(`\nChecking that the real library builds: ${results.length} cases\n`);
results.forEach((result) => {
    console.log(`  ${result.ok ? "ok  " : "FAIL"}  ${result.name}`);
    if (!result.ok) console.log(`        ${result.reason}`);
});

const failures = results.filter((result) => !result.ok);
console.log(`\n${"=".repeat(72)}\n${results.length - failures.length}/${results.length} passing`);
process.exit(failures.length ? 1 : 0);
