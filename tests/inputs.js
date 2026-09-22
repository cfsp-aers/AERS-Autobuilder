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

function collectTemplates(node, found) {
    if (node === null || typeof node !== "object") return;
    if (typeof node.template === "string") found.add(node.template);
    Object.values(node).forEach((child) => collectTemplates(child, found));
}

/*
    `templates` and `brief` are optional: the layout snapshots have neither, and
    name a single definition through `module_file` instead.
*/
function fingerprint(repo_root, options) {
    const settings = options || {};

    const print = {
        engine: hashTree(path.join(repo_root, ENGINE), [".js"]),
        html_templates: hashTree(path.join(repo_root, HTML_TEMPLATES), [".njk"]),
        libraries: hashTree(path.join(repo_root, LIBRARIES), [".json"])
    };

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

function compare(recorded, current) {
    if (!recorded) return { unknown: true, modules: new Set(), any: false };

    const recorded_modules = recorded.modules || {};
    const current_modules = current.modules || {};
    const modules = new Set();

    Array.from(new Set(Object.keys(recorded_modules).concat(Object.keys(current_modules)))).forEach((template) => {
        if (recorded_modules[template] !== current_modules[template]) modules.add(template);
    });

    const changed = {
        unknown: false,
        engine: recorded.engine !== current.engine,
        html_templates: recorded.html_templates !== current.html_templates,
        libraries: recorded.libraries !== current.libraries,
        brief: recorded.brief !== current.brief,
        modules: modules
    };

    changed.any = changed.engine || changed.html_templates || changed.libraries || changed.brief || modules.size > 0;
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
    const by_uuid = templatesByUuid(artifacts);

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
function explains(artifact, owners, changed) {
    if (changed.unknown) return { explained: false, reason: "no inputs recorded for this baseline" };
    if (changed.engine) return { explained: false, reason: "the engine changed" };
    if (changed.brief) return { explained: true, reason: "the brief changed" };
    if (changed.libraries) return { explained: true, reason: "the colour libraries changed" };

    if (!artifact.endsWith(".json")) {
        if (changed.html_templates) return { explained: true, reason: "the HTML templates changed" };
        if (changed.modules.size) return { explained: true, reason: `${describe(changed.modules)} changed` };
        return { explained: false, reason: "no input for this case changed" };
    }

    const unexplained = owners.filter((owner) => owner === null || !changed.modules.has(owner));

    if (unexplained.length) {
        return {
            explained: false,
            unexplained: unexplained,
            reason: changed.modules.size ? `${unexplained.length} of ${owners.length} differences fall outside the definitions that changed` : "no definition used by this case changed"
        };
    }

    return { explained: true, reason: `${describe(changed.modules)} changed` };
}

/*
    The same rule for the layout snapshots, which have one input each: the
    definition itself, sitting on the engine that supplies its constructors.
*/
function explainsModule(changed) {
    if (changed.unknown) return { explained: false, reason: "no inputs recorded for this baseline" };
    if (changed.engine) return { explained: false, reason: "the engine changed" };
    if (changed.module) return { explained: true, reason: "the definition changed" };
    return { explained: false, reason: "no input for this module changed" };
}

function compareModule(recorded, current) {
    if (!recorded) return { unknown: true };
    return {
        unknown: false,
        engine: recorded.engine !== current.engine,
        module: recorded.module !== current.module
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
    fingerprint: fingerprint,
    readManifest: readManifest,
    tally: tally,
    templatesUsed: templatesUsed,
    writeManifest: writeManifest
};
