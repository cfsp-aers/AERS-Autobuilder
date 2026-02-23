const _ = require("lodash");
const fs = require("fs");
const path = require("node:path");

const { load } = require("../utils/load.js");

const { app_dir, user_files } = require("../constants.js");

const aers = load(app_dir, "main/utils/aers utilities.js");
const util = load(app_dir, "main/utils/style utilities.js");
const { formatProperties } = load(app_dir, "main/systems/formatObjects.js");
const id_lib = load(user_files, "libraries/modules.json");

function structureEDM(arr, children = {}) {
    arr = arr.reduce((acc, o) => {
        if (o.ignore == true) {
            aers.log(o);
            return acc;
        }
        acc.push(util.cleanUp(formatProperties(o), { empty: true }));
        return acc;
    }, []);

    let result = arr.map((m, i) => {
        const prev = arr[i - 1] ? arr[i - 1] : arr[i];
        let rules_location = `modules/default/default.js`;
        if (fs.existsSync(path.resolve(path.join(user_files, `modules/${m.template}`)))) {
            rules_location = `modules/${m.template}`;
        }

        const { internal_layout, component_positions } = load(user_files, rules_location);

        let c_pos = {};
        _.forIn(component_positions, (value, key) => {
            c_pos[key] = _.filter(children[m.uuid], (c) => value.indexOf(c.name) >= 0);
            if (c_pos[key].length == 0) delete c_pos[key];
        });

        m.transition = _.trimStart(prev.background, "#");
        m.transition_id = id_lib.transition_ids?.[m.transition];
        m.children = [internal_layout(m, c_pos)];

        if (m.depth == 2) {
            return {
                block: "container",
                uuid: m.uuid,
                background: m.colour,
                padding: m.container_padding,
                children: [m]
            };
        } else {
            return m;
        }
    });

    // moduleColumn
    result = result.reduce((acc, item, index) => {
        const child_index = _.findIndex(arr, (m) => m.uuid == item.uuid);
        const child = arr[child_index];
        const prev = arr[child_index - 1] ? arr[child_index - 1] : arr[child_index];
        const grouped_item = {
            name: "module column",
            block: "gridCol",
            uuid: child.uuid,
            padding: child.padding,
            children: [item]
        };
        // conditions for grouping
        if (child.type == "fragment" || child.fragment == true) acc.push(item);
        else if (prev.type == "fragment" || prev.fragment == true) acc.push(grouped_item);
        else if (start_new_module_column(child, prev) === true) acc.push(grouped_item);
        else _.last(acc).children.push(item);
        return acc;
    }, []);

    // moduleContainer

    result = result.reduce((acc, item, index) => {
        const child_index = _.findIndex(arr, (m) => m.uuid == item.uuid);
        const child = arr[child_index];
        const prev = arr[child_index - 1] ? arr[child_index - 1] : arr[child_index];
        const grouped_item = {
            name: "module container",
            block: "gridContainer",
            nav_label: "module",
            innerLayout: "single_row",
            uuid: child.uuid,
            children: [item]
        };
        if (child.type == "fragment" || child.fragment == true) acc.push(item);
        else if (prev.type == "fragment" || prev.fragment == true) acc.push(grouped_item);
        else if (start_new_module_container(child, prev) === true) acc.push(grouped_item);
        else _.last(acc).children.push(item);
        return acc;
    }, []);

    // blockColumn
    result = result.reduce((acc, item, index) => {
        const child_index = _.findIndex(arr, (m) => m.uuid == item.uuid);
        const child = arr[child_index];
        const prev = arr[child_index - 1] ? arr[child_index - 1] : arr[child_index];
        const grouped_item = {
            name: "block column",
            block: "gridCol",
            nav_label: "block_column",
            uuid: child.uuid,
            vertical_align: "top",
            width: child.column_width,
            children: [item]
        };
        if (child.type == "fragment" || child.fragment == true) acc.push(item);
        else if (prev.type == "fragment" || prev.fragment == true) acc.push(grouped_item);
        else if (start_new_block_column(child, prev) === true) acc.push(grouped_item);
        else _.last(acc).children.push(item);
        return acc;
    }, []);

    // blockRow
    result = result.reduce((acc, item, index) => {
        const child_index = _.findIndex(arr, (m) => m.uuid == item.uuid);
        const child = arr[child_index];
        const prev = arr[child_index - 1] ? arr[child_index - 1] : arr[child_index];
        const grouped_item = {
            name: "block row",
            block: "gridRow",
            nav_label: "block_row",
            uuid: child.uuid,
            children: [item]
        };
        if (child.type == "fragment" || child.fragment == true) acc.push(item);
        else if (prev.type == "fragment" || prev.fragment == true) acc.push(grouped_item);
        else if (start_new_block_row(child, prev) === true) acc.push(grouped_item);
        else _.last(acc).children.push(item);
        return acc;
    }, []);

    // blockContainer
    result = result.reduce((acc, item, index) => {
        const child_index = _.findIndex(arr, (m) => m.uuid == item.uuid);
        const child = arr[child_index];
        const prev = arr[child_index - 1] ? arr[child_index - 1] : arr[child_index];
        //child.transition = child.background != prev.background ? true : child.transition;
        const grouped_item = {
            name: "block container",
            block: "gridContainer",
            uuid: child.uuid,
            nav_label: "block",
            background: child.background,
            padding: child.block_padding,
            transition: _.trimStart(_.last(acc)?.background, "#"),
            placeholder_component: child.dynamic_content?.split("/")[1] == "x" ? true : false,
            children: [item]
        };
        if (_.trimStart(grouped_item.background, "#") == grouped_item.transition) grouped_item.transition = false;
        else if (prev.hide_transition === true) grouped_item.transition = false;
        if (child.type == "fragment" || child.fragment == true) acc.push(item);
        else if (prev.type == "fragment" || prev.fragment == true) acc.push(grouped_item);
        else if (start_new_block_container(child, prev) === true) acc.push(grouped_item);
        else _.last(acc).children.push(item);
        return acc;
    }, []);

    /*
    
    // groupColumn
    result = result.reduce((acc, item, index) => {
        const child_index = _.findIndex(arr, (m) => m.uuid == item.uuid);
        const child = arr[child_index];
        const prev = arr[child_index - 1] ? arr[child_index - 1] : arr[child_index];
        const grouped_item = {
            name: "group column",
            block: "gridCol",
            uuid: child.uuid,
            children: [item]
        };
        if (child.type == "fragment" || child.fragment == true) acc.push(item);
        else if (prev.type == "fragment" || prev.fragment == true) acc.push(grouped_item);
        else if (start_new_group_column(child, prev) === true) acc.push(grouped_item);
        else _.last(acc).children.push(item);
        return acc;
    }, []);

    // groupRow
    result = result.reduce((acc, item, index) => {
        const child_index = _.findIndex(arr, (m) => m.uuid == item.uuid);
        const child = arr[child_index];
        const prev = arr[child_index - 1] ? arr[child_index - 1] : arr[child_index];
        const grouped_item = {
            name: "group row",
            block: "gridRow",
            uuid: child.uuid,
            children: [item]
        };
        if (child.type == "fragment" || child.fragment == true) acc.push(item);
        else if (prev.type == "fragment" || prev.fragment == true) acc.push(grouped_item);
        else if (start_new_group_row(child, prev) === true) acc.push(grouped_item);
        else _.last(acc).children.push(item);
        return acc;
    }, []);

    // groupContainer
    result = result.reduce((acc, item, index) => {
        const child_index = _.findIndex(arr, (m) => m.uuid == item.uuid);
        const child = arr[child_index];
        const prev = arr[child_index - 1] ? arr[child_index - 1] : arr[child_index];
        const grouped_item = {
            name: "group container",
            block: "gridContainer",
            nav_label: child.dynamic_content ? `dynamic_block_${child.dynamic_content}` : "group",
            uuid: child.uuid,
            children: [item]
        };
        if (child.type == "fragment" || child.fragment == true) acc.push(item);
        else if (prev.type == "fragment" || prev.fragment == true) acc.push(grouped_item);
        else if (start_new_group_container(child, prev) === true) acc.push(grouped_item);
        else _.last(acc).children.push(item);
        return acc;
    }, []);


    */

    // structure
    result = result.reduce((acc, item, index) => {
        const child_index = _.findIndex(arr, (m) => m.uuid == item.uuid);
        const child = arr[child_index];
        const prev = arr[child_index - 1] ? arr[child_index - 1] : arr[child_index];
        const grouped_item = {
            name: "structure",
            structure: "structure",
            uuid: child.uuid,
            ignore: child.ignore,
            children: [item]
        };
        if (child.type == "fragment" || child.fragment == true) acc.push(item);
        else if (prev.type == "fragment" || prev.fragment == true) acc.push(grouped_item);
        else if (start_new_structure(child, prev) === true) acc.push(grouped_item);
        else _.last(acc).children.push(item);
        return acc;
    }, []);

    return result;

    //aers.updateEntityStore(es);
}
function start_new_module_column(child, prev) {
    return true;
}
function start_new_module_container(child, prev) {
    if (start_new_block_column(child, prev)) return true;
    return true;
}
function start_new_block_column(child, prev) {
    if (start_new_block_row(child, prev)) return true;
    return true;
}
function start_new_block_row(child, prev) {
    if (start_new_block_container(child, prev)) return true;
    if (child.row_index == 1) return true;
    return false;
}
function start_new_block_container(child, prev) {
    if (start_new_structure(child, prev)) return true;
    if (child.name != prev.name) return true;
    if (child.group_size != prev.group_size) return true;
    if (child.background != prev.background) return true;
    //if (child.row_index == 1) return true;
    return false;
}
/*
function start_new_group_column(child, prev) {
    //if (start_new_group_row(child, prev)) return true;
    return false;
}
function start_new_group_row(child, prev) {
    //if (start_new_group_container(child, prev)) return true;
    return false;
}
function start_new_group_container(child, prev) {
    if (start_new_structure(child, prev)) return true;
    //if (child.inVersions != prev.inVersions) return true;
    //if (child.dynamic_content != prev.dynamic_content) return true;
    return false;
}
*/
function start_new_structure(child, prev) {
    if (child.dynamicContent?.split("/")[0] != prev.dynamicContent?.split("/")[0]) {
        return true;
    }

    return false;
}

module.exports = {
    structureEDM: structureEDM
};
