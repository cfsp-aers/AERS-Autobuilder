const _ = require("lodash");
const fs = require("fs");
const path = require("node:path");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir, user_files } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const util = load(app_dir, "main/utils/style utilities.js");

const { formatProperties } = load(app_dir, "main/systems/formatObjects.js");

const { moduleTargets, componentTargets } = load(app_dir, "main/systems/stylingSystem.js");
const { formatSpacingToArray, formatSpacingToString, updateSpacing } = load(app_dir, "main/properties/spacing.js");

function applyModifications(db, func, max_loops) {
    let loops = 0;

    while (loops < max_loops) {
        db.ms.forEach((m, i) => {
            m.user_settings ??= {};
            let rules = load(user_files, `modules/default/default.js`);

            if (fs.existsSync(path.resolve(path.join(user_files, `modules/${m.template}`)))) rules = load(user_files, `modules/${m.template}`);
            else; //console.log("no rules for", m.name);

            const module_targets = moduleTargets(db, i);

            const sf = {
                update: (target_module, object, overwrite = true) => update_item(rules.default_properties)(target_module, object, overwrite)
            };

            function update_item(default_properties) {
                return function update(target_module, object, overwrite) {
                    _.forIn(object, (value, key) => {
                        if (typeof value == "object") {
                            if (key == "lock") {
                                overwrite === true ? (target_module.locked_settings = value) : (target_module.locked_settings ??= value);
                            } else {
                                if (key.includes("[")) {
                                    const component_name_list = key.split(",").map((k) => _.trim(k, "[ ]"));
                                    console.log(component_name_list);
                                } else {
                                    const i_list = key.includes("/") ? formatIndices(key.split("/")[1]) : ["all"];
                                    const component_name = key.includes("/") ? key.split("/")[0] : key;
                                    const valid_components = _.filter(db.cs[target_module.uuid], (c) => c.name == component_name || component_name == "components") || {};
                                    valid_components.forEach((c, index) => {
                                        if (i_list.indexOf(index) >= 0 || i_list[0] == "all") update(c, value, overwrite);
                                    });
                                }
                            }
                        } else {
                            overwrite === true ? (target_module[key] = value) : (target_module[key] ??= value);
                            if (key.includes("padding")) {
                                const default_padding_array = default_properties[key] ? formatSpacingToArray(default_properties[key]) : target_module[key];
                                target_module[key] = updateSpacing(default_padding_array, target_module[key]);
                                if (target_module.user_settings) {
                                    if (target_module.user_settings[key]) {
                                        target_module.user_settings[key] = updateSpacing(default_padding_array, target_module.user_settings[key]);
                                    }
                                }
                            }
                        }
                    });
                };
            }

            if (db.cs[m.uuid]) {
                db.cs[m.uuid].forEach((c, c_i) => {
                    const component_targets = componentTargets(db, c_i, m);
                    let component_rules = load(user_files, `modules/component/default.js`);
                    if (fs.existsSync(path.resolve(path.join(user_files, `modules/${c.template}`)))) component_rules = load(user_files, `modules/${c.template}`);
                    const csf = { update: (target_module, object, overwrite = true) => update_item(component_rules.default_properties)(target_module, object, overwrite) };

                    if (component_rules.setupRules) component_rules.setupRules(component_targets, csf);

                    component_rules[func]();
                    csf.update(c, c.user_settings);
                    csf.update(c, c.locked_settings);
                    /*
                    if (func == "style") {
                        sf.update(m, {
                            [c.name]: { position: _.findKey(rules.component_positions, (v) => v.indexOf(c.name) >= 0) }
                        });
                    }*/
                });
            }
            if (rules.setupRules) rules.setupRules(module_targets, sf);
            rules[func](db.cs);
            sf.update(m, m.user_settings);
            sf.update(m, m.locked_settings);

            rules = null;
        });
        db.ms = updateItems(db.ms);
        loops += 1;
    }
    aers.log(`${func} looped ${loops} times`);
}

function formatIndices(indice_string) {
    let result = [];
    if (indice_string.includes(",")) {
        result = indice_string.split(",");
    } else if (indice_string.includes(":")) {
        const start = indice_string.split(":")[0];
        const end = indice_string.split(":")[1];
        for (let i = start; i <= end; i++) {
            result.push(i);
        }
    } else {
        result = [indice_string];
    }
    result = result.map((i) => _.toInteger(i) - 1);
    return result;
}

function updateItems(arr) {
    let result = _.cloneDeep(arr);
    result = result.map((m) => util.cleanUp(formatProperties(m), { empty: true }));
    return result;
}

module.exports = {
    applyModifications: applyModifications
};
