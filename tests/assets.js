/*
    What a build does with the copies of library assets already in `assets/`.

    The default is the decision ADR 0002 implies: the library is the source of
    truth, so every build overwrites, and a copy that has drifted cannot survive
    one. "Ignore existing assets" is the user's opt-out of exactly that -- copy
    only what is not there yet -- and the two halves are asserted together,
    because the hazard is one of them quietly becoming the other.

    The rest is what must not change when the toggle is on. A kept file is still
    in `assets/`, so the src still points there and the AEM id lists still name
    it; a wobble that was kept is not a wobble the library is missing. Those are
    the ways a "don't copy" flag turns into a visibly different email.

    Runs resolveAssets() directly against the real library rather than through a
    build: the question is about files on disk, and a brief adds nothing to it.

        node tests/assets.js
*/

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repo_root = path.resolve(__dirname, "..");
const library_root = path.join(repo_root, "external/lib/libraries/assets");

const aers = require(path.join(repo_root, "external/src/main/utils/aers utilities.js"));
const { configure } = require(path.join(repo_root, "external/src/main/build_config.js"));
const { resolveAssets } = require(path.join(repo_root, "external/src/main/utils/assets.js"));

/*
    Two files the library really has, one of each kind that reaches `assets/`: a
    wobble, whose src is named by nameTransitions() and whose id arrives as
    `transition_id`, and a preset image, whose src is in a module definition and
    whose id is filled in by resolveAssets() itself.
*/
const WOBBLE = "wobble-bottom-FFFFFF.png";
const LOGO = "Petbarn_HeaderLogo_wBG.png";

const results = [];

function check(name, fn) {
    try {
        fn();
        results.push({ name: name, ok: true });
    } catch (error) {
        results.push({ name: name, ok: false, reason: error.message });
    }
}

function is(actual, expected, what) {
    if (actual !== expected) throw new Error(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ----------------------------------------------------------------- the fixture

/*
    One output folder per suite run, inside the system temp directory, so a run
    cannot touch the user's last real build. configure() is what resolveAssets
    reaches for the log location; startLog() makes the folder it writes to.
*/
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "ab-assets-"));
const output = path.join(scratch, "out");
fs.mkdirSync(output, { recursive: true });

function configureBuild(ignoreExistingAssets) {
    const config = configure({
        briefLocation: path.join(scratch, "brief.xlsx"),
        outputLocation: output,
        selectedSheets: ["Sheet"],
        databaseLocation: path.join(scratch, "db"),
        ignoreExistingAssets: ignoreExistingAssets
    });
    aers.startLog();
    return config;
}

/*
    The shape resolveAssets() walks: a node with a `block` carrying a transition
    src, over a component with an image src, over one the library has no file
    for. Rebuilt per call because resolveAssets() rewrites it in place.
*/
function tree() {
    return [
        {
            block: "basic",
            transition: "#FFFFFF",
            transition_src: `images/${WOBBLE}`,
            children: [{ content: { src: `images/${LOGO}` } }, { content: { src: "images/campaign-hero.png" } }]
        }
    ];
}

const copyOf = (name) => path.join(output, "assets", name);
const libraryCopy = (name) => fs.readFileSync(path.join(library_root, name));

/** A copy of `name` in `assets/` that is not the library's file. */
function drift(name) {
    fs.mkdirSync(path.dirname(copyOf(name)), { recursive: true });
    fs.writeFileSync(copyOf(name), "edited by hand");
}

const isLibraryCopy = (name) => fs.existsSync(copyOf(name)) && fs.readFileSync(copyOf(name)).equals(libraryCopy(name));
const stillDrifted = (name) => fs.existsSync(copyOf(name)) && fs.readFileSync(copyOf(name), "utf8") === "edited by hand";

function build(ignoreExistingAssets) {
    configureBuild(ignoreExistingAssets);
    const built = tree();
    const report = resolveAssets(built, output, ignoreExistingAssets);
    return { built: built, report: report };
}

// --------------------------------------------------------------- configuration

check("a build that says nothing about assets gets the overwriting default", () => {
    is(configureBuild(undefined).ignoreExistingAssets, false, "ignoreExistingAssets");
});

check("only true turns it on", () => {
    is(configureBuild(true).ignoreExistingAssets, true, "from true");
    // Reaches the engine from a checkbox over IPC and from a file an older app
    // wrote, so a truthy near-miss must not read as "on".
    is(configureBuild("false").ignoreExistingAssets, false, 'from "false"');
    is(configureBuild(null).ignoreExistingAssets, false, "from null");
});

// ------------------------------------------------------------- the default: copy

check("a build copies the library files its email asks for", () => {
    const { built, report } = build(false);

    is(report.copied.join(", "), [LOGO, WOBBLE].sort().join(", "), "copied");
    is(report.kept.length, 0, "kept");
    is(built[0].transition_src, `assets/${WOBBLE}`, "transition src");
    is(built[0].children[0].content.src, `assets/${LOGO}`, "image src");
});

check("a src the library has no file for is left in images/", () => {
    const { built, report } = build(false);

    is(built[0].children[1].content.src, "images/campaign-hero.png", "campaign src");
    if (report.supplied.includes("campaign-hero.png")) throw new Error("campaign artwork was reported as supplied");
});

check("a drifted copy is overwritten, which is what the library being authoritative means", () => {
    drift(WOBBLE);
    const { report } = build(false);

    if (!isLibraryCopy(WOBBLE)) throw new Error(`${WOBBLE} in assets/ is not the library's file`);
    if (!report.copied.includes(WOBBLE)) throw new Error("the overwrite was not reported as a copy");
});

// --------------------------------------------------------- the toggle: keep

check("ignoring existing assets leaves a drifted copy exactly as it was", () => {
    drift(WOBBLE);
    const { report } = build(true);

    if (!stillDrifted(WOBBLE)) throw new Error(`${WOBBLE} was recopied over`);
    if (report.copied.includes(WOBBLE)) throw new Error("a kept file was reported as copied");
    if (!report.kept.includes(WOBBLE)) throw new Error("a kept file was not reported as kept");
});

check("a kept file is still an asset the src points at", () => {
    drift(WOBBLE);
    const { built, report } = build(true);

    is(built[0].transition_src, `assets/${WOBBLE}`, "transition src");
    if (report.missing_transitions.length) throw new Error(`reported as missing from the library: ${report.missing_transitions.join(", ")}`);
});

check("a kept file is still named in the AEM id lists", () => {
    drift(WOBBLE);
    drift(LOGO);
    const { report } = build(true);

    is(report.copied.length, 0, "copied");
    is(report.supplied.join(", "), [LOGO, WOBBLE].sort().join(", "), "supplied");
    is(report.identified.join(", "), [LOGO, WOBBLE].sort().join(", "), "identified");
});

check("a file assets/ does not have yet is copied either way", () => {
    drift(WOBBLE);
    fs.rmSync(copyOf(LOGO), { force: true });
    const { report } = build(true);

    if (!report.copied.includes(LOGO)) throw new Error(`${LOGO} was not copied`);
    if (!isLibraryCopy(LOGO)) throw new Error(`${LOGO} in assets/ is not the library's file`);
    if (!report.kept.includes(WOBBLE)) throw new Error("the file that was there should still have been kept");
});

check("clearing the toggle is what restores a file someone edited", () => {
    drift(WOBBLE);
    build(true);
    build(false);

    if (!isLibraryCopy(WOBBLE)) throw new Error(`${WOBBLE} in assets/ is still not the library's file`);
});

// ------------------------------------------------------------ the dev library

/*
    The one case here that has to touch the real external/lib-dev/, because the
    overlay is a property of that folder and nothing else. It adds one file and
    removes exactly what it added -- the file, and any folder it had to make --
    whether the case passes or not. A lib-dev/ that already has its own wobble of
    this name is someone's work in progress, so the case stands aside.
*/
check("with the dev library on, a lib-dev/ asset of the same name is the one copied", () => {
    const { lib_dev } = require(path.join(repo_root, "external/src/main/constants.js"));
    const { devFilesUsed } = require(path.join(repo_root, "external/src/main/build_config.js"));
    const dev_file = path.join(lib_dev, "libraries/assets", WOBBLE);
    if (fs.existsSync(dev_file)) return;

    let made = path.dirname(dev_file);
    while (!fs.existsSync(path.dirname(made))) made = path.dirname(made);
    const first_new = fs.existsSync(made) ? null : made;

    try {
        fs.mkdirSync(path.dirname(dev_file), { recursive: true });
        fs.writeFileSync(dev_file, "the dev wobble");

        configure({
            briefLocation: path.join(scratch, "brief.xlsx"),
            outputLocation: output,
            selectedSheets: ["Sheet"],
            databaseLocation: path.join(scratch, "db"),
            useDevLibrary: true
        });
        const report = resolveAssets(tree(), output, false);

        is(fs.readFileSync(copyOf(WOBBLE), "utf8"), "the dev wobble", `${WOBBLE} in assets/`);
        if (!report.copied.includes(WOBBLE)) throw new Error("the dev file was not reported as a copy");
        if (!isLibraryCopy(LOGO)) throw new Error(`${LOGO}, which lib-dev/ does not have, did not come from lib/`);
        is(devFilesUsed().join(", "), `libraries/assets/${WOBBLE}`, "dev files used");
    } finally {
        fs.rmSync(first_new || dev_file, { recursive: true, force: true });
    }

    build(false);
    if (!isLibraryCopy(WOBBLE)) throw new Error(`with the dev library off again, ${WOBBLE} is not the library's file`);
});

// ------------------------------------------------------------------- report

fs.rmSync(scratch, { recursive: true, force: true });

console.log(`\nChecking ${results.length} cases\n`);
results.forEach((result) => {
    console.log(`  ${result.ok ? "ok  " : "FAIL"}  ${result.name}`);
    if (!result.ok) console.log(`        ${result.reason}`);
});

const failures = results.filter((result) => !result.ok);
console.log(`\n${"=".repeat(72)}\n${results.length - failures.length}/${results.length} passing`);
process.exit(failures.length ? 1 : 0);
