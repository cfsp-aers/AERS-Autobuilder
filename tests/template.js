/*
    Which definition a module runs, and what happens when its brand has none.

    Four module types in libraries/modules.json carry `fragment: true`, meaning
    one definition per brand with the brand appended to the file name. The
    library holds those definitions for two brands. brands.json names ten, so
    eight of them -- every sub-brand, The Nosh Project among them -- ask for a
    file that is not there.

    Until 01/10/2026 that missed and fell straight to `default/default.js`: a
    generic single column, no logo, no nav, light palette, chosen silently. The
    engine already cascaded brand -> parent brand -> default twice over, in
    properties/palette.js and in utils/style utilities.js, and template
    resolution was the one brand-keyed lookup that did not.

    These assert the cascade rather than the files that happen to exist today:
    the order of the candidate list is the invariant, and each resolution is
    checked against the tier it should land on and against the tier below it,
    so adding `header/header the nosh project.js` to the library moves the
    expectation with it instead of failing.

    Confirmed load-bearing by mutation, 14 cases:
        parent tier removed from templateCandidates   6 fail
        `exists` always true                          6 fail
        tiers reordered, parent before brand          3 fail
        "greencross vets" out of its own parent list  7 fail
        reportTemplateFallbacks returns early         1 fail

    The last one catches only the case that asserts a warning is said, because
    the two beside it assert silence and an early return is silent. That is the
    detector working at the size it is: one case covers the message, two cover
    what must not produce one.

        node tests/template.js
*/

const fs = require("node:fs");
const path = require("node:path");

const repo_root = path.resolve(__dirname, "..");
const MODULES = path.join(repo_root, "external/lib/modules");

const { resolveTemplate, templateCandidates, reportTemplateFallbacks } = require(path.join(repo_root, "external/src/main/properties/template.js"));
const { setBrand } = require(path.join(repo_root, "external/src/main/properties/brand.js"));

const brands = JSON.parse(fs.readFileSync(path.join(repo_root, "external/lib/libraries/brands.json"), { encoding: "utf8" }));
const module_library = JSON.parse(fs.readFileSync(path.join(repo_root, "external/lib/libraries/modules.json"), { encoding: "utf8" }));

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
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) throw new Error(`${what || "value"}: expected ${e}, got ${a}`);
}

function ok(condition, what) {
    if (!condition) throw new Error(what);
}

/** Run something with console.warn captured, and hand back what it said. */
function quietly(fn) {
    const said = [];
    const real = console.warn;
    console.warn = (...args) => said.push(args.join(" "));
    try {
        fn();
    } finally {
        console.warn = real;
    }
    return said.join("\n");
}

const exists = (template) => fs.existsSync(path.join(MODULES, template));

/*
    A module as the engine has it by the time a template is resolved: named from
    modules.json, with both brands canonicalised. Built the way main.js builds
    one so that a change to either library shows up here.
*/
function moduleOf(type, brand) {
    const entry = module_library.module[type];
    if (!entry) throw new Error(`"${type}" is not a module type`);
    const canonical = setBrand(brand, brand);
    return Object.assign({ entity_type: "module", name: type }, entry.properties, {
        brand: canonical,
        parent_brand: setBrand(canonical, canonical, "parent")
    });
}

/** The module types that have one definition per brand. */
const FRAGMENT_TYPES = Object.keys(module_library.module).filter((type) => module_library.module[type].properties.fragment);

/** Every brand a brief can name, canonicalised. */
const ALL_BRANDS = Object.keys(brands["Brand Names"]);

// --------------------------------------------------------------- the cascade

check("the candidate list is brand, then parent brand, then default", () => {
    is(templateCandidates(moduleOf("header", "the nosh project")), ["header/header the nosh project.js", "header/header petbarn.js", "header/header default.js", "header/header.js", "default/default.js"]);
});

check("a brand with its own definition gets it", () => {
    is(resolveTemplate(moduleOf("header", "petbarn")), "header/header petbarn.js");
    is(resolveTemplate(moduleOf("header", "greencross vets")), "header/header greencross vets.js");
    is(resolveTemplate(moduleOf("footer", "petbarn")), "footer/footer petbarn.js");
});

check("a sub-brand with no definition of its own gets its parent's", () => {
    /*
        The case this file was written for. Asserted as "the same file the parent
        brand resolves to" rather than as a path, so it keeps saying what it
        means if Petbarn's header is renamed.
    */
    const nosh = moduleOf("header", "the nosh project");
    ok(!exists(templateCandidates(nosh)[0]), "The Nosh Project now has its own header -- point this case at a brand that does not");
    is(resolveTemplate(nosh), resolveTemplate(moduleOf("header", "petbarn")), "the nosh project header");

    const hpp = moduleOf("header", "healthy pets plus");
    ok(!exists(templateCandidates(hpp)[0]), "Healthy Pets Plus now has its own header -- point this case at a brand that does not");
    is(resolveTemplate(hpp), resolveTemplate(moduleOf("header", "greencross vets")), "healthy pets plus header");
});

/*
    The two brand-keyed types the library only has a Petbarn definition for.

    `signoff` and `shop your way` are Petbarn blocks in practice -- no Greencross
    Vets brief in tests/golden uses either, and the Shop Your Way tiles in the
    asset library are Petbarn's -- so a Greencross Vets one would have to be
    designed rather than derived, and that is a decision for the library rather
    than for this file to paper over. They are named here so the invariant below
    holds for everything else and fails the moment a *new* gap opens.

    Closing them means either a `footer/signoff greencross vets.js` or a
    `footer/signoff default.js`; the resolver already looks for both.
*/
const KNOWN_GAPS = [
    { brand: "greencross vets", type: "signoff" },
    { brand: "greencross vets", type: "shop your way" }
];

const isKnownGap = (brand, type) => KNOWN_GAPS.some((gap) => setBrand(gap.brand, gap.brand, "parent") == setBrand(brand, brand, "parent") && gap.type == type);

check("every brand resolves every brand-keyed module type to a real definition", () => {
    /*
        The whole point, stated over the two libraries rather than over a list
        written out here: no brand in brands.json may render a header, footer,
        signoff or Shop Your Way block that the library has no definition for.
    */
    ALL_BRANDS.forEach((brand) => {
        FRAGMENT_TYPES.forEach((type) => {
            const resolved = resolveTemplate(moduleOf(type, brand));
            ok(exists(resolved), `${brand} ${type} resolved to ${resolved}, which is not in lib/modules/`);
            if (isKnownGap(brand, type)) {
                ok(resolved == "default/default.js", `${brand} ${type} now resolves to ${resolved} -- remove it from KNOWN_GAPS`);
                return;
            }
            ok(resolved != "default/default.js", `${brand} ${type} fell all the way to default/default.js`);
        });
    });
});

check("the known gaps are the only brand-keyed types with no definition", () => {
    /*
        The other direction. Without this, adding a type to KNOWN_GAPS is enough
        to make the check above pass, and the list would quietly become the
        place gaps go to be forgotten.
    */
    const found = [];
    ALL_BRANDS.forEach((brand) => {
        FRAGMENT_TYPES.forEach((type) => {
            if (resolveTemplate(moduleOf(type, brand)) == "default/default.js") found.push(`${brand} ${type}`);
        });
    });
    const expected = [];
    ALL_BRANDS.forEach((brand) => {
        FRAGMENT_TYPES.forEach((type) => {
            if (isKnownGap(brand, type)) expected.push(`${brand} ${type}`);
        });
    });
    is(found.sort(), expected.sort(), "brand-keyed types with no definition");
});

check("a brand-keyed type never resolves to another parent's definition", () => {
    // A Petbarn sub-brand must not end up wearing Greencross Vets' header.
    ALL_BRANDS.forEach((brand) => {
        const item = moduleOf("header", brand);
        is(resolveTemplate(item), resolveTemplate(moduleOf("header", item.parent_brand)), `${brand} header, against its parent ${item.parent_brand}`);
    });
});

check("every brand has a parent brand, and it is a brand", () => {
    /*
        The cascade is only as good as `parent_brand`. "greencross vets" was
        missing from its own Parent Brands list until 01/10/2026, so the lookup
        matched nothing and setBrand returned its hard-coded default -- every
        Greencross Vets module carried `parent_brand: "Petbarn"`.
    */
    ALL_BRANDS.forEach((brand) => {
        const parent = setBrand(brand, brand, "parent");
        ok(Object.keys(brands["Parent Brands"]).includes(parent), `${brand} has parent "${parent}", which is not a parent brand`);
        ok(brands["Parent Brands"][parent].includes(brand), `${brand} resolves to parent "${parent}", which does not list it`);
    });
});

check("a parent brand is its own parent", () => {
    Object.keys(brands["Parent Brands"]).forEach((parent) => {
        is(setBrand(parent, parent, "parent"), parent, `${parent}'s parent`);
    });
});

// ------------------------------------------------------- the other direction

check("a module type with no brand in its name ignores brand entirely", () => {
    const hero = moduleOf("hero standard", "the nosh project");
    is(templateCandidates(hero), ["hero/hero standard.js", "default/default.js"]);
    is(resolveTemplate(hero), "hero/hero standard.js");
});

check("a type the library has no file for falls to the blank definition", () => {
    // `content block` is one of the four modules.json names with no file.
    is(resolveTemplate({ entity_type: "module", category: "basic", name: "content block" }), "default/default.js");
    is(resolveTemplate({ entity_type: "component", category: "component", name: "icon" }), "component/default.js");
});

check("resolution does not depend on how the brief spelled the brand", () => {
    const shouted = Object.assign(moduleOf("header", "petbarn"), { brand: "Petbarn", parent_brand: "Petbarn" });
    is(resolveTemplate(shouted), "header/header petbarn.js");
});

// ------------------------------------------------------------- the reporting

check("a fallback is reported once, naming both files", () => {
    const said = quietly(() => reportTemplateFallbacks([moduleOf("header", "the nosh project"), moduleOf("header", "the nosh project")]));

    is(said.split("\n").filter((line) => line.includes("using")).length, 1, "lines reporting a fallback");
    ok(said.includes("the nosh project"), `the warning names the brand: ${said}`);
    ok(said.includes("header/header the nosh project.js"), `the warning names the file to add: ${said}`);
    ok(said.includes(resolveTemplate(moduleOf("header", "petbarn"))), `the warning names the file used: ${said}`);
});

check("a brand with its own definition is not reported", () => {
    is(quietly(() => reportTemplateFallbacks([moduleOf("header", "petbarn"), moduleOf("footer", "greencross vets")])), "");
});

check("a module type that is not brand-keyed is not reported", () => {
    is(quietly(() => reportTemplateFallbacks([moduleOf("hero standard", "the nosh project")])), "");
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
