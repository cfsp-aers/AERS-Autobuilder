const _ = require("lodash");
const fs = require("fs");
const path = require("node:path");

const { load } = require("../utils/load.js");

const { app_dir, user_files } = require("../constants.js");

const aers = load(app_dir, "main/utils/aers utilities.js");

const target = (arr, i) => (modifier) => {
    if (_.isEmpty(arr)) return {};

    return arr[i + modifier] || (modifier < 0 ? arr[0] : _.last(arr));
};

function moduleTargets(db, i) {
    const module_targets = {
        previous_item: previous_item(db, i),
        current_item: current_item(db, i),
        next_item: next_item(db, i),
        module_at: module_at(db, i),
        childAt: childAt(db, i),
        childOf: childOf(db, i)
    };
    return module_targets;
}
function componentTargets(db, i, m) {
    const component_targets = {
        previous_item: target(db.cs[m.uuid], i)(-1),
        current_item: target(db.cs[m.uuid], i)(0),
        next_item: target(db.cs[m.uuid], i)(1),
        item_at: (x) => target(db.cs[m.uuid], i)(x)
    };
    return component_targets;
}

const previous_item = (db, i) => target(db.ms, i)(-1);
const current_item = (db, i) => target(db.ms, i)(0);
const next_item = (db, i) => target(db.ms, i)(1);
const module_at = (db, i) => (x) => {
    target(db.ms, i)(x);
};
const childAt =
    (db, i) =>
    (x, indx = 1) =>
        target(db.cs[x.uuid], indx - 1)(0);
const childOf =
    (db, i) =>
    (target_module, component_name, x = 1) =>
        _.filter(db.cs[target_module.uuid], (c) => c.name == component_name || component_name == "any")?.[x - 1] || {};

module.exports = {
    moduleTargets: moduleTargets,
    componentTargets: componentTargets
};
