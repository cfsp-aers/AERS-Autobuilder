const _ = require("lodash");
const { load } = require("../utils/load.js");
const { app_dir, user_files } = require("../constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const clr_lib = load(user_files, "libraries/colour library.json");

function cleanUp(item, obj) {
    obj.remove ??= [];
    obj.keep ??= [];
    if (obj.empty === true) {
        return _.omitBy(item, (v, k) => obj.keep.indexOf(k) < 0 && (obj.remove.indexOf(k) >= 0 || (_.isEmpty(v) && !_.isInteger(v) && JSON.stringify(v) != "false" && JSON.stringify(v) != "true")));
    } else {
        return _.omitBy(item, (v, k) => obj.keep.indexOf(k) < 0 && obj.remove.indexOf(k) >= 0);
    }
}

function replaceColours(obj, parent_obj) {
    const stack = [obj];
    while (stack?.length > 0) {
        const currentObj = stack.pop();
        Object.keys(currentObj).forEach((key) => {
            currentObj[key] = getColour(currentObj[key], key, parent_obj);
            if (typeof currentObj[key] === "object" && currentObj[key] !== null) {
                stack.push(currentObj[key]);
            }
        });
    }
    return obj;
}
function getColour(v, k, p_obj) {
    //console.log(clr_lib[p_obj.brand], v);
    if (k == "palette") return v;
    if (typeof v == "string" && v.includes("match/")) {
        v = p_obj[v.split("/")[1]];
    }
    try {
        let result;
        if (clr_lib[p_obj.brand] && clr_lib[p_obj.brand][v]) result = clr_lib[p_obj.brand][v];
        else if (clr_lib[p_obj.parent_brand] && clr_lib[p_obj.parent_brand][v]) result = clr_lib[p_obj.parent_brand][v];
        else if (clr_lib.default[v]) result = clr_lib.default[v];
        else result = v;

        return result;
    } catch (e) {
        aers.log(`~~ error : ${p_obj.uuid}\n->${e.message}`);
    }
}

module.exports = {
    cleanUp: cleanUp,
    replaceColours: replaceColours
};
