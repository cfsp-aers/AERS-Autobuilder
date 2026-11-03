/*
    Whether a layout can declare its own card, and regions with their own
    palette. See docs/adr/0008-a-layout-may-declare-its-own-card-and-regions.md.

    `promo tile` is the witness: a card holding a white top and a `bottom` slot
    on `palette: bright red`, with its button below the card on the band.

    As in tests/palette.js, nothing here is a hex. A region on `bright red` has to come
    out the same as a whole module on `bright red`, whatever bright red turns out to be, so
    every expectation is another case: "this must match that one".

        node tests/regions.js
        node tests/regions.js --keep     leave the build behind to inspect
*/

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const here = __dirname;
const repo_root = path.resolve(here, "..");

const keep = process.argv.includes("--keep");

const XLSX = require(path.join(repo_root, "node_modules/xlsx"));

// ------------------------------------------------------------------- brief

const HEADER = ["Module Type", "component", "Content", "Offer Details\n(DO NOT TOUCH)", "Brand", "Dynamic Content", "Settings", "Notes"];
const module_row = (type, settings) => [type, null, null, null, null, null, settings || null];
const component_row = (component, content, settings) => [null, component, content, null, null, null, settings || null];

/*
    The promo tiles are kept apart by text blocks. Two promo tiles in a row would
    share one band and one palette (see setPalettes), which is correct and is
    not what is being tested here.
*/
function promo(id, settings) {
    return [
        module_row("promo tile", settings),
        component_row("image", "image_placeholder"),
        component_row("body copy", `CASE ${id}`),
        component_row("heading", "Members only"),
        component_row("subheading", "Save 20%"),
        component_row("subheading", "when you buy 2"),
        component_row("button", "Shop now"),
        module_row("text block"),
        component_row("body copy", "spacer")
    ];
}

function writeBrief() {
    return [
        ["Regions", null, null, null, null, null, "Settings"],
        HEADER,
        ["header", null, "Subject line: Regions\nPreheader: cards and regions", null, "Petbarn"],

        ...promo("promo"),
        ...promo("promo-black", "bottom: { palette: black }"),
        ...promo("promo-flat", "depth: 1"),

        // The anchors: whole modules on the palettes the regions name.
        module_row("text block", "palette: bright red"),
        component_row("body copy", "CASE red-anchor"),
        component_row("subheading", "anchor"),
        module_row("text block", "palette: black"),
        component_row("body copy", "CASE black-anchor"),
        component_row("subheading", "anchor"),

        // The control: a module with no card of its own is wrapped as before.
        module_row("old product tile"),
        component_row("image", "image_placeholder"),
        component_row("body copy", "CASE control"),
        component_row("button", "Shop now"),

        module_row("footer")
    ];
}

// ------------------------------------------------------------------- build

function runBrief(name, sheet_name, rowsOf) {
    const dir = path.join(here, `.regions-${name}-work`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });

    const brief = path.join(dir, `${name}.xlsx`);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rowsOf()), sheet_name);
    XLSX.writeFile(book, brief);

    fs.writeFileSync(
        path.join(dir, "REQUIRED_DATA.json"),
        JSON.stringify({ BRIEF_PARENT_FOLDER: dir, BRIEF_LOCATION: brief, OUTPUT_LOCATION: dir, SELECTED_SHEETS: [sheet_name], ALL_SHEETS: "" }, null, 2),
        { encoding: "utf8" }
    );

    const result = spawnSync(process.execPath, [path.join(here, "golden", "build-case.js"), dir], { cwd: repo_root, encoding: "utf8" });
    if (result.status !== 0) {
        console.error(`regions: the ${name} build failed, so nothing in it can be checked.\n${(result.stderr || "").trim()}`);
        process.exit(2);
    }

    const read = (file) => JSON.parse(fs.readFileSync(path.join(dir, "artifacts", file), { encoding: "utf8" }));
    const modules = read("module_store.json");
    const components = read("component_store.json");
    const tree = read("email_json.json");

    const built = {};
    (Array.isArray(modules) ? modules : Object.values(modules)).forEach((m) => {
        const list = components[m.uuid] || [];
        const marker = list.find((c) => typeof c.content === "string" && c.content.startsWith("CASE "));
        if (!marker) return;
        built[marker.content.slice("CASE ".length)] = {
            module: m,
            bodycopy: marker,
            subheadings: list.filter((c) => c.name === "subheading"),
            heading: list.find((c) => c.name === "heading")
        };
    });

    if (!keep) fs.rmSync(dir, { recursive: true, force: true });
    return { built: built, tree: tree };
}

// --------------------------------------------------------------- tree walks

/** Every node in the rendered tree, each with the chain of nodes above it. */
function walk(node, ancestors, out) {
    if (Array.isArray(node)) {
        node.forEach((child) => walk(child, ancestors, out));
        return out;
    }
    if (!node || typeof node !== "object") return out;
    out.push({ node: node, ancestors: ancestors });
    walk(node.children, ancestors.concat([node]), out);
    return out;
}

// ------------------------------------------------------------------- checks

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

function differs(actual, other, what) {
    if (actual === other) throw new Error(`${what}: both are ${JSON.stringify(actual)}`);
}

const { built, tree } = runBrief("build", "Regions", writeBrief);
const nodes = walk(tree, [], []);

function caseOf(id) {
    if (!built[id]) throw new Error(`no module built for ${id}`);
    return built[id];
}

/** The module node itself, as structureEDM placed it in the tree. */
function moduleNode(id) {
    const uuid = caseOf(id).module.uuid;
    const found = nodes.find((entry) => entry.node.uuid === uuid && entry.node.entity_type === "module");
    if (!found) throw new Error(`${id} is not in email_json.json`);
    return found;
}

function cardOf(id) {
    const module_node = moduleNode(id).node;
    const card = walk(module_node.children, [module_node], []).find((entry) => entry.node.card === true);
    if (!card) throw new Error(`${id} has no card in its layout`);
    return card;
}

function wrapperOf(id) {
    return moduleNode(id).ancestors.find((node) => node.block === "container");
}

// ~~ the region's palette ~~

check("a slot's palette gives its region the palette's background", () => {
    is(caseOf("promo").module.slots?.bottom?.background, caseOf("red-anchor").module.background, "slots.bottom.background, against a module on bright red");
});

check("a component in the region resolves against the region", () => {
    caseOf("promo").subheadings.forEach((subheading, i) => {
        is(subheading.colour, caseOf("red-anchor").subheadings[0].colour, `subheading ${i + 1}.colour, against a subheading on bright red`);
    });
});

check("and the heading sits on the region with no fill of its own", () => {
    is(caseOf("promo").heading.colour, caseOf("red-anchor").subheadings[0].colour, "heading.colour, against a subheading on bright red");
    differs(caseOf("promo").heading.background, caseOf("promo").module.slots.bottom.background, "heading.background, and the region's");
});

check("a component outside the region keeps the module's palette", () => {
    differs(caseOf("promo").bodycopy.colour, caseOf("red-anchor").bodycopy.colour, "bodycopy.colour in the card's top, and on bright red");
});

check("the region's background is not delivered to its components", () => {
    // `palette` and `background` are the region's. A text component carrying
    // the region's bright red as its own background would paint each line separately.
    caseOf("promo").subheadings.forEach((subheading, i) => {
        differs(subheading.background, caseOf("promo").module.slots.bottom.background, `subheading ${i + 1}.background, and the region's`);
    });
});

check("a brief can re-palette the region", () => {
    is(caseOf("promo-black").module.slots?.bottom?.background, caseOf("black-anchor").module.background, "slots.bottom.background, against a module on black");
    is(caseOf("promo-black").subheadings[0].colour, caseOf("black-anchor").subheadings[0].colour, "subheading.colour, against a subheading on black");
});

check("the region's background reaches the email as a colour", () => {
    const region = walk(cardOf("promo").node, [], []).find((entry) => entry.node.slot === "bottom");
    if (!region) throw new Error("no region for `bottom` inside the card");
    is(region.node.background, caseOf("promo").module.slots.bottom.background, "region.background");
    if (!/^#[0-9A-Fa-f]{3,8}$/.test(region.node.background)) throw new Error(`region.background is ${JSON.stringify(region.node.background)}, which is not a colour`);
});

// ~~ the card ~~

check("a declared card replaces the wrapper", () => {
    const wrapper = wrapperOf("promo");
    if (wrapper) throw new Error("promo tile is still wrapped in a container block");
});

check("the card is painted in the module's foreground colour", () => {
    is(cardOf("promo").node.background, caseOf("promo").module.colour, "card.background, against module.colour");
    is(cardOf("promo").node.border_radius, caseOf("promo").module.border_radius, "card.border_radius, against module.border_radius");
});

check("the button sits outside the card", () => {
    cardOf("promo");
    const button = walk(moduleNode("promo").node, [], []).find((entry) => entry.node.type === "button");
    if (!button) throw new Error("no button in promo tile");
    if (button.ancestors.some((node) => node.card === true)) throw new Error("the button is inside the card");
});

check("a module with no card of its own is still wrapped", () => {
    if (!wrapperOf("control")) throw new Error("product tile lost its container wrapper");
});

check("at depth 1 a declared card has no fill", () => {
    if (wrapperOf("promo-flat")) throw new Error("a depth-1 promo tile is wrapped in a container block");
    const background = cardOf("promo-flat").node.background;
    if (background !== undefined && background !== "transparent") throw new Error(`card.background is ${JSON.stringify(background)}`);
});

// ------------------------------------------------------------------ report

console.log(`\nChecking ${results.length} cases\n`);
results.forEach((result) => {
    console.log(`  ${result.ok ? "ok  " : "FAIL"}  ${result.name}`);
    if (!result.ok) console.log(`        ${result.reason}`);
});

const failures = results.filter((result) => !result.ok);
console.log(`\n${"=".repeat(72)}\n${results.length - failures.length}/${results.length} passing`);
if (failures.length && !keep) console.log(`re-run with --keep to inspect ${path.relative(repo_root, here)}/.regions-*-work/`);

process.exit(failures.length ? 1 : 0);
