/*
    What the engine does with a brief that is wrong.

    The golden tests cover briefs that build. These cover the failures a user is
    actually likely to hit, because each used to surface as an exception that
    named neither the sheet nor the cause:

      - a sheet whose header row is not where the old fixed row counts assumed
      - an offer alias in the brief that is not in the Offer Library
      - a spacing value written as a bare number, e.g. `padding: 24`

    Assertions are on the message, not just on "it threw". The message is the
    whole point -- `Cannot read properties of undefined (reading 'offerAlias')`
    also threw.

        node tests/brief-errors.js
*/

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const XLSX = require("xlsx");

const repo_root = path.resolve(__dirname, "..");
const briefs_root = path.join(__dirname, "golden", "briefs");

const aers = require(path.join(repo_root, "external/src/main/utils/aers utilities.js"));
const { configure } = require(path.join(repo_root, "external/src/main/build_config.js"));

const results = [];

function check(name, fn) {
    try {
        fn();
        results.push({ name: name, ok: true });
    } catch (error) {
        results.push({ name: name, ok: false, reason: error.message });
    }
}

/** Assert fn() throws, and that the message says the things a user needs. */
function throwsSaying(fn, ...fragments) {
    let message = null;
    try {
        fn();
    } catch (error) {
        message = error.message;
    }

    if (message === null) {
        throw new Error("expected a failure, got none");
    }

    const missing = fragments.filter((fragment) => !message.includes(fragment));
    if (missing.length) {
        throw new Error(`message did not mention ${missing.map((m) => JSON.stringify(m)).join(", ")}\n    got: ${message.split("\n")[0]}`);
    }
}

// ------------------------------------------------------------ header rows

/*
    The two brief templates differ in exactly the way that broke the old fixed
    row counts: demo.xlsx repeats its Offer Library header, beta-testing.xlsx
    does not. Both must land on a header row that has the offers under it.
*/
check("demo.xlsx Offer Library header is the second of its two header rows", () => {
    const wb = XLSX.readFile(path.join(briefs_root, "demo.xlsx"));
    const row = aers.find_header_row(wb.Sheets["Offer Library"], "offerAlias", "test");
    if (row !== 2) throw new Error(`expected row 2, got ${row}`);
});

check("beta-testing.xlsx Offer Library header is its single header row", () => {
    const wb = XLSX.readFile(path.join(briefs_root, "beta-testing.xlsx"));
    const row = aers.find_header_row(wb.Sheets["Offer Library"], "offerAlias", "test");
    if (row !== 1) throw new Error(`expected row 1, got ${row}`);
});

check("the first offer survives the header scan on both templates", () => {
    // The alias column is B in demo.xlsx (A is OFFER_ID) and A in beta-testing.
    // Reading either sheet one row out consumes this offer as the header.
    [
        ["demo.xlsx", "ScienceSelective_Small Pet_20pc"],
        ["beta-testing.xlsx", "Offer 01"]
    ].forEach(([file, first_alias]) => {
        const wb = XLSX.readFile(path.join(briefs_root, file));
        const offers = aers.sheet_to_objects(wb.Sheets["Offer Library"], "offerAlias", "test");
        if (offers[0].offerAlias !== first_alias) {
            throw new Error(`${file}: expected first offer "${first_alias}", got "${offers[0].offerAlias}"`);
        }
    });
});

check("content sheets locate their header on both templates", () => {
    [
        ["demo.xlsx", "PB Demo Email"],
        ["beta-testing.xlsx", "AERS Layout Testing"]
    ].forEach(([file, sheet]) => {
        const wb = XLSX.readFile(path.join(briefs_root, file));
        const row = aers.find_header_row(wb.Sheets[sheet], "moduleType", "test");
        if (row !== 1) throw new Error(`${file} / ${sheet}: expected row 1, got ${row}`);
    });
});

check("a sheet with no header row names itself", () => {
    const ws = XLSX.utils.aoa_to_sheet([
        ["Some Title", null],
        ["Nothing", "Useful"],
        ["a", "b"]
    ]);
    throwsSaying(() => aers.find_header_row(ws, "moduleType", 'the "Mystery" sheet'), "Mystery", "moduleType");
});

check("an empty sheet names itself", () => {
    throwsSaying(() => aers.find_header_row({}, "moduleType", 'the "Blank" sheet'), "Blank");
});

// -------------------------------------------------------------- offer lookup

check("an offer alias not in the library names the offer and the sheet", () => {
    const wb = XLSX.readFile(path.join(briefs_root, "beta-testing.xlsx"));
    const offers = aers.sheet_to_objects(wb.Sheets["Offer Library"], "offerAlias", "test");

    // setupContent needs a configured build: it reaches the module library
    // through the same paths a real build does.
    configure({
        briefLocation: path.join(briefs_root, "beta-testing.xlsx"),
        outputLocation: os.tmpdir(),
        selectedSheets: ["GXV Brand Testing"],
        databaseLocation: fs.mkdtempSync(path.join(os.tmpdir(), "ab-errors-"))
    });

    const { setupContent } = require(path.join(repo_root, "external/src/main/processing/setup.js"));

    const content = [
        { moduleType: "header", content: "Subject line: x\nPreheader: y", brand: "Petbarn" },
        { moduleType: "product tile", content: "Offer 99 -- not a real alias", offerDetails: "yes", brand: "Petbarn" }
    ];

    throwsSaying(() => setupContent(content, offers, 'the "GXV Brand Testing" sheet'), "Offer 99", "GXV Brand Testing", "Offer Library");
});

// ------------------------------------------------------- build configuration

check("a build with no brief refuses to start", () => {
    throwsSaying(() => configure({ outputLocation: "/tmp", selectedSheets: ["a"], databaseLocation: "/tmp" }), "briefLocation");
});

check("a build with no sheets selected refuses to start", () => {
    throwsSaying(() => configure({ briefLocation: "/tmp/b.xlsx", outputLocation: "/tmp", selectedSheets: [], databaseLocation: "/tmp" }), "no sheets selected");
});

check("aersFilesLocation is derived from the brief, not the working directory", () => {
    const config = configure({
        briefLocation: "/tmp/campaign/brief.xlsx",
        outputLocation: "/tmp/out",
        selectedSheets: ["Sheet"],
        databaseLocation: "/tmp/db"
    });
    if (config.aersFilesLocation !== path.join("/tmp/campaign", "AERS files")) {
        throw new Error(`got ${config.aersFilesLocation}`);
    }
});

// ------------------------------------------------------------------ spacing

/*
    `padding: 24` and `padding: 0` in a settings cell used to end the build with
    `TypeError: updated_spacing.map is not a function`, naming no sheet, module
    or cell. A brief writing a bare number means that many pixels, and the brief
    parser coerces bare digits to integers -- but formatSpacingToArray returned
    anything that was not a string or an array untouched, so the number reached
    .map.

    Fixed in spacing.js rather than in the parser, because the parser should not
    have to know which properties are spacing.
*/

const spacing = require(path.join(repo_root, "external/src/main/properties/spacing.js"));

function spacingIs(actual, expected) {
    if (actual !== expected) throw new Error(`expected "${expected}", got ${JSON.stringify(actual)}`);
}

check("a bare number is that many pixels on all four sides", () => {
    spacingIs(spacing.formatSpacingToString(24), "24px 24px 24px 24px");
    spacingIs(spacing.formatSpacingToArray(24).join(" "), "24 24 24 24");
});

check("padding: 0 builds rather than throwing", () => {
    // Separate from the case above because 0 is falsy: every guard on this path
    // has to test for a number rather than for truthiness.
    spacingIs(spacing.formatSpacingToString(0), "0px 0px 0px 0px");
    spacingIs(spacing.updateSpacing("12px", 0), "0px 0px 0px 0px");
});

check("a number overrides a default the way a string does", () => {
    // The shape applyModifications calls it in: the module's default padding as
    // an array, the value being written second.
    spacingIs(spacing.updateSpacing(["12", "12", "12", "12"], 24), "24px 24px 24px 24px");
    spacingIs(spacing.updateSpacing(["12", "12", "12", "12"], "24px"), "24px 24px 24px 24px");
});

check("strings and arrays are untouched by the number handling", () => {
    spacingIs(spacing.formatSpacingToString("12px 32px"), "12px 32px 12px 32px");
    spacingIs(spacing.formatSpacingToString("8px"), "8px 8px 8px 8px");
    spacingIs(spacing.formatSpacingToString(["1", "2", "3", "4"]), "1px 2px 3px 4px");
    spacingIs(spacing.updateSpacing("12px 32px 12px 32px", "_ _ 24px"), "12px 32px 24px 32px");
});

check("a value that is neither spacing nor a number still passes through", () => {
    // undefined arrives here whenever a module has no default for the property.
    if (spacing.formatSpacingToArray(undefined) !== undefined) throw new Error("undefined should pass through");
    if (spacing.formatSpacingToArray(null) !== null) throw new Error("null should pass through");
});

// ------------------------------------------------------------------- report

console.log(`\nChecking ${results.length} cases\n`);
results.forEach((result) => {
    console.log(`  ${result.ok ? "ok  " : "FAIL"}  ${result.name}`);
    if (!result.ok) console.log(`        ${result.reason}`);
});

const failures = results.filter((result) => !result.ok);
console.log(`\n${"=".repeat(72)}\n${results.length - failures.length}/${results.length} passing`);
process.exit(failures.length ? 1 : 0);
