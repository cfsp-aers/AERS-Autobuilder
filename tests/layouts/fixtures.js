/*
    The synthetic input the layout snapshots call internal_layout() with, and
    the walk that finds the module definitions to call it on.

    Shared by tests/layouts/layouts.js, which snapshots the test library's
    modules, and tests/library.js, which only checks that the real library's
    modules lay out without throwing. Both must call internal_layout() the same
    way, or the smoke test would be checking something the snapshots are not.
*/

const fs = require("node:fs");
const path = require("node:path");

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
    they sit in, so requiring them would throw.
*/
function definition_files(modules_root) {
    return module_files(modules_root).filter((file) => !path.basename(file).endsWith("template.js"));
}

module.exports = {
    VARIANTS: VARIANTS,
    current_for: current_for,
    components_for: components_for,
    content_for: content_for,
    definition_files: definition_files
};
