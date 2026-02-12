const _ = require("lodash");
const fs = require("fs");
const path = require("node:path");

const { user_files } = require("../constants.js");
const { load } = require("../utils/load.js");

const brand_library = load(user_files, "libraries/brands.json");

function setBrand(brand, fallback_brand, target_library) {
    let result = "Petbarn";

    const brand_search = brand ? brand.toLowerCase() : fallback_brand.toLowerCase();
    const library = target_library == "parent" ? "Parent Brands" : "Brand Names";

    _.forIn(brand_library[library], (value, key) => {
        if (value.indexOf(brand_search) >= 0) {
            result = key;
        }
    });

    return result;
}

module.exports = {
    setBrand: setBrand
};
