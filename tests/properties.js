/*
    Whether the property registry and the repository still agree.

    libraries/properties.json is the list of every property this builder knows.
    Nothing reads it yet. This test is what makes it worth having: it holds the
    four places that already had opinions about the vocabulary to the one place
    that now records it.

    Those four never agreed. When the registry was written,
    formatObjects.formatProperties named 42 keys, the component rule files named
    31 between them, the templates read 39, and the recorded artifacts carried
    65. Three of formatObjects' 42 -- `parent_uuid`, `ignore`, `border_colour` --
    were assigned by nothing. Two of the templates' 39 -- `id` and `layout` --
    were set by nothing, and rendered 335 empty `name` attributes across the nine
    golden cases. Thirteen properties the templates read, `align` among them on
    582 nodes, were unknown to formatObjects entirely.

    None of that was findable without a list to check against, which is the
    whole argument for the file.

    ~~~~~~~~~~~ what is asserted ~~~~~~~~~~~

    Set agreement, in both directions:

        every property in the recorded artifacts is registered
        every default_properties key in every rule file is registered
        every property a rule file reads off `current` is registered
        every `element.x` any template reads is registered
        every registered property has evidence behind it, or says why not

    And the file's own shape: required fields present, closed vocabularies
    respected, `applies_to` naming real node kinds, no alias colliding with a
    property name or with another alias.

    ~~~~~~~~~~~ what is not ~~~~~~~~~~~

    `applies_to` is checked one way only. A kind listed there must have been
    observed carrying the property -- so the field cannot go stale in the
    direction of claiming too much -- but a property appearing on a kind the
    registry does not list is not a failure. It cannot be, yet: several
    properties are read on kinds that never carry them, which is the gap the
    registry exists to record rather than to fail on. `vertical_align` is the
    clearest -- 362 of 369 components carry it and no component template reads
    it. Enforcing applicability is the step after this one.

    Nothing here builds anything. It reads tests/golden/expected and
    tests/layouts/expected, which are recorded output, so it runs in well under
    a second and cannot drift with a brief.

        node tests/properties.js
*/

const fs = require("node:fs");
const path = require("node:path");

const here = __dirname;
const repo_root = path.resolve(here, "..");
const lib = path.join(repo_root, "external/lib");

const registry = JSON.parse(fs.readFileSync(path.join(lib, "libraries/properties.json"), { encoding: "utf8" }));

const KINDS = ["identity", "structure", "styling", "content", "campaign"];
const VALUES = ["reference", "keyword", "text", "flag", "number", "length", "spacing", "colour", "list", "object"];
const SET_BY = ["author", "engine", "both"];
const NODE_KINDS = ["module", "structure", "container", "gridContainer", "gridRow", "gridCol", "text", "image", "button"];
const SCOPES = ["entity", "content", "segment", "segment_properties"];

// ------------------------------------------------------------- the evidence

/*
    Which node a property was found on. The three component kinds are split out
    of `entity_type: "component"` because they render through three different
    templates and carry three different property sets, and calling them all
    "component" would lose the only distinction that matters here.
*/
function nodeKind(node) {
    if (node.entity_type === "component") return node.type === "image" ? "image" : node.type === "button" ? "button" : "text";
    if (node.entity_type === "module") return "module";
    if (node.block) return node.block;
    if (node.structure) return "structure";
    return null;
}

/*
    Every property in the recorded artifacts, and the kinds it was seen on.

    The walk descends by name rather than by shape, because the nested bags are
    not entities and their keys belong to other scopes: `content` and
    `user_settings` and a text segment's `properties` all hold keys that would
    otherwise be read as properties of the component they hang off.
*/
function observed() {
    const found = { entity: new Map(), content: new Map(), segment: new Map(), segment_properties: new Map(), user_settings: new Map() };

    const note = (scope, key, kind) => {
        const kinds = found[scope].get(key) || new Set();
        if (kind) kinds.add(kind);
        found[scope].set(key, kinds);
    };

    function entity(node) {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) return node.forEach(entity);

        const kind = nodeKind(node);
        Object.entries(node).forEach(([key, value]) => {
            note("entity", key, kind);
            if (key === "children") return entity(value);
            if (key === "content") return leaves("content", value, kind);
            if (key === "user_settings") return leaves("user_settings", value, kind);
            if (key === "text_segments") return segments(value);
        });
    }

    function segments(list) {
        (list || []).forEach((segment) => {
            if (!segment || typeof segment !== "object") return;
            Object.entries(segment).forEach(([key, value]) => {
                note("segment", key, "text");
                if (key === "properties") leaves("segment_properties", value, "text");
            });
        });
    }

    function leaves(scope, bag, kind) {
        if (!bag || typeof bag !== "object") return;
        Object.keys(bag).forEach((key) => note(scope, key, kind));
    }

    const golden = path.join(here, "golden/expected");
    fs.readdirSync(golden, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .forEach((entry) => {
            const at = (file) => path.join(golden, entry.name, file);
            ["email_json.json", "entity_store.json", "module_store.json"].forEach((file) => {
                if (fs.existsSync(at(file))) entity(JSON.parse(fs.readFileSync(at(file), { encoding: "utf8" })));
            });
            // Keyed by module uuid, so the map's own keys are not properties.
            if (fs.existsSync(at("component_store.json"))) Object.values(JSON.parse(fs.readFileSync(at("component_store.json"), { encoding: "utf8" }))).forEach(entity);
        });

    // Keyed by variant name -- `plain`, `transactional`, `no_nav` -- for the
    // same reason: one level down is where the nodes start.
    (function walk(dir) {
        fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) return walk(full);
            if (!entry.name.endsWith(".json") || entry.name === "inputs.json") return;
            Object.values(JSON.parse(fs.readFileSync(full, { encoding: "utf8" }))).forEach(entity);
        });
    })(path.join(here, "layouts/expected"));

    return found;
}

/*
    What the rule files say. Two different claims, and both count as evidence:
    a key in `default_properties` is a property the library sets, and a
    `current.x` read inside internal_layout is a property the library consults.
    The second is the only evidence behind `transactional`, `no_nav` and `hpp`,
    which no golden case exercises.

    Component-directed keys are not properties. A module aims values at its
    components by name -- `button: { padding }`, `"[heading, terms]": { ... }`,
    `heading/1: { ... }` -- so a key that resolves entirely to component names is
    a target and its contents are scanned one level deeper. The splitting is
    update.js's own, so a selector this test accepts is one the engine accepts.
*/
function fromRuleFiles() {
    const { splitTargetList } = require(path.join(repo_root, "external/src/main/processing/update.js"));
    const modules = JSON.parse(fs.readFileSync(path.join(lib, "libraries/modules.json"), { encoding: "utf8" }));

    const component_names = new Set(["components"]);
    Object.entries(modules.component).forEach(([canonical, entry]) => {
        [canonical].concat(entry["valid names"] || []).forEach((spelling) => component_names.add(spelling.replace(/[ -]/g, "_")));
    });

    const declared = new Map();
    const consulted = new Set();
    const unreadable = [];

    // A module's own slot names are targets too -- `bottom: { palette }` -- but
    // only in the file that declares the slot, as update.js has it (ADR 0008).
    const isTarget = (key, value, slots) =>
        value !== null && typeof value === "object" && splitTargetList(key).every((target) => component_names.has(target.split("/")[0].replace(/[ -]/g, "_")) || Array.isArray(slots[target]));

    function scan(bag, file, slots) {
        Object.entries(bag).forEach(([key, value]) => {
            if (isTarget(key, value, slots)) return scan(value, file, slots);
            const files = declared.get(key) || new Set();
            files.add(file);
            declared.set(key, files);
        });
    }

    /*
        A rule file is `modules/<category>/<name>.js`, which is how the engine
        finds one. The two files directly under modules/ are the copy-me
        templates, whose relative paths are written for the folder below them --
        deliberately, and they say so at the top -- so requiring one throws.
    */
    (function walk(dir, depth) {
        fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) return walk(full, depth + 1);
            if (!entry.name.endsWith(".js") || depth === 0) return;

            const relative = path.relative(lib, full);
            let rules;
            try {
                rules = require(full);
            } catch (error) {
                unreadable.push(relative);
                return;
            }
            if (rules.default_properties) scan(rules.default_properties, relative, rules.component_positions || {});

            const source = fs.readFileSync(full, { encoding: "utf8" });
            [...source.matchAll(/\b(?:current|prev|next)\.([a-zA-Z_][a-zA-Z0-9_]*)/g)].forEach((match) => consulted.add(match[1]));
        });
    })(path.join(lib, "modules"), 0);

    return { declared: declared, consulted: consulted, unreadable: unreadable };
}

/*
    What the templates read. Nunjucks comments are stripped first -- a header
    comment that explains a property by name is prose, not a read, and
    button-component.njk's says `element.x` and `element.border_*` while
    explaining which of its conditions are logic.
*/
function fromTemplates() {
    const reads = new Map();
    (function walk(dir) {
        fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) return walk(full);
            if (!entry.name.endsWith(".njk")) return;

            const source = fs.readFileSync(full, { encoding: "utf8" }).replace(/\{#[\s\S]*?#\}/g, "");
            const file = path.relative(path.join(lib, "html templates"), full);
            [...source.matchAll(/element\.([a-zA-Z_][a-zA-Z0-9_]*)(\.([a-zA-Z_][a-zA-Z0-9_]*))?/g)].forEach((match) => {
                const scope = match[1] === "content" && match[3] ? "content" : "entity";
                const key = scope === "content" ? match[3] : match[1];
                const files = reads.get(`${scope}.${key}`) || new Set();
                files.add(file);
                reads.set(`${scope}.${key}`, files);
            });
        });
    })(path.join(lib, "html templates"));
    return reads;
}

// ----------------------------------------------------------------- checking

const results = [];

function check(name, fn) {
    try {
        fn();
        results.push({ name: name, ok: true });
    } catch (error) {
        results.push({ name: name, ok: false, reason: error.message });
    }
}

/** Fail naming every offender, not the first -- a list is one edit, a drip is many. */
function none(list, describe) {
    if (list.length) throw new Error(`${describe}:\n        ${list.join("\n        ")}`);
}

const seen = observed();
const rules = fromRuleFiles();
const templates = fromTemplates();

const registered = (scope) => new Set(Object.keys(registry[scope] || {}));

// ------------------------------------------------------------- well-formed

check("the file has the four scopes and nothing else", () => {
    const scopes = Object.keys(registry).filter((key) => key !== "about");
    none(
        scopes.filter((scope) => !SCOPES.includes(scope)),
        "scopes the test does not know"
    );
    none(
        SCOPES.filter((scope) => !scopes.includes(scope)),
        "scopes missing from the file"
    );
});

check("every entry has the required fields, from the closed vocabularies", () => {
    const bad = [];
    SCOPES.forEach((scope) =>
        Object.entries(registry[scope]).forEach(([name, entry]) => {
            const at = `${scope}.${name}`;
            if (!KINDS.includes(entry.kind)) bad.push(`${at}: kind ${JSON.stringify(entry.kind)}`);
            if (!VALUES.includes(entry.value)) bad.push(`${at}: value ${JSON.stringify(entry.value)}`);
            if (!SET_BY.includes(entry.set_by)) bad.push(`${at}: set_by ${JSON.stringify(entry.set_by)}`);
            if (!Array.isArray(entry.applies_to)) bad.push(`${at}: applies_to is not a list`);
            (entry.applies_to || []).forEach((kind) => {
                if (!NODE_KINDS.includes(kind)) bad.push(`${at}: applies_to names ${JSON.stringify(kind)}`);
            });
            Object.keys(entry).forEach((field) => {
                if (!["kind", "value", "set_by", "applies_to", "aliases", "unused", "note"].includes(field)) bad.push(`${at}: unknown field ${JSON.stringify(field)}`);
            });
        })
    );
    none(bad, "malformed entries");
});

check("no alias collides with a property name or another alias", () => {
    const claimed = new Map();
    const clashes = [];
    Object.keys(registry.entity).forEach((name) => claimed.set(name, `the property ${name}`));
    Object.entries(registry.entity).forEach(([name, entry]) =>
        (entry.aliases || []).forEach((alias) => {
            if (claimed.has(alias)) clashes.push(`${alias} is claimed by ${claimed.get(alias)} and by an alias of ${name}`);
            else claimed.set(alias, `an alias of ${name}`);
        })
    );
    none(clashes, "alias collisions");
});

// ------------------------------------------------------------ set agreement

check("every property in the recorded artifacts is registered", () => {
    const checks = [
        ["entity", seen.entity],
        ["content", seen.content],
        ["segment", seen.segment],
        ["segment_properties", seen.segment_properties]
    ];
    const missing = [];
    checks.forEach(([scope, found]) => {
        const known = registered(scope);
        [...found.keys()].sort().forEach((key) => {
            if (!known.has(key)) missing.push(`${scope}.${key}, on ${[...found.get(key)].sort().join(", ") || "an unidentified node"}`);
        });
    });
    none(missing, "properties in tests/golden/expected or tests/layouts/expected that the registry does not know");
});

check("every property a rule file declares is registered", () => {
    const known = registered("entity");
    const missing = [...rules.declared.keys()]
        .sort()
        .filter((key) => !known.has(key))
        .map((key) => `${key}, declared in ${[...rules.declared.get(key)].sort().join(", ")}`);
    none(missing, "default_properties keys the registry does not know");
});

check("every property a rule file consults is registered", () => {
    const known = registered("entity");
    const missing = [...rules.consulted].sort().filter((key) => !known.has(key));
    none(missing, "properties read off `current` that the registry does not know");
});

check("every property a template reads is registered", () => {
    const missing = [...templates.keys()]
        .sort()
        .filter((id) => {
            const [scope, key] = [id.slice(0, id.indexOf(".")), id.slice(id.indexOf(".") + 1)];
            return !registered(scope).has(key);
        })
        .map((id) => `${id}, read by ${[...templates.get(id)].sort().join(", ")}`);
    none(missing, "properties the templates read that the registry does not know");
});

check("every rule file could be read", () => {
    none(rules.unreadable, "rule files that would not load, so their properties were not checked");
});

// -------------------------------------------------------------- justification

/*
    A registry entry earns its place by being set, declared, consulted or read.
    One that is none of those is vocabulary that has gone dead, and has to say
    so in `unused`.

    `unused` is then asserted the other way round against the sharpest fact
    available: the property does not appear in the recorded artifacts, so
    nothing produces it. That is deliberately not "nothing mentions it".
    `id` and `layout` are read by three templates and set by nobody, which is
    exactly the shape of dead vocabulary worth recording -- marking them unused
    has to stay legal, and has to stop being legal the day something sets them.
*/
function evidenceFor(scope, name) {
    const where = [];
    if ((seen[scope] || new Map()).has(name)) where.push("the recorded artifacts");
    if (scope === "entity") {
        if (rules.declared.has(name)) where.push("a rule file's default_properties");
        if (rules.consulted.has(name)) where.push("a rule file");
    }
    if (templates.has(`${scope}.${name}`)) where.push("a template");
    return where;
}

check("every registered property has evidence behind it, or says why not", () => {
    const unexplained = [];
    SCOPES.forEach((scope) =>
        Object.entries(registry[scope]).forEach(([name, entry]) => {
            if (evidenceFor(scope, name).length) return;
            if (!entry.unused && !entry.note) unexplained.push(`${scope}.${name}`);
        })
    );
    none(unexplained, "registered properties nothing sets, declares, consults or reads, and which say nothing about why they are here");
});

check("nothing marked unused is actually being produced", () => {
    const wrong = [];
    SCOPES.forEach((scope) =>
        Object.entries(registry[scope]).forEach(([name, entry]) => {
            if (!entry.unused) return;
            if ((seen[scope] || new Map()).has(name)) wrong.push(`${scope}.${name} is marked unused, but the recorded artifacts carry it`);
        })
    );
    none(wrong, "stale `unused` markers");
});

check("applies_to claims no node kind the property was never seen on", () => {
    const over = [];
    SCOPES.forEach((scope) =>
        Object.entries(registry[scope]).forEach(([name, entry]) => {
            const found = (seen[scope] || new Map()).get(name);
            (entry.applies_to || []).forEach((kind) => {
                if (!found || !found.has(kind)) over.push(`${scope}.${name} claims ${kind}`);
            });
        })
    );
    none(over, "applies_to entries no recorded artifact supports");
});

// ------------------------------------------------------------------- report

const counts = SCOPES.map((scope) => `${Object.keys(registry[scope]).length} ${scope}`).join(", ");
console.log(`\nChecking ${results.length} invariants against a registry of ${counts}\n`);
results.forEach((result) => {
    console.log(`  ${result.ok ? "ok  " : "FAIL"}  ${result.name}`);
    if (!result.ok) console.log(`        ${result.reason}`);
});

const failures = results.filter((result) => !result.ok);
console.log(`\n${"=".repeat(72)}\n${results.length - failures.length}/${results.length} passing`);

process.exit(failures.length ? 1 : 0);
