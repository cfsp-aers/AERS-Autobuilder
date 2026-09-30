/*
    What a baseline was built from, and who owns a difference from it.

    A helper for the two snapshot suites, not a suite itself. Nothing runs it.

    A snapshot is a function of three inputs: the brief, the engine
    (`external/src/`) and the library (`external/lib/` -- module definitions,
    HTML templates, colour libraries). The suites exist to catch unintended
    change from the engine. The library is in the hash too, and editing the
    library is the daily work of the product, so every ordinary library edit
    used to land as a failure indistinguishable from a regression -- and the
    only way past it was `--accept`, which approves everything including
    whatever rode along.

    This module lets a suite tell the two apart. It records what a baseline was
    built from, and charges each difference to the file that produced it.

    The rule, in one line: a library change accounts for a difference, an engine
    change never does. See docs/adr/0006-snapshots-record-their-inputs.md.
*/

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ENGINE = "external/src";
const HTML_TEMPLATES = "external/lib/html templates";
const LIBRARIES = "external/lib/libraries";
const MODULES = "external/lib/modules";

/*
    The library files the engine opens, and therefore the only ones that can
    account for a difference.

    `libraries` used to be one hash over every .json in that folder, and any
    change to any of them returned "the colour libraries changed" as a blanket
    explanation for every difference in every artifact. Wrong three ways at
    once: it could not say which file had moved, it named the colour libraries
    whatever had actually moved, and it answered before the per-difference
    attribution computed below it had been consulted at all.

    It became load-bearing wrong when libraries/properties.json arrived. Nothing
    reads that file -- it is a vocabulary tests/properties.js holds the
    repository to -- so editing it cannot move a byte of output, and under the
    old rule it would have excused arbitrary drift in all nine cases while the
    registry was being worked on.

    So unrecognised is inert. A file dropped into this folder explains nothing
    until it is named here, which means a library that is genuinely read arrives
    as an unexplained difference rather than as silence. The colour palettes are
    a directory rather than a list because properties/palette.js builds their
    names from the brand -- `${brand} palettes.json` -- so there is no literal
    to match.
*/
const LOADED_LIBRARIES = ["brands.json", "button palettes.json", "colour library.json", "modules.json"];
const LOADED_LIBRARY_DIRS = ["colour palettes"];

function isLoadedLibrary(file) {
    if (LOADED_LIBRARIES.indexOf(file) >= 0) return true;
    return LOADED_LIBRARY_DIRS.some((dir) => file.startsWith(`${dir}${path.sep}`));
}

const STORES = ["module_store.json", "entity_store.json", "component_store.json", "email_json.json"];

// ------------------------------------------------------------------ hashing

/*
    Twelve hex characters. Far more than enough to separate fifty files, and
    short enough that a manifest stays readable in a diff -- which is the point
    of keeping one.
*/
function hash(content) {
    return crypto.createHash("sha256").update(content).digest("hex").slice(0, 12);
}

function hashFile(file) {
    return fs.existsSync(file) ? hash(fs.readFileSync(file)) : "(missing)";
}

/*
    A tree hashes as the sorted list of its files' paths and their hashes, so a
    rename moves the hash and re-reading the same tree does not.
*/
function hashTree(root, extensions) {
    if (!fs.existsSync(root)) return "(missing)";

    const entries = [];

    (function walk(dir) {
        fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) return walk(full);
            if (!entry.isFile()) return;
            if (extensions && !extensions.some((ext) => entry.name.endsWith(ext))) return;
            entries.push(`${path.relative(root, full)}:${hashFile(full)}`);
        });
    })(root);

    return hash(entries.sort().join("\n"));
}

/*
    The same walk as hashTree, but keeping a hash per file instead of folding
    them together, so a change can be named rather than merely noticed.
*/
function hashFiles(root, extensions) {
    const found = {};
    if (!fs.existsSync(root)) return found;

    (function walk(dir) {
        fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) return walk(full);
            if (!entry.isFile()) return;
            if (extensions && !extensions.some((ext) => entry.name.endsWith(ext))) return;
            found[path.relative(root, full)] = hashFile(full);
        });
    })(root);

    const ordered = {};
    Object.keys(found)
        .sort()
        .forEach((file) => (ordered[file] = found[file]));
    return ordered;
}

// -------------------------------------------------------------- fingerprints

/*
    Which definitions a case actually loaded.

    Every module and component record carries the path to its own in
    `template`, so a case reports its own dependencies. Nothing here needs
    maintaining when a brief starts or stops using a module type.
*/
function templatesUsed(artifacts) {
    const found = new Set();

    STORES.forEach((name) => {
        const file = path.join(artifacts, name);
        if (!fs.existsSync(file)) return;
        collectTemplates(JSON.parse(fs.readFileSync(file, { encoding: "utf8" })), found);
    });

    return Array.from(found).sort();
}

/*
    The same, for a snapshot that is already in memory rather than on disk. The
    layout suite builds one tree per module and never writes the stores, so it
    has nothing for templatesUsed() to read.
*/
function templatesIn(value) {
    const found = new Set();
    collectTemplates(value, found);
    return Array.from(found).sort();
}

function collectTemplates(node, found) {
    if (node === null || typeof node !== "object") return;
    if (typeof node.template === "string") found.add(node.template);
    Object.values(node).forEach((child) => collectTemplates(child, found));
}

/*
    `templates`, `brief` and `libraries` are optional: the layout snapshots have
    none of them, and name a single definition through `module_file` instead.

    `libraries` is opt-in rather than always recorded because a layout snapshot
    cannot depend on one -- see explainsModule below -- and recording nine
    hashes per entry that nothing reads would cost the layout manifest 192 lines
    of noise. A manifest earns its keep by staying readable in a diff.
*/
function fingerprint(repo_root, options) {
    const settings = options || {};

    const print = {
        engine: hashTree(path.join(repo_root, ENGINE), [".js"]),
        html_templates: hashTree(path.join(repo_root, HTML_TEMPLATES), [".njk"])
    };

    if (settings.libraries) print.libraries = hashFiles(path.join(repo_root, LIBRARIES), [".json"]);

    if (settings.brief) print.brief = hashFile(settings.brief);

    if (settings.module_file) print.module = hashFile(settings.module_file);

    if (settings.templates) {
        print.modules = {};
        Array.from(new Set(settings.templates))
            .sort()
            .forEach((template) => {
                print.modules[template] = hashFile(path.join(repo_root, MODULES, template));
            });
    }

    return print;
}

/*
    Which library files moved, split by whether the engine reads them. A change
    to one it does not read is reported and explains nothing.
*/
function changedLibraries(recorded, current) {
    const before = recorded || {};
    const after = current || {};
    const loaded = new Set();
    const inert = new Set();

    Array.from(new Set(Object.keys(before).concat(Object.keys(after)))).forEach((file) => {
        if (before[file] === after[file]) return;
        (isLoadedLibrary(file) ? loaded : inert).add(file);
    });

    return { loaded: loaded, inert: inert };
}

function compare(recorded, current) {
    if (!recorded) return { unknown: true, libraries: new Set(), libraries_inert: new Set(), modules: new Set(), any: false };

    const recorded_modules = recorded.modules || {};
    const current_modules = current.modules || {};
    const modules = new Set();

    Array.from(new Set(Object.keys(recorded_modules).concat(Object.keys(current_modules)))).forEach((template) => {
        if (recorded_modules[template] !== current_modules[template]) modules.add(template);
    });

    // A baseline recorded before the split has one string where the map now
    // goes. There is nothing to compare it against, so say so rather than guess
    // -- guessing here would guess in the permissive direction.
    const stale = typeof recorded.libraries === "string";
    const libraries = stale ? { loaded: new Set(), inert: new Set() } : changedLibraries(recorded.libraries, current.libraries);

    const changed = {
        unknown: false,
        engine: recorded.engine !== current.engine,
        html_templates: recorded.html_templates !== current.html_templates,
        libraries: libraries.loaded,
        libraries_inert: libraries.inert,
        libraries_stale: stale,
        brief: recorded.brief !== current.brief,
        modules: modules
    };

    changed.any = changed.engine || changed.html_templates || changed.libraries.size > 0 || changed.libraries_stale || changed.brief || modules.size > 0;
    return changed;
}

// ------------------------------------------------------------- attribution

/*
    uuid -> the definition that produced it.

    The engine wraps every module in grid nodes of its own -- gridContainer,
    gridRow, gridCol, container -- and those carry the module's uuid but no
    `template`, because no definition wrote them. They are built out of the
    module's resolved properties all the same, so editing a definition moves
    them. Without this map a padding change on a wrapper reads as coming from
    nowhere, and one deliberate edit fails the case it was made in.
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

function describe(modules) {
    const list = Array.from(modules).sort();
    if (list.length === 0) return "nothing";
    if (list.length === 1) return list[0];
    if (list.length <= 3) return list.join(", ");
    return `${list.slice(0, 2).join(", ")} and ${list.length - 2} more`;
}

// ---------------------------------------------------------------- the rule

/*
    Whether the differences in one artifact are accounted for by a changed
    input.

    An engine change accounts for nothing. The engine is the thing these
    snapshots guard, so output moving underneath it is the alarm they exist to
    raise, and it is answered by reading the diff and recording it -- not by
    being waved through. Everything else is content the product gets edited to
    change.

    The stores are judged difference by difference, against the definition that
    owns each one. email.html is judged whole, because rendered markup has no
    structure to attribute through -- which is exactly why build-case.js records
    the stores alongside it.
*/
/*
    A changed library file is still a blanket explanation rather than something
    attributed difference by difference, and deliberately so: `colour
    library.json` is read whenever any property's value is a colour name, so the
    set of definitions it reaches is all of them. There is nothing to attribute
    it against. What changed is that it now names the file, and that a file the
    engine does not read no longer explains anything at all.
*/
function alsoInert(changed) {
    if (!changed.libraries_inert || changed.libraries_inert.size === 0) return "";
    return `; ${describe(changed.libraries_inert)} changed too, which the engine does not read`;
}

function explains(artifact, owners, changed) {
    if (changed.unknown) return { explained: false, reason: "no inputs recorded for this baseline" };
    if (changed.libraries_stale) return { explained: false, reason: "this baseline records one hash for the whole library folder -- re-run with --accept to record them per file" };
    if (changed.engine) return { explained: false, reason: "the engine changed" };
    if (changed.brief) return { explained: true, reason: "the brief changed" };
    if (changed.libraries.size) return { explained: true, reason: `${describe(changed.libraries)} changed` };

    if (!artifact.endsWith(".json")) {
        if (changed.html_templates) return { explained: true, reason: "the HTML templates changed" };
        if (changed.modules.size) return { explained: true, reason: `${describe(changed.modules)} changed` };
        return { explained: false, reason: `no input for this case changed${alsoInert(changed)}` };
    }

    const unexplained = owners.filter((owner) => owner === null || !changed.modules.has(owner));

    if (unexplained.length) {
        return {
            explained: false,
            unexplained: unexplained,
            reason: changed.modules.size ? `${unexplained.length} of ${owners.length} differences fall outside the definitions that changed` : `no definition used by this case changed${alsoInert(changed)}`
        };
    }

    return { explained: true, reason: `${describe(changed.modules)} changed` };
}

/*
    The same rule for the layout snapshots.

    These used to have one input each -- the definition itself, on the engine
    that supplies its constructors -- and that stopped being true when the
    constructors started reading `default_properties` out of the component rule
    files. `internal_layout()` calls component(), image() and button(), and each
    of those now opens a file under modules/component/. Editing button.js moves
    every layout that declares a button, and the suite had no way to know it: it
    hashed the module's own file and nothing else, so the change arrived as
    "no input for this module changed".

    Attribution is per difference, as it is for the golden cases. A difference
    under a node carrying `template` belongs to that component definition; one
    under no template at all belongs to the module's own file, because a layout
    snapshot is that module's tree and nothing else's.

    `libraries` is deliberately not a verdict here, and not recorded either. A
    layout snapshot is built by calling internal_layout() with synthetic input --
    no palette runs, no resolution runs -- so a colour library cannot reach it,
    and saying it could would explain away a difference it did not cause.
*/
function explainsModule(owners, changed) {
    if (changed.unknown) return { explained: false, reason: "no inputs recorded for this baseline" };
    if (changed.engine) return { explained: false, reason: "the engine changed" };

    const unexplained = owners.filter((owner) => (owner === null ? !changed.module : !changed.modules.has(owner)));

    if (unexplained.length) {
        const anything_changed = changed.module || changed.modules.size;
        return {
            explained: false,
            unexplained: unexplained,
            reason: anything_changed ? `${unexplained.length} of ${owners.length} differences fall outside the definitions that changed` : "no input for this module changed"
        };
    }

    if (changed.module && changed.modules.size) return { explained: true, reason: `the definition and ${describe(changed.modules)} changed` };
    if (changed.module) return { explained: true, reason: "the definition changed" };
    return { explained: true, reason: `${describe(changed.modules)} changed` };
}

function compareModule(recorded, current) {
    if (!recorded) return { unknown: true, modules: new Set() };

    const recorded_modules = recorded.modules || {};
    const current_modules = current.modules || {};
    const modules = new Set();

    Array.from(new Set(Object.keys(recorded_modules).concat(Object.keys(current_modules)))).forEach((template) => {
        if (recorded_modules[template] !== current_modules[template]) modules.add(template);
    });

    return {
        unknown: false,
        engine: recorded.engine !== current.engine,
        module: recorded.module !== current.module,
        modules: modules
    };
}

// ----------------------------------------------------------------- manifest

/*
    One file per suite rather than one per case, so accepting a change lands as
    a single readable diff next to the artifacts it explains.
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
    compare: compare,
    compareModule: compareModule,
    describe: describe,
    explains: explains,
    explainsModule: explainsModule,
    makeAttributor: makeAttributor,
    templatesIn: templatesIn,
    fingerprint: fingerprint,
    readManifest: readManifest,
    tally: tally,
    templatesUsed: templatesUsed,
    writeManifest: writeManifest
};
