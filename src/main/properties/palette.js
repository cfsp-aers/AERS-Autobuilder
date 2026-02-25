const _ = require("lodash");

const { app_dir, user_files } = require("../constants.js");
const { load } = require("../utils/load.js");
const aers = load(app_dir, "main/utils/aers utilities.js");

const colour_library = load(user_files, "libraries/colour library.json");
const { setBrand } = load(app_dir, "main/properties/brand.js");

function setPalettes(db) {
    const { ms, cs } = db;

    db.ms = db.ms.map((m, i) => {
        const prev = i > 0 ? db.ms[i - 1] : {};

        if (m.name == prev.name) {
            m.palette = m.user_settings?.palette ? m.user_settings.palette : prev.palette;
            m.background = m.user_settings?.background ? m.user_settings.background : prev.background;
            m.colour = m.user_settings?.colour ? m.user_settings.colour : prev.colour;
        }
        if (m.depth == 2) {
            m.background ??= m.user_settings.background ? m.user_settings.background : db.ms[i - 1]?.background;
        }
        if (m.row_index > 1) {
            m.palette = m.user_settings?.palette ? m.user_settings.palette : db.ms[i - 1]?.palette;
        }
        m = setPalette(m, m.user_settings, m);

        db.cs[m.uuid]?.forEach((c) => {
            c = setPalette(c, c.user_settings, m);
        });
        if (m.depth == 1 && m.user_settings) {
            if (m.user_settings.palette) m.background = m.palette;
            else if (m.user_settings.colour) m.background = m.colour;
        }
        return m;
    });

    return;
}

function setPalette(item, user = {}, parent = {}) {
    if (item.entity_type === "component") {
    } else {
        item.palette = user.palette ? user.palette : item.palette || "default";
    }
    item.background = user.background ? user.background : item.background || null;
    item.colour = user.colour ? user.colour : item.colour || null;

    let active_palette;

    if (item.entity_type === "component") {
        if (item.type === "button") {
            const btn_brand = parent.palette.includes("/") ? setBrand(parent.palette.split("/")[0], item.brand) : item.brand.toLowerCase();
            item.brand = btn_brand;
            active_palette = getPalette(item.brand, item.parent_brand, parent.palette);

            const btn_lib = load(user_files, "libraries/button palettes.json");
            const btn_palettes = btn_lib[btn_brand] ? btn_lib[btn_brand] : btn_lib.default;

            if (item.palette == "primary") {
                item.palette = active_palette.button.primary;
            } else if (item.palette == "secondary") {
                item.palette = active_palette.button.secondary;
            }
            if (Object.keys(btn_palettes).indexOf(item.palette) < 0) {
                item.palette = "primary";
            }
            if (item.background != "transparent") {
                item.background = user.background ? user.background : btn_palettes[item.palette].background;
                item.colour = user.colour ? user.colour : btn_palettes[item.palette].colour;
            } else {
                item.colour = user.colour ? user.colour : active_palette.text.body;
            }

            item = setButtonColours(item, user, btn_palettes, active_palette);
        } else if (item.type === "image") {
        } else {
            item.palette = user.palette ? user.palette : parent.palette;
            active_palette = getPalette(item.brand, item.parent_brand, item.palette);
            item.palette = user.palette ? user.palette : parent.palette;
            item.background = user.background ? user.background : item.background;
            if (active_palette.text[item.colour]) {
                item.colour = active_palette.text[item.colour];
            } else {
                item.colour ??= active_palette.text.body || null;
            }
        }
    } else {
        active_palette = getPalette(item.brand, item.parent_brand, item.palette);

        if (item.depth == 2) {
            item.background = user.background ? user.background : item.background;
        } else {
            item.background ??= user.background ? user.background : active_palette.background;
        }

        item.colour = user.colour ? user.colour : active_palette.background;
    }

    /*
    special palettes (palette links per brand):
    - default
    - primary
    - secondary
    - accent
    - promo
    - light
    - neutral
    - dark
    // If palette exists here, swap it for the corresponding value

    overall palette colours
    - primary       : background colour :   yellow  /   black   /   white
    - secondary     : secondary colour :    white   /   white
    - text
        - primary   : specific colour name
        - secondary : specific colour name
        - body      : specific colour name
    - button
        - primary   : button palette name
        - secondary : button palette name

    cases:
    - module depth 1:
        - palette       :   changes overall colour scheme for module
        - background    :   changes overall colour scheme for module
        - colour        :   changes overall colour scheme for module

        if no palette given, try using background instead. If not valid, try colour. If not valid again, set palette to default and background to whatever the background was.

    - module depth 2
        - palette       :   changes overall colour scheme for ~container~
        - background    :   changes background behind ~container~
        - colour        :   changes overall colour scheme for ~container~
    
    - button
    // buttons should have their own palettes i.e. light = white bg, black text
    // naming for button palettes ? light/primary
        - palette       :   changes colour scheme for button
        - background    :   changes background behind ~container~
        - colour        :   changes overall colour scheme for ~container~

    */

    return item;
}

function setButtonColours(button, user, button_palettes, parent_palette) {
    button.palette = user.palette ? user.palette : button.palette || "primary";
    let active_palette = button_palettes[button.palette] ? button_palettes[button.palette] : button_palettes.primary;

    if (button.user_settings) {
        if (button.user_settings.palette?.includes("/") && !button_palettes[button.palette]) {
            button.background = button.user_settings.palette.split("/")[0];
            //button.user_settings.background = button.user_settings.palette.split("/")[0];
            button.colour = button.user_settings.palette.split("/")[1];
            //button.user_settings.colour = button.user_settings.palette.split("/")[1];
        }
    }

    if (button.mode == "underline" || button.mode == "outline") {
        button.colour = button.user_settings.colour ? button.user_settings.colour : parent_palette.text.body;
        button.background = parent_palette.background;
    }

    const result = {
        background: button.user_settings.background ? button.user_settings.background : active_palette.background,
        colour: button.user_settings.colour ? button.user_settings.colour : active_palette.colour
    };

    if (button.border_top == "match/background") button.border_top = result.background;
    if (button.border_right == "match/background") button.border_right = result.background;
    if (button.border_bottom == "match/background") button.border_bottom = result.background;
    if (button.border_left == "match/background") button.border_left = result.background;

    return { ...button, ...result };
}

function getPalette(item_brand, parent_brand, target_palette) {
    let palette = target_palette.includes("/") ? target_palette.split("/")[1] : target_palette?.toLowerCase();
    const brand = target_palette.includes("/") ? setBrand(target_palette.split("/")[0], item_brand) : item_brand.toLowerCase();

    let message = "";
    const default_palettes = load(user_files, `libraries/colour palettes/default palettes.json`);
    let parent_brand_palettes = default_palettes;
    try {
        parent_brand_palettes = load(user_files, `libraries/colour palettes/${parent_brand?.toLowerCase()} palettes.json`);
    } catch (_) {
        console.log("parent brand palette not found");
        message = " / no parent brand";
    }
    let brand_palettes = parent_brand_palettes;
    try {
        brand_palettes = load(user_files, `libraries/colour palettes/${brand?.toLowerCase()} palettes.json`);
    } catch (_) {
        console.log("brand palette not found");
        message = " / no brand palette";
    }

    if (brand_palettes["palette links"][palette]) {
        palette = brand_palettes["palette links"][palette];
    }

    if (brand_palettes[palette]) {
        return brand_palettes[palette];
    } else if (parent_brand_palettes[palette]) {
        message = ` / no brand : ${brand} ${palette} : palette`;
        return parent_brand_palettes[palette];
    } else if (default_palettes[palette]) {
        message = ` / no parent brand : ${parent_brand} ${palette} : palette`;
        return default_palettes[palette];
    } else {
        message = " / reverting to default";
        return default_palettes.default;
    }
}

function replacePalette(es, uuid) {
    ["colour", "background", "border_top", "border_right", "border_bottom", "border_left"].forEach((palette_item) => {
        if (!es[uuid][palette_item]) {
        } else {
            const brand = es[uuid][palette_item].includes("/") ? setBrand(es[uuid][palette_item].split("/")[0], es[uuid].brand) : es[uuid].brand.toLowerCase();
            const parent_brand = es[uuid].parent_brand.toLowerCase();
            const colour_name = es[uuid][palette_item].includes("/") ? es[uuid][palette_item].split("/")[1] : es[uuid][palette_item];

            console.log(brand, palette_item, colour_name);

            const default_colour_library = colour_library.default;
            const brand_colour_library = colour_library[brand] ? colour_library[brand] : colour_library[parent_brand];

            if (default_colour_library[colour_name]) es[uuid][palette_item] = default_colour_library[colour_name];

            if (brand_colour_library[colour_name]) es[uuid][palette_item] = brand_colour_library[colour_name];

            if (palette_item == "colour" && es[uuid].text_segments) {
                es[uuid].text_segments = es[uuid].text_segments.map((segment) => {
                    if (default_colour_library[segment.properties[colour_name]]) segment.properties[colour_name] = default_colour_library[segment.properties[colour_name]];
                    if (brand_colour_library[segment.properties[colour_name]]) segment[colour_name] = brand_colour_library[segment.properties[colour_name]];
                    return segment;
                });
            }
        }
    });

    return es[uuid];
}

module.exports = {
    setPalettes: setPalettes,
    replacePalette: replacePalette
};
