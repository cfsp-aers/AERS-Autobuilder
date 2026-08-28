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
*/

const fs = require("node:fs");
const path = require("node:path");

const here = __dirname;
const repo_root = path.resolve(here, "../..");
const modules_root = path.join(repo_root, "external/lib/modules");
const expected_root = path.join(here, "expected");

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

// ----------------------------------------------------------------- fixtures

/*
    Every variant is applied to every module. Most modules ignore most of them,
    which costs nothing and means a module that starts reading `transactional`
    is covered the moment it does.
*/
const VARIANTS = {
    plain: {},
    transition: { transition: "FFFFFF", transition_id: "urn:aaid:aem:test-transition", background: "#001939" },
    transactional: { transactional: true },
    no_nav: { no_nav: true },
    hpp: { hpp: true }
};

function current_for(variant) {
    return Object.assign(
        {
            uuid: "M0001",
            entity_type: "module",
            name: "test module",
            brand: "petbarn",
            parent_brand: "petbarn",
            depth: 1,
            palette: "light",
            colour: "#000000",
            background: "#FFFFFF",
            padding: "8px",
            container_padding: "0px",
            block_padding: "0px",
            transition: false,
            transition_id: undefined
        },
        VARIANTS[variant]
    );
}

/*
    Four components per slot, in this order deliberately: setComponents groups
    consecutive buttons by row_index, and a row_index above 1 arriving first
    reaches for the previous accumulator entry and throws. Real content is
    ordered the same way.
*/
function components_for(position) {
    return [
        { entity_type: "component", type: "image", name: "image", position: position, padding: "0px", width: "100%", content: { src: "images/test.png", href: "https://example.test", aem_id: "urn:aaid:aem:test-image" } },
        { entity_type: "component", type: "text", name: "heading", position: position, padding: "8px", font_size: "24px", content: "A heading" },
        { entity_type: "component", type: "button", name: "button", position: position, row_index: 1, padding: "4px", content: { text: "First", href: "https://example.test/1" } },
        { entity_type: "component", type: "button", name: "button", position: position, row_index: 2, padding: "4px", content: { text: "Second", href: "https://example.test/2" } }
    ];
}

/*
    structureEDM builds this object by filtering the module's children through
    component_positions and dropping the slots that came out empty. A module
    that declares a slot always gets one here, so every branch of the layout
    that reads a slot is exercised.
*/
function content_for(component_positions) {
    const content = {};
    Object.keys(component_positions || {}).forEach((position) => {
        content[position] = components_for(position);
    });
    return content;
}

// ------------------------------------------------------------------ modules

function module_files(dir) {
    return fs
        .readdirSync(dir, { withFileTypes: true })
        .flatMap((entry) => {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) return module_files(full);
            return entry.isFile() && entry.name.endsWith(".js") ? [full] : [];
        })
        .sort();
}

/*
    `module template.js` and `component template.js` are scaffolds to copy, not
    definitions any build loads -- nothing routes to them, and their relative
    requires are written for the folder a copy lands in rather than the folder
    they sit in, so requiring them here would throw.
*/
const modules = module_files(modules_root)
    .filter((file) => !path.basename(file).endsWith("template.js"))
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

    if (accept) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, actual, { encoding: "utf8" });
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
    if (diffs.length === 0) diffs.push("content matches but bytes differ (whitespace or key order)");

    console.log("CHANGED");
    results.push({ id: entry.id, ok: false, kind: "changed", diffs: diffs });
});

const failures = results.filter((result) => !result.ok);

failures.forEach((failure) => {
    console.log(`\n${"-".repeat(72)}\n${failure.id}\n${"-".repeat(72)}`);
    if (failure.kind === "threw") {
        console.log(failure.detail);
    } else if (failure.kind === "no-baseline") {
        console.log(`  nothing recorded yet. run: node tests/layouts/layouts.js --accept`);
    } else {
        failure.diffs.forEach((diff) => console.log(`  ${diff}`));
    }
});

console.log(`\n${"=".repeat(72)}`);
console.log(`${results.length - failures.length}/${results.length} ${accept ? "recorded" : "passing"}\n`);

process.exit(failures.length ? 1 : 0);
