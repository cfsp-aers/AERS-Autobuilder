/*
    Which copy of the external tree a launch or a build runs from.

    The app keeps a copy of the published tree on each Mac, the local copy, and
    builds from it whenever it matches the published version, because building
    from the shared volume is far slower. A publish stamps its version into
    `.published.json`; the local copy records the stamp it was taken under. See
    local-copy-plan.md.

    Everything asserted here lives in app/local_copy.js, which has no Electron
    dependency precisely so this suite can require it. The bootstrap only feeds
    it what it found on disk.

    The cases that matter most are the ones that keep the local copy from
    winning when it should not: a newer publish, a half-finished publish, and a
    tree that carries no version at all. Each of those would otherwise stop
    published changes reaching people, silently.

        node tests/local-copy.js
*/

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repo_root = path.resolve(__dirname, "..");

const { shellHash, readStamp, chooseTree, refreshable, clearTreeRequires } = require(path.join(repo_root, "app/local_copy.js"));

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

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "ab-local-copy-"));

function put(root, rel, content) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content === undefined ? "" : content);
}

const TREE = path.join(scratch, "tree");
put(TREE, "main_external.js", "module.exports = {};");
put(TREE, "ui/index.html", "<html></html>");
put(TREE, "ui/renderer.js", "// renderer");
put(TREE, "src/main/main.js", "// engine");
put(TREE, "lib/libraries/modules.json", "{}");

function stamp(version, state, shell) {
    return { publishedAt: version, version: version, shellHash: shell || "shell-a", state: state || "published" };
}

const PUBLISHED = "/Volumes/share/Universal Builder";
const CACHE = "/Users/someone/Library/Application Support/Universal Builder/external_cache";

function published(s) {
    return { dir: PUBLISHED, stamp: s };
}

function cache(s) {
    return { dir: CACHE, stamp: s };
}

// ------------------------------------------------------------- chooseTree

check("published stamp equals the cache's: the cache", () => {
    const choice = chooseTree({ published: published(stamp("v1")), cache: cache(stamp("v1")) });
    is([choice.dir, choice.reason, choice.offline], [CACHE, "current", false]);
});

check("published is newer: the published tree", () => {
    const choice = chooseTree({ published: published(stamp("v2")), cache: cache(stamp("v1")) });
    is([choice.dir, choice.reason, choice.offline], [PUBLISHED, "newer", false]);
});

check("published, with no cache yet: the published tree", () => {
    const choice = chooseTree({ published: published(stamp("v1")), cache: null });
    is([choice.dir, choice.reason], [PUBLISHED, "newer"]);
});

check("a cache that predates stamping never matches: the published tree", () => {
    const choice = chooseTree({ published: published(stamp("v1")), cache: cache(null) });
    is(choice.dir, PUBLISHED);
});

check("publish in progress, cache present: the cache", () => {
    const choice = chooseTree({ published: published(stamp("v1", "publishing")), cache: cache(stamp("v0")) });
    is([choice.dir, choice.reason, choice.offline], [CACHE, "publishing", false]);
});

check("publish in progress, no cache: the published tree", () => {
    const choice = chooseTree({ published: published(stamp("v1", "publishing")), cache: null });
    is([choice.dir, choice.reason], [PUBLISHED, "publishing"]);
});

check("published unreachable, cache present: the cache, offline", () => {
    const choice = chooseTree({ published: null, cache: cache(stamp("v1")) });
    is([choice.dir, choice.reason, choice.offline], [CACHE, "offline", true]);
});

check("published unreachable, no cache: nothing", () => {
    const choice = chooseTree({ published: null, cache: null });
    is([choice.dir, choice.offline], [null, true]);
});

check("published stamp has no version (published before stamping): the published tree", () => {
    const old = { publishedAt: "2026-10-26T23:00:20Z", commit: "e029f7c" };
    const choice = chooseTree({ published: published(old), cache: cache(stamp("v1")) });
    is([choice.dir, choice.reason], [PUBLISHED, "unstamped"]);
});

check("no published stamp at all (a checkout): the published tree", () => {
    const choice = chooseTree({ published: published(null), cache: cache(stamp("v1")) });
    is([choice.dir, choice.reason], [PUBLISHED, "unstamped"]);
});

check("forced: the cache, whatever the stamps say", () => {
    const choice = chooseTree({ published: published(stamp("v2")), cache: cache(stamp("v1")), forced: true });
    is([choice.dir, choice.reason, choice.offline], [CACHE, "forced", false]);
});

check("the chosen tree's stamp comes back with it", () => {
    is(chooseTree({ published: published(stamp("v2")), cache: cache(stamp("v1")) }).stamp.version, "v2", "newer");
    is(chooseTree({ published: published(stamp("v1")), cache: cache(stamp("v1")) }).stamp.version, "v1", "current");
    is(chooseTree({ published: null, cache: cache(stamp("v0")) }).stamp.version, "v0", "offline");
});

// ------------------------------------------------------------ refreshable

check("refreshable: identical completed stamps", () => {
    is(refreshable(stamp("v1"), stamp("v1")), true);
});

check("refreshable: not when the version moved during the copy", () => {
    is(refreshable(stamp("v1"), stamp("v2")), false);
});

check("refreshable: not when either read says publishing", () => {
    is(refreshable(stamp("v1", "publishing"), stamp("v1")), false, "before");
    is(refreshable(stamp("v1"), stamp("v1", "publishing")), false, "after");
});

check("refreshable: not when either read found no stamp", () => {
    is(refreshable(null, stamp("v1")), false, "before");
    is(refreshable(stamp("v1"), null), false, "after");
});

// -------------------------------------------------------------- readStamp

check("readStamp: the parsed .published.json, or null", () => {
    is(readStamp(TREE), null, "absent");
    put(TREE, ".published.json", JSON.stringify(stamp("v1")));
    is(readStamp(TREE).version, "v1", "present");
    put(TREE, ".published.json", "{ not json");
    is(readStamp(TREE), null, "unreadable");
    fs.rmSync(path.join(TREE, ".published.json"));
});

// -------------------------------------------------------------- shellHash

check("shellHash: ignores .DS_Store and other dotfiles", () => {
    const before = shellHash(TREE);
    put(TREE, "ui/.DS_Store", "finder");
    put(TREE, ".published.json", "{}");
    is(shellHash(TREE), before);
    fs.rmSync(path.join(TREE, "ui/.DS_Store"));
    fs.rmSync(path.join(TREE, ".published.json"));
});

check("shellHash: changes when a ui/ file changes", () => {
    const before = shellHash(TREE);
    put(TREE, "ui/renderer.js", "// renderer, edited");
    const after = shellHash(TREE);
    put(TREE, "ui/renderer.js", "// renderer");
    if (after === before) throw new Error("hash did not change");
});

check("shellHash: changes when main_external.js changes", () => {
    const before = shellHash(TREE);
    put(TREE, "main_external.js", "module.exports = { edited: true };");
    const after = shellHash(TREE);
    put(TREE, "main_external.js", "module.exports = {};");
    if (after === before) throw new Error("hash did not change");
});

check("shellHash: does not change when a lib/ or src/ file changes", () => {
    const before = shellHash(TREE);
    put(TREE, "lib/libraries/modules.json", '{ "edited": true }');
    put(TREE, "src/main/main.js", "// engine, edited");
    is(shellHash(TREE), before);
});

check("shellHash: a renamed ui/ file is a different shell", () => {
    const before = shellHash(TREE);
    fs.renameSync(path.join(TREE, "ui/renderer.js"), path.join(TREE, "ui/renderer2.js"));
    const after = shellHash(TREE);
    fs.renameSync(path.join(TREE, "ui/renderer2.js"), path.join(TREE, "ui/renderer.js"));
    if (after === before) throw new Error("hash did not change");
});

// ------------------------------------------------------ clearTreeRequires

check("clearTreeRequires: clears src/, lib/ and lib-dev/ under the tree, nothing else", () => {
    const keep = [`${CACHE}/main_external.js`, `${CACHE}/ui/preload.js`, `${PUBLISHED}/src/main/main.js`, `${CACHE}/srcfoo/x.js`, "/app/node_modules/lodash/lodash.js"];
    const clear = [`${CACHE}/src/main/main.js`, `${CACHE}/lib/modules/header/header.js`, `${CACHE}/lib-dev/modules/x.js`];
    const fake = {};
    keep.concat(clear).forEach((key) => (fake[key] = {}));

    is(clearTreeRequires(fake, CACHE), clear.length, "count");
    is(Object.keys(fake).sort(), keep.slice().sort());
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
