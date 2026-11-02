/*
    Where a library file is read from when the dev library is in play.

    `external/lib-dev/` mirrors `external/lib/`. With the toggle on, a file at the
    same relative path in lib-dev/ is read instead of the one in lib/; with it off,
    lib-dev/ is never read at all. See dev-library-plan.md.

    The resolution rule is asserted against fixture folders through resolveIn(),
    which takes its roots and its `exists` as arguments, so nothing here depends
    on what the real lib-dev/ happens to hold today. The wrappers the engine
    calls are asserted for the two things fixtures cannot show: that they follow
    the flag, and that they do not throw when no build is configured -- seven
    suites call into the engine without ever calling configure().

    The cascade cases are the ones that matter most. The brand-keyed template
    cascade asks "does this file exist?" once per tier, and the overlay answers
    each of those questions dev-then-base. A dev `header/header.js` therefore
    does not beat a base `header/header petbarn.js`.

        node tests/dev-library.js
*/

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repo_root = path.resolve(__dirname, "..");

const { configure, devLibraryEnabled, devFilesUsed } = require(path.join(repo_root, "external/src/main/build_config.js"));
const { resolveIn, libraryPath, libraryExists } = require(path.join(repo_root, "external/src/main/utils/library.js"));
const { user_files, lib_dev } = require(path.join(repo_root, "external/src/main/constants.js"));
const { templateCandidates } = require(path.join(repo_root, "external/src/main/properties/template.js"));

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
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${what || "value"}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

// ----------------------------------------------------------------- fixtures

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "ab-dev-library-"));
const DEV = path.join(scratch, "lib-dev");
const BASE = path.join(scratch, "lib");

function put(root, rel) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), "");
}

put(BASE, "libraries/modules.json");
put(DEV, "libraries/modules.json");
put(BASE, "libraries/brands.json");

// cascade fixture one: dev has only the generic header, base has Petbarn's
put(path.join(scratch, "one/lib"), "modules/header/header petbarn.js");
put(path.join(scratch, "one/lib"), "modules/header/header.js");
put(path.join(scratch, "one/lib-dev"), "modules/header/header.js");

// cascade fixture two: dev has Petbarn's own header
put(path.join(scratch, "two/lib"), "modules/header/header petbarn.js");
put(path.join(scratch, "two/lib-dev"), "modules/header/header petbarn.js");

/** What resolveTemplate() does, against fixture roots: the first tier that exists in either. */
function cascade(roots, item) {
    const tier = templateCandidates(item).find((candidate) => fs.existsSync(path.join(resolveIn(roots, `modules/${candidate}`, fs.existsSync), `modules/${candidate}`)));
    return path.join(resolveIn(roots, `modules/${tier}`, fs.existsSync), `modules/${tier}`);
}

const module_library = JSON.parse(fs.readFileSync(path.join(user_files, "libraries/modules.json"), { encoding: "utf8" }));
const petbarnHeader = Object.assign({ entity_type: "module", name: "header" }, module_library.module.header.properties, { brand: "petbarn", parent_brand: "petbarn" });

// ------------------------------------------------------------ the resolution

check("flag off: always lib/, even when lib-dev/ has the file", () => {
    is(resolveIn([BASE], "libraries/modules.json", fs.existsSync), BASE);
});

check("flag on, file in lib-dev/: lib-dev/", () => {
    is(resolveIn([DEV, BASE], "libraries/modules.json", fs.existsSync), DEV);
});

check("flag on, file only in lib/: lib/", () => {
    is(resolveIn([DEV, BASE], "libraries/brands.json", fs.existsSync), BASE);
});

check("flag on, file in neither: the lib/ path, so the failure is today's", () => {
    is(resolveIn([DEV, BASE], "libraries/colour palettes/nobody palettes.json", fs.existsSync), BASE);
});

check("cascade: a dev generic header does not beat a base brand header", () => {
    const roots = [path.join(scratch, "one/lib-dev"), path.join(scratch, "one/lib")];
    is(cascade(roots, petbarnHeader), path.join(scratch, "one/lib", "modules/header/header petbarn.js"));
});

check("cascade: a dev brand header beats the base one", () => {
    const roots = [path.join(scratch, "two/lib-dev"), path.join(scratch, "two/lib")];
    is(cascade(roots, petbarnHeader), path.join(scratch, "two/lib-dev", "modules/header/header petbarn.js"));
});

// -------------------------------------------------------------- the wrappers

check("no configure() at all: flag off, nothing throws", () => {
    is(devLibraryEnabled(), false, "devLibraryEnabled()");
    is(libraryPath("libraries/modules.json"), path.join(user_files, "libraries/modules.json"));
    is(libraryExists("libraries/modules.json"), true, "libraryExists()");
    is(devFilesUsed(), [], "devFilesUsed()");
});

function configureBuild(useDevLibrary) {
    configure({
        briefLocation: path.join(scratch, "brief.xlsx"),
        outputLocation: path.join(scratch, "out"),
        selectedSheets: ["Sheet"],
        databaseLocation: path.join(scratch, "db"),
        useDevLibrary: useDevLibrary
    });
}

check("the flag is compared against true, not coerced", () => {
    [undefined, null, "true", 1, false].forEach((given) => {
        configureBuild(given);
        is(devLibraryEnabled(), false, `useDevLibrary: ${JSON.stringify(given)}`);
    });
    configureBuild(true);
    is(devLibraryEnabled(), true, "useDevLibrary: true");
});

check("flag on: a file lib-dev/ does not have still comes from lib/, and is not recorded", () => {
    configureBuild(true);
    const rel = "libraries/brands.json";
    if (fs.existsSync(path.join(lib_dev, rel))) return; // the real lib-dev/ overrides it; nothing to assert
    is(libraryPath(rel), path.join(user_files, rel));
    is(devFilesUsed(), [], "devFilesUsed()");
});

check("configure() starts a fresh record of dev files used", () => {
    configureBuild(true);
    const { noteDevFile } = require(path.join(repo_root, "external/src/main/build_config.js"));
    noteDevFile("modules/header/header.js");
    noteDevFile("modules/header/header.js");
    is(devFilesUsed(), ["modules/header/header.js"], "recorded once");
    configureBuild(true);
    is(devFilesUsed(), [], "after the next configure()");
});

// ------------------------------------------------- against the real lib-dev/

/*
    The wrappers read the real external/lib-dev/, so the only way to show they
    follow the flag is to put a file there. This adds one and removes exactly
    what it added -- the file, and any folder it had to make -- whether the case
    passes or not. A lib-dev/ that already has a file at this path is someone's
    work in progress, so the case stands aside.
*/
function withDevFile(rel, contents, fn) {
    const dev_file = path.join(lib_dev, rel);
    if (fs.existsSync(dev_file)) return;

    let made = path.dirname(dev_file);
    while (!fs.existsSync(path.dirname(made))) made = path.dirname(made);
    const first_new = fs.existsSync(made) ? null : made;

    try {
        fs.mkdirSync(path.dirname(dev_file), { recursive: true });
        fs.writeFileSync(dev_file, contents);
        fn();
    } finally {
        fs.rmSync(first_new || dev_file, { recursive: true, force: true });
    }
}

check("the wrappers read a real lib-dev/ file only while the flag is on", () => {
    const { loadLibrary } = require(path.join(repo_root, "external/src/main/utils/library.js"));
    const rel = "libraries/brands.json";

    withDevFile(rel, JSON.stringify({ dev: true }), () => {
        configureBuild(false);
        is(libraryPath(rel), path.join(user_files, rel), "flag off: libraryPath()");
        is(loadLibrary(rel).dev, undefined, "flag off: loadLibrary()");
        is(devFilesUsed(), [], "flag off: devFilesUsed()");

        configureBuild(true);
        is(libraryPath(rel), path.join(lib_dev, rel), "flag on: libraryPath()");
        is(loadLibrary(rel).dev, true, "flag on: loadLibrary()");
        is(devFilesUsed(), [rel], "flag on: devFilesUsed()");
    });
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
