const fs = require("fs");
const path = require("node:path");

const { user_files } = require("../constants.js");

/*
    Which module definition a module or component runs.

    `fragment: true` in libraries/modules.json means a module type has one
    definition per brand, and the brand is appended to the file name -- a
    Petbarn header is `header/header petbarn.js`. Four types carry it: `header`,
    `footer`, `signoff` and `shop your way`.

    Most brands have no definition of their own. Eight of the ten in brands.json
    are sub-brands with neither a header nor a footer, and until this file
    existed every one of them fell straight past its parent's definition to
    `default/default.js` -- a generic single column with no logo, no nav and the
    wrong palette, chosen silently. A Nosh Project email rendered nothing that
    identified it as a Petbarn brand.

    So the definition is looked for in tiers, each falling back to the one under
    it. That is how properties/palette.js already chooses a palette file and how
    utils/style utilities.js already chooses a colour -- brand, then parent
    brand, then default. Nothing new is being invented here; template resolution
    was the one brand-keyed lookup in the engine that did not do it.

    Deliberately not memoised. `load()` hands out a fresh instance of this file
    to every caller, so a cache here would be several caches; worse, the library
    is edited while the app is running, and a cache would mean a header added for
    a sub-brand did not take effect until the next launch. A build asks about
    thirty modules across ten passes and the common case is one existsSync, which
    is not worth defending against.
*/

/**
    Every definition that could configure this item, best first.

    Exported for tests/template.js, which asserts the order rather than the one
    file that happens to exist today.

    @param {object} item a module or component record
    @returns {string[]} paths relative to lib/modules/
*/
function templateCandidates(item) {
    const category = item.category || "default";
    const file = item.name || "default";

    // The two blank scaffolds a definition is copied from, by entity type.
    const ultimate = item.entity_type == "component" ? "component/default.js" : "default/default.js";

    // Lower-cased so resolution does not depend on whether the filesystem
    // happens to be case-sensitive. setBrand() returns canonical lower-case
    // brands, but formatProperties also runs before main.js canonicalises them,
    // where the brand is still whatever the brief's Brand column said.
    const brand = item.brand ? String(item.brand).toLowerCase() : null;
    const parent_brand = item.parent_brand ? String(item.parent_brand).toLowerCase() : null;

    if (!item.fragment) return [`${category}/${file}.js`, ultimate];

    return [
        brand ? `${category}/${file} ${brand}.js` : null,
        // The tier this file was added for.
        parent_brand && parent_brand != brand ? `${category}/${file} ${parent_brand}.js` : null,
        /*
            A definition a brand-keyed type can fall back to without naming a
            brand. `footer/footer default.js` has been in the library since the
            beta and had never once been loaded: it needs a brand of "default"
            and setBrand() only ever returns a real one. docs/TODO.md records it
            as "finished work that was never wired up". This is the wire.
        */
        `${category}/${file} default.js`,
        `${category}/${file}.js`,
        ultimate
    ].filter(Boolean);
}

/** Whether lib/modules/ holds this definition. */
function exists(template) {
    return fs.existsSync(path.resolve(path.join(user_files, "modules", template)));
}

/**
    The definition this item runs: the first candidate that exists.

    Always returns a path that exists, because the last candidate is one of the
    two defaults and both are in the library. Callers do not need to check.

    @param {object} item a module or component record
    @returns {string} a path relative to lib/modules/
*/
function resolveTemplate(item) {
    const candidates = templateCandidates(item);
    return candidates.find(exists) || candidates[candidates.length - 1];
}

/*
    Say which modules did not get their own brand's definition.

    A fallback is the ordinary case for a sub-brand and not an error, so this
    reports rather than throws. It reports at all because the silence is what
    hid the old behaviour: a designer whose Nosh Project header rendered as a
    bare grey block had nothing anywhere telling them why.

    Called once per sheet from main.js rather than from resolveTemplate(),
    which runs some thousands of times a build and has no idea where one build
    ends and the next begins.
*/
function reportTemplateFallbacks(items) {
    const said = new Set();

    items.forEach((item) => {
        if (!item.fragment || !item.brand) return;

        const wanted = templateCandidates(item)[0];
        if (exists(wanted)) return;

        const got = resolveTemplate(item);
        const signature = `${wanted} ${got}`;
        if (said.has(signature)) return;
        said.add(signature);

        console.warn(`No ${item.name} for ${item.brand} -- using ${got}.\n` + `    Add lib/modules/${wanted} to give ${item.brand} its own.`);
    });
}

module.exports = {
    resolveTemplate: resolveTemplate,
    templateCandidates: templateCandidates,
    reportTemplateFallbacks: reportTemplateFallbacks
};
