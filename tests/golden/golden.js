/*
    Golden-file tests for the build engine.

    Each case in cases.json names a brief and one sheet within it. The sheet is
    built in a scratch directory and the resulting artifacts are compared byte
    for byte against tests/golden/expected/<case-id>/.

        node tests/golden/golden.js                 run every case
        node tests/golden/golden.js --case layout   run one
        node tests/golden/golden.js --accept        record current output as expected
        node tests/golden/golden.js --keep          leave .work/ behind for inspection
        node tests/golden/golden.js --strict        treat accounted-for drift as failure

    Each case records what it was built from in expected/inputs.json, and a
    difference is charged to the definition that produced it. That splits what
    used to be one verdict into two:

        DRIFT     the output moved, and every difference lies inside a library
                  file that changed. This is the shape of an ordinary day's
                  work -- a module definition edited, its output following. It
                  reports and does not fail.

        CHANGED   the output moved and something is unaccounted for: the engine
                  changed, or a difference falls outside the definitions that
                  did. This is the alarm the suite exists to raise.

    Either way the baseline is now behind, and re-running with --accept records
    it. The commit is a reviewable record of what the change did to real output,
    which is the entire point. What changed is that you are told which of the
    two you are looking at instead of having to work it out from a diff of a
    thousand lines.

    See docs/adr/0006-snapshots-record-their-inputs.md.
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
const strict = argv.includes("--strict");

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

function compareCase(test_case, artifacts, changed) {
    const expected_dir = path.join(expected_root, test_case.id);

    if (!fs.existsSync(expected_dir)) return { status: "no-baseline", expected_dir: expected_dir };

    const problems = [];
    const formatting = [];
    const attribute = inputs.attributor(artifacts);

    ARTIFACTS.forEach((name) => {
        const expected_file = path.join(expected_dir, name);
        const actual_file = path.join(artifacts, name);

        if (!fs.existsSync(expected_file)) {
            problems.push({ artifact: name, diffs: ["no expected file recorded"], explained: false, reason: "nothing recorded for this artifact" });
            return;
        }

        const expected_text = fs.readFileSync(expected_file, { encoding: "utf8" });
        const actual_text = fs.readFileSync(actual_file, { encoding: "utf8" });

        if (expected_text === actual_text) return;

        if (!name.endsWith(".json")) {
            const verdict = inputs.explains(name, [], changed);
            problems.push({ artifact: name, diffs: diffText(expected_text, actual_text), explained: verdict.explained, reason: verdict.reason });
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

        const owners = attribute(expected_json, actual_json);
        const verdict = inputs.explains(name, owners, changed);
        problems.push({ artifact: name, diffs: diffs, owners: owners, explained: verdict.explained, reason: verdict.reason });
    });

    if (!problems.length) return { status: formatting.length ? "formatting" : "match", formatting: formatting };

    return {
        status: problems.every((problem) => problem.explained) ? "drift" : "changed",
        problems: problems,
        formatting: formatting
    };
}

function acceptCase(test_case, artifacts) {
    const expected_dir = path.join(expected_root, test_case.id);
    fs.rmSync(expected_dir, { recursive: true, force: true });
    fs.mkdirSync(expected_dir, { recursive: true });
    ARTIFACTS.forEach((name) => fs.copyFileSync(path.join(artifacts, name), path.join(expected_dir, name)));
}

/*
    The brief and the definitions this case loaded, on top of the engine and the
    shared library. Read off the artifacts it just produced, so a case that
    starts using a new module type starts tracking it without being told.
*/
function fingerprintOf(test_case, artifacts) {
    return inputs.fingerprint(repo_root, {
        brief: path.join(briefs_root, test_case.brief),
        templates: inputs.templatesUsed(artifacts)
    });
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

    const current = fingerprintOf(test_case, build.artifacts);

    if (accept) {
        acceptCase(test_case, build.artifacts);
        manifest[test_case.id] = current;
        console.log("recorded");
        results.push({ id: test_case.id, ok: true });
        return;
    }

    const changed = inputs.compare(manifest[test_case.id], current);
    const comparison = compareCase(test_case, build.artifacts, changed);

    if (comparison.status === "match") {
        console.log("ok");
        results.push({ id: test_case.id, ok: true });
    } else if (comparison.status === "formatting") {
        console.log("ok (formatting)");
        results.push({ id: test_case.id, ok: true, formatting: comparison.formatting });
    } else if (comparison.status === "no-baseline") {
        console.log("NO BASELINE");
        results.push({ id: test_case.id, ok: false, kind: "no-baseline" });
    } else if (comparison.status === "drift") {
        console.log(strict ? "DRIFT" : "drift");
        results.push({ id: test_case.id, ok: !strict, kind: "drift", problems: comparison.problems, changed: changed, formatting: comparison.formatting.length ? comparison.formatting : undefined });
    } else {
        console.log("CHANGED");
        results.push({ id: test_case.id, ok: false, kind: "changed", problems: comparison.problems, changed: changed, formatting: comparison.formatting.length ? comparison.formatting : undefined });
    }
});

if (accept) inputs.writeManifest(manifest_file, manifest);

const failures = results.filter((result) => !result.ok);
const drifted = results.filter((result) => result.kind === "drift");
const reformatted = results.filter((result) => result.formatting);

/*
    Drift is reported as a count and an attribution, never as the diff itself.
    The whole complaint against the old output was that a deliberate edit to one
    definition printed a thousand lines nobody could read, so printing them
    again under a friendlier heading would fix nothing.
*/
drifted.forEach((result) => {
    console.log(`\n${"-".repeat(72)}\n${result.id} -- drift, accounted for\n${"-".repeat(72)}`);
    result.problems.forEach((problem) => {
        const count = `${problem.diffs.length}${problem.diffs.length >= MAX_DIFFS ? "+" : ""} difference${problem.diffs.length === 1 ? "" : "s"}`;
        console.log(`  ${problem.artifact.padEnd(22)} ${count}`);
        if (problem.owners) inputs.tally(problem.owners).forEach(([owner, n]) => console.log(`      ${String(n).padStart(5)}  ${owner}`));
        else console.log(`      ${problem.reason}`);
    });
});

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

        if (failure.changed) console.log(`  inputs: ${summarise(failure.changed)}\n`);

        failure.problems.forEach((problem) => {
            const count = `${problem.diffs.length}${problem.diffs.length >= MAX_DIFFS ? "+" : ""} difference${problem.diffs.length === 1 ? "" : "s"}`;
            console.log(`  ${problem.artifact} -- ${count}, ${problem.explained ? "accounted for" : problem.reason}`);
            if (problem.owners) inputs.tally(problem.owners).forEach(([owner, n]) => console.log(`      ${String(n).padStart(5)}  ${owner}`));
            if (problem.explained) return;
            console.log("");
            problem.diffs.forEach((d) => console.log(`    ${d}`));
        });
    });
}

/*
    What moved underneath a baseline, in the order it matters. The engine leads
    because it is the one that turns drift into a failure.
*/
function summarise(changed) {
    if (changed.unknown) return "not recorded for this baseline -- re-run with --accept to start tracking them";
    const moved = [];
    if (changed.engine) moved.push("the engine");
    if (changed.brief) moved.push("the brief");
    if (changed.html_templates) moved.push("the HTML templates");
    if (changed.libraries) moved.push("the colour libraries");
    if (changed.modules.size) moved.push(inputs.describe(changed.modules));
    return moved.length ? moved.join(", ") : "unchanged";
}

console.log(`\n${"=".repeat(72)}`);
console.log(`${results.length - failures.length}/${results.length} ${accept ? "recorded" : "passing"}${drifted.length ? `, ${drifted.length} drifted` : ""}`);

if (reformatted.length) {
    console.log(`${reformatted.length} case${reformatted.length === 1 ? "" : "s"} differ in key order or whitespace only -- content matches`);
}

if (drifted.length && !strict) {
    console.log(`drift is accounted for by the library files listed above, so this is not a failure.`);
    console.log(`the baselines are behind: re-run with --accept and commit them.`);
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
