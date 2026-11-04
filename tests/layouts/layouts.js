/*
    Snapshots of every module's internal_layout.

    The golden tests build whole sheets, which means they only cover the module
    types a golden brief happens to use -- twelve of the nineteen. The other
    seven have no coverage at all, and phase 3 rewrites all nineteen.

    So this test calls internal_layout(current, content) directly, once per
    branch a module can take, and snapshots the node tree it returns. It is
    narrower than the golden tests and that is the point: it isolates exactly
    the thing the layout refactor changes, and it reaches modules no brief in
    the repository exercises.

        node tests/layouts/layouts.js              check every module
        node tests/layouts/layouts.js --accept     record current output
        node tests/layouts/layouts.js --module "basic/banner.js"

    A diff here is a change to a module's structure. During the constructor
    refactor there should be none: the whole claim is that the constructors
    emit the same nodes the hand-written object literals did, key order
    included, because email_json.json is compared byte for byte.

    That refactor is done. The definitions now come from the test library,
    external/lib-test/, so editing a real module in external/lib/ cannot move a
    snapshot here. What can is the engine -- the constructors in
    systems/layout.js above all -- or a deliberate edit to lib-test/, and any
    difference is CHANGED. expected/inputs.json records which of the two a
    snapshot was taken against, so a failure can say which one moved.

    Whether the real modules still lay out without throwing is
    tests/library.js's job. See
    docs/adr/0011-snapshots-build-against-a-test-library.md.
*/

const fs = require("node:fs");
const path = require("node:path");

const inputs = require("../inputs.js");
const { VARIANTS, current_for, content_for, definition_files } = require("./fixtures.js");

const here = __dirname;
const repo_root = path.resolve(here, "../..");

/*
    The definitions come from the test library, and so does everything they read
    through the engine -- the component rule files component() fills a declared
    component from. Set before the first definition is required, so nothing here
    reads lib/. See test-library-plan.md.
*/
const { lib_test } = require(path.join(repo_root, "external/src/main/constants.js"));
require(path.join(repo_root, "external/src/main/build_config.js")).useBaseLibrary(lib_test);

const modules_root = path.join(lib_test, "modules");
const expected_root = path.join(here, "expected");
const manifest_file = path.join(expected_root, "inputs.json");

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2);
const accept = argv.includes("--accept");

let only = null;
const module_flag = argv.indexOf("--module");
if (module_flag !== -1) {
    if (!argv[module_flag + 1]) {
        console.error("layouts: --module needs a module path");
        process.exit(2);
    }
    only = argv[module_flag + 1];
}

// ------------------------------------------------------------------ modules

const modules = definition_files(modules_root)
    .map((file) => ({ id: path.relative(modules_root, file), file: file }))
    .filter((entry) => {
        const definition = require(entry.file);
        entry.definition = definition;
        return typeof definition.internal_layout === "function";
    })
    .filter((entry) => !only || entry.id === only);

if (only && modules.length === 0) {
    console.error(`layouts: no module named "${only}" exports an internal_layout`);
    process.exit(2);
}

// --------------------------------------------------------------------- diff

const MAX_DIFFS = 25;

function diffJson(expected, actual, prefix, out) {
    if (out.length >= MAX_DIFFS) return out;

    const both_objects = expected !== null && actual !== null && typeof expected === "object" && typeof actual === "object" && Array.isArray(expected) === Array.isArray(actual);

    if (!both_objects) {
        if (JSON.stringify(expected) !== JSON.stringify(actual)) {
            out.push(`${prefix || "(root)"}\n      expected: ${brief_value(expected)}\n      actual:   ${brief_value(actual)}`);
        }
        return out;
    }

    const keys = Array.from(new Set(Object.keys(expected).concat(Object.keys(actual))));
    for (const key of keys) {
        if (out.length >= MAX_DIFFS) break;
        const child = Array.isArray(expected) ? `${prefix}[${key}]` : prefix ? `${prefix}.${key}` : key;
        if (!(key in expected)) out.push(`${child}\n      added:    ${brief_value(actual[key])}`);
        else if (!(key in actual)) out.push(`${child}\n      removed:  ${brief_value(expected[key])}`);
        else diffJson(expected[key], actual[key], child, out);
    }
    return out;
}

function brief_value(value) {
    const text = JSON.stringify(value);
    if (text === undefined) return "undefined";
    return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

// -------------------------------------------------------------------- driver

function snapshot(entry) {
    const shapes = {};
    Object.keys(VARIANTS).forEach((variant) => {
        shapes[variant] = entry.definition.internal_layout(current_for(variant), content_for(entry.definition.component_positions));
    });
    return `${JSON.stringify(shapes, null, 2)}\n`;
}

function expected_path(id) {
    return path.join(expected_root, `${id.replace(/\.js$/, "")}.json`);
}

console.log(`\n${accept ? "Recording" : "Checking"} ${modules.length} module${modules.length === 1 ? "" : "s"}\n`);

const manifest = inputs.readManifest(manifest_file);
const results = [];

modules.forEach((entry) => {
    process.stdout.write(`  ${entry.id.padEnd(36)}`);

    let actual;
    try {
        actual = snapshot(entry);
    } catch (error) {
        console.log("THREW");
        results.push({ id: entry.id, ok: false, kind: "threw", detail: error.stack || error.message });
        return;
    }

    const target = expected_path(entry.id);
    const current = inputs.fingerprint(repo_root);

    if (accept) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, actual, { encoding: "utf8" });
        manifest[entry.id] = current;
        console.log("recorded");
        results.push({ id: entry.id, ok: true });
        return;
    }

    if (!fs.existsSync(target)) {
        console.log("NO BASELINE");
        results.push({ id: entry.id, ok: false, kind: "no-baseline" });
        return;
    }

    const expected = fs.readFileSync(target, { encoding: "utf8" });

    if (expected === actual) {
        console.log("ok");
        results.push({ id: entry.id, ok: true });
        return;
    }

    const diffs = diffJson(JSON.parse(expected), JSON.parse(actual), "", []);

    // Identical parsed content, different bytes. See ADR 0006.
    if (diffs.length === 0) {
        console.log("ok (formatting)");
        results.push({ id: entry.id, ok: true, formatting: true });
        return;
    }

    const owners = inputs.makeAttributor(new Map())(JSON.parse(expected), JSON.parse(actual));

    console.log("CHANGED");
    results.push({ id: entry.id, ok: false, kind: "changed", diffs: diffs, owners: owners, moved: inputs.moved(manifest[entry.id], current) });
});

if (accept) inputs.writeManifest(manifest_file, manifest);

const failures = results.filter((result) => !result.ok);
const reformatted = results.filter((result) => result.formatting);

failures.forEach((failure) => {
    console.log(`\n${"-".repeat(72)}\n${failure.id}\n${"-".repeat(72)}`);
    if (failure.kind === "threw") {
        console.log(failure.detail);
    } else if (failure.kind === "no-baseline") {
        console.log(`  nothing recorded yet. run: node tests/layouts/layouts.js --accept`);
    } else {
        console.log(`  moved since the baseline: ${failure.moved}\n`);
        inputs.tally(failure.owners).forEach(([owner, n]) => console.log(`  ${String(n).padStart(5)}  ${owner}`));
        console.log("");
        failure.diffs.forEach((diff) => console.log(`  ${diff}`));
    }
});

console.log(`\n${"=".repeat(72)}`);
console.log(`${results.length - failures.length}/${results.length} ${accept ? "recorded" : "passing"}`);

if (reformatted.length) {
    console.log(`${reformatted.length} module${reformatted.length === 1 ? "" : "s"} differ in key order or whitespace only -- content matches`);
}

if (failures.some((failure) => failure.kind === "changed")) {
    console.log(`if every difference above is intended, record them: npm run test:accept`);
}

console.log("");

process.exit(failures.length ? 1 : 0);
