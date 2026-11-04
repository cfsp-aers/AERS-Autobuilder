/*
    What a baseline was built from, and who owns a difference from it.

    A helper for the two snapshot suites, not a suite itself. Nothing runs it.

    A snapshot is a function of the engine (`external/src/`), the test library
    (`external/lib-test/`) and, for a golden case, the brief. The real library,
    `external/lib/`, is not an input: the suites build against the test library
    so that editing lib/ cannot move a baseline. See test-library-plan.md.

    So any difference is something to read. This module does not decide whether
    one is allowed -- that used to be its job, and it is gone with ADR 0006's
    drift verdict. What is left helps a reader: which input moved since the
    baseline was recorded, and which definition each difference came out of.
*/

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ENGINE = "external/src";
const TEST_LIBRARY = "external/lib-test";

const STORES = ["module_store.json", "entity_store.json", "component_store.json", "email_json.json"];

// ------------------------------------------------------------------ hashing

/*
    Twelve hex characters. Far more than enough to separate a few hundred files,
    and short enough that a manifest stays readable in a diff -- which is the
    point of keeping one.
*/
function hash(content) {
    return crypto.createHash("sha256").update(content).digest("hex").slice(0, 12);
}

function hashFile(file) {
    return fs.existsSync(file) ? hash(fs.readFileSync(file)) : "(missing)";
}

/*
    A tree hashes as the sorted list of its files' paths and their hashes, so a
    rename moves the hash and re-reading the same tree does not. Dotfiles are
    skipped: Finder drops a .DS_Store wherever a folder is opened, and that is
    not an edit to the library.
*/
function hashTree(root, extensions) {
    if (!fs.existsSync(root)) return "(missing)";

    const entries = [];

    (function walk(dir) {
        fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
            if (entry.name.startsWith(".")) return;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) return walk(full);
            if (!entry.isFile()) return;
            if (extensions && !extensions.some((ext) => entry.name.endsWith(ext))) return;
            entries.push(`${path.relative(root, full)}:${hashFile(full)}`);
        });
    })(root);

    return hash(entries.sort().join("\n"));
}

// -------------------------------------------------------------- fingerprints

/*
    One hash for the whole test library rather than one per file. It only ever
    changes when someone edits it on purpose, and the tally below already says
    which definitions a difference sits in.

    `brief` is optional: the layout snapshots have none.
*/
function fingerprint(repo_root, options) {
    const settings = options || {};

    const print = {
        engine: hashTree(path.join(repo_root, ENGINE), [".js"]),
        test_library: hashTree(path.join(repo_root, TEST_LIBRARY))
    };

    if (settings.brief) print.brief = hashFile(settings.brief);

    return print;
}

const NAMES = { engine: "the engine", test_library: "the test library", brief: "the brief" };

/*
    What moved underneath a baseline, for the report. It explains nothing and
    excuses nothing: a difference fails whichever input produced it.
*/
function moved(recorded, current) {
    if (!recorded) return "not recorded for this baseline";
    const list = Object.keys(NAMES).filter((key) => recorded[key] !== current[key]).map((key) => NAMES[key]);
    return list.length ? list.join(", ") : "no recorded input";
}

// ------------------------------------------------------------- attribution

/*
    uuid -> the definition that produced it.

    The engine wraps every module in grid nodes of its own -- gridContainer,
    gridRow, gridCol, container -- and those carry the module's uuid but no
    `template`, because no definition wrote them. They are built out of the
    module's resolved properties all the same, so editing a definition moves
    them. Without this map a padding change on a wrapper reads as coming from
    nowhere.
*/
function templatesByUuid(artifacts) {
    const map = new Map();

    STORES.forEach((name) => {
        const file = path.join(artifacts, name);
        if (!fs.existsSync(file)) return;
        collectOwners(JSON.parse(fs.readFileSync(file, { encoding: "utf8" })), map);
    });

    return map;
}

function collectOwners(node, map) {
    if (node === null || typeof node !== "object") return;
    if (typeof node.uuid === "string" && typeof node.template === "string" && !map.has(node.uuid)) map.set(node.uuid, node.template);
    Object.values(node).forEach((child) => collectOwners(child, map));
}

/*
    Charge each difference to the definition that produced it.

    A node names its definition in `template`, or names the module it belongs to
    in `uuid`, and either way it owns everything beneath it that does not claim
    an owner of its own -- including the literal components a layout embeds
    inline, which appear in no store. Keeping the nearest owner on the way down
    is therefore enough to say which file a difference came out of.

    Returns one owner per difference, `null` where nothing above it claimed the
    subtree. Positions are deliberately not reported: this answers "whose?", and
    diffJson in the suites already answers "where?".

    `artifacts` is the freshly built directory rather than the baseline, so a
    module the baseline has never seen still resolves.
*/
function attributor(artifacts) {
    return makeAttributor(templatesByUuid(artifacts));
}

/*
    The walker itself, given the uuid lookup rather than reading for it. A
    layout snapshot has no uuids -- nothing in it has been through
    setBasicProperties -- so it passes an empty map and resolves every owner
    from `template` alone.
*/
function makeAttributor(by_uuid) {
    function ownerOf(node, inherited) {
        if (node === null || typeof node !== "object") return inherited;
        if (typeof node.template === "string") return node.template;
        if (typeof node.uuid === "string" && by_uuid.has(node.uuid)) return by_uuid.get(node.uuid);
        return inherited;
    }

    function walk(expected, actual, inherited, out) {
        const owns = ownerOf(expected, null) || ownerOf(actual, null) || inherited || null;

        const both_objects = expected !== null && actual !== null && typeof expected === "object" && typeof actual === "object" && Array.isArray(expected) === Array.isArray(actual);

        if (!both_objects) {
            if (JSON.stringify(expected) !== JSON.stringify(actual)) out.push(owns);
            return out;
        }

        const keys = Array.from(new Set(Object.keys(expected).concat(Object.keys(actual))));
        keys.forEach((key) => {
            if (!(key in expected) || !(key in actual)) out.push(owns);
            else walk(expected[key], actual[key], owns, out);
        });

        return out;
    }

    return (expected, actual) => walk(expected, actual, null, []);
}

function tally(owners) {
    const counts = new Map();
    owners.forEach((owner) => {
        const key = owner || "(outside any definition)";
        counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

// ----------------------------------------------------------------- manifest

/*
    One file per suite rather than one per case, so accepting a change lands as
    a single readable diff next to the artifacts it records.
*/
function readManifest(file) {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, { encoding: "utf8" })) : {};
}

function writeManifest(file, manifest) {
    const ordered = {};
    Object.keys(manifest)
        .sort()
        .forEach((key) => {
            ordered[key] = manifest[key];
        });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(ordered, null, 4)}\n`, { encoding: "utf8" });
}

module.exports = {
    STORES: STORES,
    attributor: attributor,
    fingerprint: fingerprint,
    makeAttributor: makeAttributor,
    moved: moved,
    readManifest: readManifest,
    tally: tally,
    writeManifest: writeManifest
};
