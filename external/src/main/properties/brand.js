const _ = require("lodash");

const { user_files } = require("../constants.js");
const { load } = require("../utils/load.js");

const brand_library = load(user_files, "libraries/brands.json");

function setBrand(brand, fallback_brand, target_library) {
    /*
        Lower case, because every other brand this returns is a key of
        brands.json and those are all lower case. It read "Petbarn" until
        01/10/2026, and the one brand that reached it was Greencross Vets:
        "greencross vets" was missing from its own Parent Brands list, so the
        parent lookup for a GXV module matched nothing and fell to here. Every
        Greencross Vets module in the engine carried `parent_brand: "Petbarn"`,
        which then missed the lower-case colour library on the way back out.
    */
    let result = "petbarn";

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
