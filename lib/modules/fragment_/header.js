const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir, user_files } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const { setComponents } = load(app_dir, "main/systems/setComponents.js");
//
//

`~~~~~~~~~~~ MODULE NAME ~~~~~~~~~~~`;

const default_properties = {
    // ~~ module data ~~
    depth: 1,
    max_siblings: 1,

    // ~~ palette ~~
    palette: "dark",

    // ~~ spacing ~~
    vertical_align: "top",
    padding: "0px",
    container_padding: "0px",
    block_padding: "0px",
    group_padding: "0px"
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
    const { update, at, previous, current, next } = find;

    // ------------- BEGIN RULES -------------

    // ------------- END RULES -------------
}

function style(uuid, db, find) {
    const { name, category, moduleType } = db.es[uuid];
    let item = db.es[uuid];
    const { update, at, previous, current, next, hasChild } = find;

    // ------------- BEGIN RULES -------------

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
