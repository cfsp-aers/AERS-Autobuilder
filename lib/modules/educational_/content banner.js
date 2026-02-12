const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir, user_files } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const { setComponents } = load(app_dir, "main/systems/setComponents.js");

`
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            PRODUCT TILE
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
`;

const default_properties = {
    // ~~ module data ~~
    depth: 1,
    max_siblings: 1,

    // ~~ palette ~~
    palette: "secondary",
    background: null,

    // ~~ spacing ~~
    vertical_align: "top",
    group_padding: "0px",
    block_padding: "16px",
    padding: "16px",
    container_padding: "0px",

    // ~~ border ~~
    border_radius: "24px"
};

const component_positions = {
    left: ["image"],
    right: ["badge", "heading", "subheading", "bodycopy", "button", "terms"]
};

const internal_layout = (content) => {
    return {
        layout: "gridContainer",
        group: "internal",
        background_colour: "background_colour",
        children: [
            {
                layout: "gridRow",
                group: "internal",
                children: [
                    {
                        layout: "gridCol",
                        group: "internal",
                        padding: "0px",
                        children: setComponents("left", content)
                    },
                    {
                        layout: "gridCol",
                        group: "internal",
                        padding: "16px",
                        children: setComponents("right", content)
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

    // if the product banner has a badge, add some spacing above the component underneath it
    if (hasChild("badge")) {
        update(current(), {
            "component/3": {
                padding: "8px 0px 0px"
            }
        });
    }

    update(current(), {
        component: { text_align: "left" },
        "heading/1": { mode: "h5" },
        subheading: { mode: "h7" },
        bodycopy: { padding: "0px 0px 8px" }
    });

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
