const _ = require("lodash");
const { load } = require("../utils/load.js");
const { app_dir, user_files } = require("../constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");

const { formatSpacingToArray, formatSpacingToString, updateSpacing } = load(app_dir, "main/properties/spacing.js");

function formatProperties(item) {
    let new_item = {
        uuid: item.uuid || null,
        parent_uuid: item.parent_uuid || null,
        entity_type: item.entity_type || null,
        remove: item.remove || false,
        // ~~ module data ~~
        category: item.category || null,
        type: item.type || null,
        name: item.name || null,
        brand: item.brand || null,
        parent_brand: item.parent_brand || null,
        template: `${item.category ? item.category : "default"}/${item.name ? (item.fragment ? `${item.name} ${item.brand}` : item.name) : "default"}.js` || null,
        config: [`${item.category ? item.category : "default"} config.js`, `${item.type ? item.type : "default"} config.js`] || null,
        position: item.position || null,
        //btn_group: item.btn_group || null,
        depth: item.depth || 1,
        max_siblings: item.max_siblings || 1,
        row_index: item.row_index || null,
        mode: item.mode || null,
        transition: item.transition || false,
        // ~~ palette ~~
        palette: item.palette || null,
        colour: item.colour || null,
        background: item.background || null,
        // ~~ spacing ~~
        vertical_align: item.vertical_align || null,
        padding: item.padding ? formatSpacingToString(item.padding) : null,
        container_padding: item.container_padding ? formatSpacingToString(item.container_padding) : null,
        block_padding: item.block_padding ? formatSpacingToString(item.block_padding) : null,
        //group_padding: item.group_padding ? updateSpacing(item.group_padding, ["_", 0, "_", 0]) : null,
        margin: item.margin ? formatSpacingToString(item.margin) : null,
        inner_padding: item.inner_padding ? formatSpacingToString(item.inner_padding) : null,
        // ~~ font ~~
        font_size: item.font_size || null,
        line_height: item.line_height || null,
        font_weight: item.font_weight || null,
        text_align: item.text_align || null,
        font: item.font || null,
        text_size_class: item.text_size_class || null,
        // ~~ border ~~
        border_radius: item.border_radius || null,
        border_colour: item.border_colour || null,
        border_top: item.border_top || null,
        border_right: item.border_right || null,
        border_bottom: item.border_bottom || null,
        border_left: item.border_left || null,
        // ~~ size ~~
        height: item.height || null,
        width: item.width || null,
        // ~~ other ~~
        dynamic_content: item.dynamicContent ? item.dynamicContent.replaceAll(" ", "_") : null,
        user_settings: item.user_settings || {}
    };

    //_.forIn(new_item, (value, key) => delete original[key]);
    const result = {
        ...new_item,
        ...item,
        ...new_item
    };
    return result;
}

module.exports = {
    formatProperties: formatProperties
};
