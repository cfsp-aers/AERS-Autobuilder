const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir, user_files } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const { setComponents } = load(app_dir, "main/systems/setComponents.js");

`
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            TEXT BLOCK
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
`;

const default_properties = {
    depth: 1,
    max_siblings: 1,
    padding: "0px 16px",
    palette: "light"
};

const component_positions = {
    all: ["image", "badge", "heading", "subheading", "bodycopy", "button", "terms"]
};

const internal_layout = (content) => {
    return {
        layout: "gridContainer",
        group: "internal",
        children: [
            {
                layout: "gridRow",
                group: "internal",
                children: [
                    {
                        layout: "gridCol",
                        group: "internal",
                        padding: "block_padding",
                        children: setComponents("all", content)
                    }
                ]
            }
        ]
    };
};

function modes() {}

function modify(uuid, db, find) {
    const { name, category, moduleType } = db.es[uuid];
    let item = db.es[uuid];
    const { update, at, previous, current, next, hasChild } = find;

    // ------------- BEGIN RULES -------------

    // ------------- END RULES -------------
}

function style(uuid, db, find) {
    const { name, category, moduleType } = db.es[uuid];
    let item = db.es[uuid];
    const { update, at, previous, current, next, hasChild } = find;

    // ------------- BEGIN RULES -------------

    if (next(1).type == "product") {
        update(current(), {
            palette: `${next(1).background}`,
            background: `${next(1).background}`
        });
    }

    // ------------- END RULES -------------
}

module.exports = {
    modify: modify,
    style: style,
    default_properties: default_properties,
    internal_layout: internal_layout,
    component_positions: component_positions,
    modes: modes
};
