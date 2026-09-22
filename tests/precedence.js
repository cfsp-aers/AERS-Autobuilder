/*
    Which layer wins.

    ADR 0005 states six layers, lowest to highest:

        1. component default_properties
        2. component styling rule
        3. module default_properties, including its component-directed keys
        4. module styling rule
        5. component user setting
        6. module user setting

    -- and one thing that is not a layer at all. `modes` is a derivation: it
    runs after resolution has settled, an explicit value beats the preset, and
    everything derived from that value is recomputed from it.

    This builds one generated brief that puts those in conflict and asserts
    which value came out. It is written to the decision rather than to today's
    engine, so most of it fails until phase 3 of property-resolution-plan.md
    lands. That is the point: the golden files record current behaviour as
    expected, so they cannot be the thing that says what correct is.

    It asserts the layer, not the string. `h1` means whatever heading.js's own
    presets say it means, so a redesign of the type scale changes one file and
    this test follows it.

        node tests/precedence.js
        node tests/precedence.js --keep     leave the build behind to inspect
*/

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const here = __dirname;
const repo_root = path.resolve(here, "..");
const workdir = path.join(here, ".precedence-work");

const keep = process.argv.includes("--keep");

const XLSX = require(path.join(repo_root, "node_modules/xlsx"));
const { makeUpdate, LAYERS, beginRuleExecution, endRuleExecution } = require(path.join(repo_root, "external/src/main/processing/update.js"));
const heading_rules = require(path.join(repo_root, "external/lib/modules/component/heading.js"));

// ------------------------------------------------------- what a mode means

/*
    Read out of heading.js by running it, rather than copied out of it. The
    numbers are a design decision that belongs in one place, and a test that
    pins "54px" would fail the day someone legitimately redesigns the scale --
    which would say nothing at all about precedence.
*/
/*
    Ask heading.js what it does with a heading, by handing it the layers
    applyModifications would have handed it and then running the derivation.

    Everything the caller wants to be true of the heading goes in through
    `user_settings` rather than onto the record, because a value with no layer
    under it is not a value: heading.js's own `default_properties` are layer 1,
    and layer 1 would resolve straight over the top of it.
*/
function runModes(user_settings) {
    const item = { uuid: "C0", name: "heading", user_settings: user_settings };
    const update = makeUpdate(() => []);

    heading_rules.setupRules({ current_item: item, previous_item: {}, next_item: {} }, { update: update });
    update(item, heading_rules.default_properties, LAYERS.component_default);
    update(item, item.user_settings, LAYERS.component_user);

    beginRuleExecution("heading.js modes()", LAYERS.component_rule);
    heading_rules.modes();
    endRuleExecution();

    return item;
}

/** The font size, leading and size class the engine gives a mode. */
function modeMeans(mode) {
    const item = runModes({ mode: mode });
    return { font_size: item.font_size, line_height: item.line_height, text_size_class: item.text_size_class };
}

/** What the engine derives for a font size no preset produced. */
function derivedFor(font_size) {
    // A mode no preset knows, so nothing writes over the size being asked about.
    const item = runModes({ mode: "no preset", font_size: font_size });
    return { text_size_class: item.text_size_class, line_height: item.line_height };
}

// ------------------------------------------------------------------- brief

/*
    Four articles, each with one heading. `article` is the module here because
    its default_properties aim `heading: { mode: "h6" }` at its components,
    which is the layer-3-over-layer-1 conflict; heading.js's own default is h2.

    Layers 2 and 4 -- the styling rules -- are not in conflict here, and no
    brief can put them in conflict: not one component rule body in the library
    writes anything in `style()`. Those two are asserted in tests/update.js,
    against `beginRuleExecution` rather than against a built brief. The
    conflicts a brief can actually create are the ones below.
*/
const HEADER = ["Module Type", "component", "Content", "Offer Details\n(DO NOT TOUCH)", "Brand", "Dynamic Content", "Settings", "Notes"];
const module_row = (type, settings) => [type, null, null, null, null, null, settings || null];
const component_row = (component, content, settings) => [null, component, content, null, null, null, settings || null];

const CASES = [
    {
        id: "defaults",
        why: "the module's default_properties (3) beat the component's own (1)",
        module_settings: null,
        component_settings: null,
        expect_mode: "h6" // article says h6, heading.js says h2
    },
    {
        id: "component-user",
        why: "a component user setting (5) beats the module's default_properties (3)",
        module_settings: null,
        component_settings: "mode: h1",
        expect_mode: "h1"
    },
    {
        id: "module-user",
        why: "a module user setting (6) beats a component user setting (5)",
        module_settings: "heading: { mode: h3 }",
        component_settings: "mode: h1",
        expect_mode: "h3"
    }
];

const EXPLICIT_SIZE = "60px";

function writeBrief(target) {
    const rows = [
        ["Precedence", null, null, null, null, null, "Settings"],
        HEADER,
        ["header", null, "Subject line: Precedence\nPreheader: One module per layer conflict", null, "Petbarn"]
    ];

    CASES.forEach((test_case) => {
        rows.push(module_row("article", test_case.module_settings));
        rows.push(component_row("heading", `CASE ${test_case.id}`, test_case.component_settings));
        rows.push(component_row("body copy", "Body copy, so the module has something under its heading."));
    });

    // The derivation case: an explicit size, which must beat the preset and
    // drag everything computed from it along.
    rows.push(module_row("article"));
    rows.push(component_row("heading", "CASE explicit-size", `font size: ${EXPLICIT_SIZE}`));
    rows.push(component_row("body copy", "Body copy."));

    rows.push(module_row("footer"));

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Precedence");
    XLSX.writeFile(book, target);
}

// ------------------------------------------------------------------- build

function build() {
    fs.rmSync(workdir, { recursive: true, force: true });
    fs.mkdirSync(workdir, { recursive: true });

    const brief = path.join(workdir, "precedence.xlsx");
    writeBrief(brief);

    fs.writeFileSync(
        path.join(workdir, "REQUIRED_DATA.json"),
        JSON.stringify({ BRIEF_PARENT_FOLDER: workdir, BRIEF_LOCATION: brief, OUTPUT_LOCATION: workdir, SELECTED_SHEETS: ["Precedence"], ALL_SHEETS: "" }, null, 2),
        { encoding: "utf8" }
    );

    const result = spawnSync(process.execPath, [path.join(here, "golden", "build-case.js"), workdir], { cwd: repo_root, encoding: "utf8" });
    if (result.status !== 0) {
        console.error(`precedence: the build failed, so no layer can be checked.\n${(result.stderr || "").trim()}`);
        process.exit(2);
    }

    const store = JSON.parse(fs.readFileSync(path.join(workdir, "artifacts", "component_store.json"), { encoding: "utf8" }));

    const headings = {};
    Object.values(store).forEach((components) => {
        components.forEach((c) => {
            if (c.name === "heading" && typeof c.content === "string" && c.content.startsWith("CASE ")) {
                headings[c.content.slice("CASE ".length)] = c;
            }
        });
    });
    return headings;
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

const headings = build();

CASES.forEach((test_case) => {
    const heading = headings[test_case.id];
    const means = modeMeans(test_case.expect_mode);

    check(`${test_case.id}: ${test_case.why}`, () => {
        if (!heading) throw new Error("no heading built for this case");
        is(heading.mode, test_case.expect_mode, "mode");
    });

    check(`${test_case.id}: the sizes are the winning mode's`, () => {
        if (!heading) throw new Error("no heading built for this case");
        /*
            Checked against the mode that should have won rather than against
            the mode the record ended up holding: a record that stores h6 and
            renders h6 is wrong here too, and asserting on its own `mode` would
            let it through. Taken with the check above, this says the record is
            both right and self-consistent -- the field bug is a record whose
            `mode` field and `font_size` field describe different headings.
        */
        is(heading.font_size, means.font_size, `font_size for ${test_case.expect_mode}`);
        is(heading.line_height, means.line_height, `line_height for ${test_case.expect_mode}`);
        is(heading.text_size_class, means.text_size_class, `text_size_class for ${test_case.expect_mode}`);
    });
});

// ------------------------------------------------- derivation, not a layer

const explicit = headings["explicit-size"];

check("an explicit font size beats the mode preset", () => {
    if (!explicit) throw new Error("no heading built for this case");
    is(explicit.font_size, EXPLICIT_SIZE, "font_size");
});

check("the size class is recomputed from the explicit size", () => {
    if (!explicit) throw new Error("no heading built for this case");
    is(explicit.text_size_class, derivedFor(EXPLICIT_SIZE).text_size_class, "text_size_class");
});

check("the leading is recomputed from the explicit size", () => {
    if (!explicit) throw new Error("no heading built for this case");
    /*
        No ratio is pinned here -- that is a design decision, and it is read
        back out of the engine like the rest of the scale. What cannot stand is
        leading shorter than the type, which is what 60px on 26px was: the lines
        of a wrapped heading overlap.
    */
    is(explicit.line_height, derivedFor(EXPLICIT_SIZE).line_height, "line_height");

    const size = parseInt(explicit.font_size, 10);
    const leading = parseInt(explicit.line_height, 10);
    if (!(leading >= size)) throw new Error(`line_height ${explicit.line_height} is shorter than font_size ${explicit.font_size}`);
});

// ------------------------------------------------------------------ report

console.log(`\nChecking ${results.length} cases\n`);
results.forEach((result) => {
    console.log(`  ${result.ok ? "ok  " : "FAIL"}  ${result.name}`);
    if (!result.ok) console.log(`        ${result.reason}`);
});

const failures = results.filter((result) => !result.ok);
console.log(`\n${"=".repeat(72)}\n${results.length - failures.length}/${results.length} passing`);
if (failures.length && !keep) console.log(`re-run with --keep to inspect ${path.relative(repo_root, workdir)}/`);
if (!keep) fs.rmSync(workdir, { recursive: true, force: true });

process.exit(failures.length ? 1 : 0);
