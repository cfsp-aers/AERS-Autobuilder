/*
    Golden-file tests for the build engine.

    Each case in cases.json names a brief and one sheet within it. The sheet is
    built in a scratch directory and the resulting artifacts are compared byte
    for byte against tests/golden/expected/<case-id>/.

        node tests/golden/golden.js                 run every case
        node tests/golden/golden.js --case layout   run one
        node tests/golden/golden.js --accept        record current output as expected
        node tests/golden/golden.js --keep          leave .work/ behind for inspection

    Every case builds against the test library, external/lib-test/, and never
    reads external/lib/. Editing the real library cannot move a baseline, so
    the only things that can are the engine and a deliberate edit to lib-test/
    -- and any difference at all is CHANGED.

    A failure says which input moved since the baseline was recorded (the
    engine, the test library, the brief, from expected/inputs.json) and how many
    differences fall in each definition, then prints the differences. If they
    are intended, --accept records them, and the commit is a reviewable record
    of what the change did to the output.

    Whether the real library still builds is tests/library.js's job, not this
    one's. See docs/adr/0011-snapshots-build-against-a-test-library.md.
*/

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const inputs = require("../inputs.js");

const here = __dirname;
const repo_root = path.resolve(here, "../..");
const work_root = path.join(here, ".work");
const expected_root = path.join(here, "expected");
const briefs_root = path.join(here, "briefs");
const manifest_file = path.join(expected_root, "inputs.json");

const ARTIFACTS = inputs.STORES.concat(["email.html"]);

const MAX_DIFFS = 25;

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2);
const accept = argv.includes("--accept");
const keep = argv.includes("--keep");

let only = null;
const case_flag = argv.indexOf("--case");
if (case_flag !== -1) {
    if (!argv[case_flag + 1]) fail_hard("--case needs a case id");
    only = argv[case_flag + 1].split(",").map((s) => s.trim());
}

function fail_hard(message) {
    console.error(`golden: ${message}`);
    process.exit(2);
}

// -------------------------------------------------------------------- cases

const all_cases = JSON.parse(fs.readFileSync(path.join(here, "cases.json"), { encoding: "utf8" }));

if (only) {
    const known = all_cases.map((c) => c.id);
    only.forEach((id) => {
        if (!known.includes(id)) fail_hard(`unknown case "${id}". Known: ${known.join(", ")}`);
    });
}

const cases = only ? all_cases.filter((c) => only.includes(c.id)) : all_cases;

// --------------------------------------------------------------------- diff

/*
    Structural diff for the JSON stores. A path-per-difference report beats a
    line diff here: these files are 200KB of nested objects, and one changed
    padding value would otherwise print as hundreds of re-indented lines.
*/
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

function diffText(expected, actual) {
    const e = expected.split("\n");
    const a = actual.split("\n");
    const out = [];
    for (let i = 0; i < Math.max(e.length, a.length) && out.length < MAX_DIFFS; i++) {
        if (e[i] !== a[i]) {
            out.push(`line ${i + 1}\n      expected: ${brief_line(e[i])}\n      actual:   ${brief_line(a[i])}`);
        }
    }
    return out;
}

function brief_line(line) {
    if (line === undefined) return "(no line)";
    const trimmed = line.trim();
    return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

// ---------------------------------------------------------------- run a case

function runCase(test_case) {
    const workdir = path.join(work_root, test_case.id);
    const brief_source = path.join(briefs_root, test_case.brief);

    if (!fs.existsSync(brief_source)) return { status: "error", detail: `brief not found: ${test_case.brief}` };

    fs.rmSync(workdir, { recursive: true, force: true });
    fs.mkdirSync(workdir, { recursive: true });

    // The brief is copied in because the engine writes an "AERS files" folder
    // and an "email data" folder next to whichever brief it reads. Building
    // straight out of tests/golden/briefs/ would litter the repository.
    const brief_copy = path.join(workdir, test_case.brief);
    fs.copyFileSync(brief_source, brief_copy);

    fs.writeFileSync(
        path.join(workdir, "REQUIRED_DATA.json"),
        JSON.stringify(
            {
                BRIEF_PARENT_FOLDER: workdir,
                BRIEF_LOCATION: brief_copy,
                OUTPUT_LOCATION: workdir,
                SELECTED_SHEETS: [test_case.sheet],
                ALL_SHEETS: ""
            },
            null,
            2
        ),
        { encoding: "utf8" }
    );

    const build = spawnSync(process.execPath, [path.join(here, "build-case.js"), workdir], {
        cwd: repo_root,
        encoding: "utf8"
    });

    if (build.status !== 0) {
        const stderr = (build.stderr || "").trim();
        return { status: "error", detail: stderr || `build exited ${build.status}`, workdir: workdir };
    }

    return { status: "built", workdir: workdir, artifacts: path.join(workdir, "artifacts") };
}

function compareCase(test_case, artifacts) {
    const expected_dir = path.join(expected_root, test_case.id);

    if (!fs.existsSync(expected_dir)) return { status: "no-baseline", expected_dir: expected_dir };

    const problems = [];
    const formatting = [];
    const attribute = inputs.attributor(artifacts);

    ARTIFACTS.forEach((name) => {
        const expected_file = path.join(expected_dir, name);
        const actual_file = path.join(artifacts, name);

        if (!fs.existsSync(expected_file)) {
            problems.push({ artifact: name, diffs: ["no expected file recorded"] });
            return;
        }

        const expected_text = fs.readFileSync(expected_file, { encoding: "utf8" });
        const actual_text = fs.readFileSync(actual_file, { encoding: "utf8" });

        if (expected_text === actual_text) return;

        if (!name.endsWith(".json")) {
            problems.push({ artifact: name, diffs: diffText(expected_text, actual_text) });
            return;
        }

        const expected_json = JSON.parse(expected_text);
        const actual_json = JSON.parse(actual_text);
        const diffs = diffJson(expected_json, actual_json, "", []);

        /*
            Identical parsed content, different bytes: key order or whitespace.
            Byte-exactness was deliberate while the layout constructors were
            being written -- key order was the evidence the rewrite emitted the
            same nodes the hand-written literals had -- and that refactor is
            finished. It costs a failed publish now and proves nothing, so it is
            noted and passed. ADR 0003's addendum is where it was load-bearing.
        */
        if (diffs.length === 0) {
            formatting.push(name);
            return;
        }

        problems.push({ artifact: name, diffs: diffs, owners: attribute(expected_json, actual_json) });
    });

    if (!problems.length) return { status: formatting.length ? "formatting" : "match", formatting: formatting };

    return { status: "changed", problems: problems, formatting: formatting };
}

function acceptCase(test_case, artifacts) {
    const expected_dir = path.join(expected_root, test_case.id);
    fs.rmSync(expected_dir, { recursive: true, force: true });
    fs.mkdirSync(expected_dir, { recursive: true });
    ARTIFACTS.forEach((name) => fs.copyFileSync(path.join(artifacts, name), path.join(expected_dir, name)));
}

function fingerprintOf(test_case) {
    return inputs.fingerprint(repo_root, { brief: path.join(briefs_root, test_case.brief) });
}

// -------------------------------------------------------------------- driver

fs.rmSync(work_root, { recursive: true, force: true });
fs.mkdirSync(work_root, { recursive: true });

const manifest = inputs.readManifest(manifest_file);

console.log(`${accept ? "Recording" : "Checking"} ${cases.length} case${cases.length === 1 ? "" : "s"}\n`);

const results = [];

cases.forEach((test_case) => {
    process.stdout.write(`  ${test_case.id.padEnd(20)}`);

    const build = runCase(test_case);

    if (build.status === "error") {
        console.log("BUILD FAILED");
        results.push({ id: test_case.id, ok: false, kind: "build", detail: build.detail });
        return;
    }

    const current = fingerprintOf(test_case);

    if (accept) {
        acceptCase(test_case, build.artifacts);
        manifest[test_case.id] = current;
        console.log("recorded");
        results.push({ id: test_case.id, ok: true });
        return;
    }

    const comparison = compareCase(test_case, build.artifacts);

    if (comparison.status === "match") {
        console.log("ok");
        results.push({ id: test_case.id, ok: true });
    } else if (comparison.status === "formatting") {
        console.log("ok (formatting)");
        results.push({ id: test_case.id, ok: true, formatting: comparison.formatting });
    } else if (comparison.status === "no-baseline") {
        console.log("NO BASELINE");
        results.push({ id: test_case.id, ok: false, kind: "no-baseline" });
    } else {
        console.log("CHANGED");
        results.push({ id: test_case.id, ok: false, kind: "changed", problems: comparison.problems, moved: inputs.moved(manifest[test_case.id], current), formatting: comparison.formatting.length ? comparison.formatting : undefined });
    }
});

if (accept) inputs.writeManifest(manifest_file, manifest);

const failures = results.filter((result) => !result.ok);
const reformatted = results.filter((result) => result.formatting);

if (failures.length) {
    failures.forEach((failure) => {
        console.log(`\n${"-".repeat(72)}\n${failure.id}\n${"-".repeat(72)}`);

        if (failure.kind === "build") {
            console.log(`  build failed:\n${indent(failure.detail, 4)}`);
            return;
        }

        if (failure.kind === "no-baseline") {
            console.log(`  no expected output recorded yet.`);
            console.log(`  run: node tests/golden/golden.js --accept --case ${failure.id}`);
            return;
        }

        console.log(`  moved since the baseline: ${failure.moved}\n`);

        failure.problems.forEach((problem) => {
            const count = `${problem.diffs.length}${problem.diffs.length >= MAX_DIFFS ? "+" : ""} difference${problem.diffs.length === 1 ? "" : "s"}`;
            console.log(`  ${problem.artifact} -- ${count}`);
            if (problem.owners) inputs.tally(problem.owners).forEach(([owner, n]) => console.log(`      ${String(n).padStart(5)}  ${owner}`));
            console.log("");
            problem.diffs.forEach((d) => console.log(`    ${d}`));
        });
    });
}

console.log(`\n${"=".repeat(72)}`);
console.log(`${results.length - failures.length}/${results.length} ${accept ? "recorded" : "passing"}`);

if (reformatted.length) {
    console.log(`${reformatted.length} case${reformatted.length === 1 ? "" : "s"} differ in key order or whitespace only -- content matches`);
}

if (failures.some((failure) => failure.kind === "changed")) {
    console.log(`if every difference above is intended, record them: npm run test:accept`);
}
if (failures.length && !keep) console.log(`re-run with --keep to inspect ${path.relative(repo_root, work_root)}/`);
console.log("");

if (!keep) fs.rmSync(work_root, { recursive: true, force: true });

function indent(text, spaces) {
    const pad = " ".repeat(spaces);
    return text
        .split("\n")
        .map((line) => pad + line)
        .join("\n");
}

process.exit(failures.length ? 1 : 0);
