const _ = require("lodash");
const { load } = require("../utils/load.js");
const { app_dir, user_files, database } = require("../constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const util = load(app_dir, "main/utils/style utilities.js");

const module_library = load(user_files, "libraries/modules.json");
const { setBrand } = load(app_dir, "main/properties/brand.js");
const { formatProperties } = load(app_dir, "main/systems/formatObjects.js");

function setup_excel(raw_item) {
    let lookup;
    let name;
    if (raw_item.moduleType) {
        lookup = "module";
        name = raw_item.moduleType;
    }
    if (raw_item.component) {
        lookup = "component";
        name = raw_item.component;
    }
    let item_data = {};
    item_data = _.find(module_library[lookup], (item) => {
        if (raw_item.moduleType) {
            return item.valid_names.indexOf(raw_item.moduleType) >= 0 || raw_item.moduleType === item.module;
        }
        if (raw_item.component) {
            return item.valid_names.indexOf(raw_item.component) >= 0 || raw_item.component === item.component;
        }
    });

    // if (raw_item.moduleType) console.log(raw_item.moduleType);

    return {
        uuid: "",
        [lookup]: name,
        ..._.omit(item_data, "valid_names"),
        original: { ..._.omit(raw_item, "content"), raw_id: `${Math.random().toString(36).slice(4).toUpperCase()}` },
        user_settings: raw_item.settings ? formatUserInput(raw_item.settings) : {},
        content: raw_item.content
    };
}

function setup_offer_library(offer_lib) {
    let result = {};
    offer_lib.forEach((offer_item) => {
        result[offer_item.offerAlias] = [];
        _.forIn(offer_item, (value, key) => {
            switch (key) {
                case "offerImage":
                    result[offer_item.offerAlias].push({ component: "image", content: offer_item.offerAlias });
                    break;
                case "calloutBadge":
                    result[offer_item.offerAlias].push({ component: "badge", content: offer_item.calloutBadge });
                    break;
                case "supportCallout":
                    result[offer_item.offerAlias].push({ component: "support callout", content: offer_item.supportCallout });
                    break;
                case "mainOffer":
                    result[offer_item.offerAlias].push({ component: "main offer", content: `${offer_item.mainOffer}^${offer_item.disclaimerSymbol}` });
                    break;
                case "secondaryOffer":
                    result[offer_item.offerAlias].push({ component: "secondary offer", content: offer_item.secondaryOffer });
                    break;
                case "offerDescription":
                    result[offer_item.offerAlias].push({ component: "description", content: offer_item.offerDescription });
                    break;
                case "ctaLink":
                    result[offer_item.offerAlias].push({ component: "button", content: `${offer_item.ctaLink?.includes("store-finder") ? "FIND A STORE" : "SHOP NOW"} (${offer_item.ctaLink})` });
                    break;
            }
        });
    });
    return result;
}

function setupContent(arr, offers) {
    let result = arr.reduce((acc, object, index) => {
        if (index == 0) {
            object.subject_line = _.trim(object.content.split("\n")[0].split(":")[1]);
            object.preheader = _.trim(object.content.split("\n")[1].split(":")[1]);
        }

        if (!object.entity_type && !object.moduleType && !object.component && !object.content) return acc;
        const item = { ...setBasicProperties(object, arr[0]), ...object, user_settings: getUserSettings(object) };

        if (acc[0] && acc[0].user_settings?.transactional === true) {
            item.transactional = true;
        }

        if (item.entity_type == "component" && item.type != "image" && !item.content) {
            return acc;
        }

        if (object.offerDetails) {
            acc.push(item);
            const offerItem = _.find(offers, (o) => o.offerAlias == object.content);

            acc.push({ ...setBasicProperties({ component: "image", content: offerItem.offerAlias }, arr[0]), ...{ component: "image", content: offerItem.offerAlias } });

            if (offerItem.calloutBadge) acc.push({ ...setBasicProperties({ component: "badge", content: offerItem.calloutBadge }, arr[0]), ...{ component: "badge", content: offerItem.calloutBadge } });

            if (offerItem.mainOffer) acc.push({ ...setBasicProperties({ component: "heading", content: `${offerItem.mainOffer}${offerItem.disclaimerSymbol ? `^${offerItem.disclaimerSymbol}` : ""}` }, arr[0]), ...{ component: "heading", content: `${offerItem.mainOffer}${offerItem.disclaimerSymbol ? `^${offerItem.disclaimerSymbol}` : ""}` } });

            if (offerItem.secondaryOffer) acc.push({ ...setBasicProperties({ component: "subheading", content: offerItem.secondaryOffer }, arr[0]), ...{ component: "subheading", content: offerItem.secondaryOffer } });

            acc.push({ ...setBasicProperties({ component: "bodycopy", content: offerItem.offerDescription }, arr[0]), ...{ component: "bodycopy", content: offerItem.offerDescription } });

            acc.push({ ...setBasicProperties({ component: "button", content: offerItem.ctaLink?.includes("store-finder") ? `FIND A STORE (${offerItem.ctaLink})` : `SHOP NOW (${offerItem.ctaLink})` }, arr[0]), ...{ component: "button", content: offerItem.ctaLink?.includes("store-finder") ? `FIND A STORE (${offerItem.ctaLink})` : `SHOP NOW (${offerItem.ctaLink})` } });
        } else if (item.name == "button") {
            if (item.content.includes("\n")) {
                const btn_list = item.content.split("\n");
                btn_list.forEach((btn, index) => {
                    acc.push({ ...item, row_index: index + 1, content: btn });
                });
            } else {
                acc.push(item);
            }
        } else {
            acc.push(item);
        }
        return acc;
    }, []);
    return result;
}

function setBasicProperties(object, header = {}) {
    /*
    Object being recieved: {
        moduleType: "",
        component: "",
        content: "",
        offerDetails: "",
        brand: "",
        inVersions: "",
        settings: "",
        styling: "",
        notes: ""
    }
    */

    let entity_type = object.entity_type ? object.entity_type : undefined;
    let target_value = "name";

    object.moduleType = object.moduleType ? object.moduleType.toLowerCase() : null;
    object.component = object.component ? object.component.toLowerCase() : null;

    if (object.entity_type) {
        entity_type = object.entity_type;
        target_value = "name";
    } else {
        switch (true) {
            case object.moduleType && !object.component:
                entity_type = "module";
                target_value = "moduleType";
                break;
            case object.component && !object.moduleType:
                entity_type = "component";
                target_value = "component";
                break;
            default:
                break;
        }
        object.dynamicContent ??= object.versions;
        object.dynamicContent ??= object.inVersions;
    }
    //object.brand = object.brand ? object.brand.toLowerCase() : setBrand(object.brand, header.brand);
    //object.parent_brand = object.parent_brand ? object.parent_brand.toLowerCase() : setBrand(object.brand, header.brand, "parent");
    object.uuid ??= `${Math.random().toString(36).slice(4).toUpperCase()}`;

    let object_name = _.findKey(module_library[entity_type], (o) => _.includes(o["valid names"], object[target_value]));

    let result = {
        uuid: object.uuid,
        name: object_name,
        entity_type: entity_type,
        ...object,
        ...module_library[entity_type][object_name].properties,
        ...object.user_settings,
        ...object.locked_settings
    };

    return _.omit(result, "valid names");
}

function getUserSettings(object) {
    return JSON.parse(JSON.stringify({ ...(object.settings ? formatUserInput(object.settings) : {}), ...(object.styling ? formatUserInput(object.styling) : {}) }));
}

function formatUserInput(string) {
    //aers.log(`...Formatting User Input\n`);
    let result = {
        info: {
            Process: "formatUserInput: Formats user settings and styling",
            success: false
        },
        output: {}
    };
    const processedString = correctSpelling(string);
    processedString.split(/[;|,]\s*/).forEach((item) => {
        item.includes(":") ? (result.output[item.split(/[:]\s*/)[0].replaceAll(/ |-/g, "_")] = item.split(/[:]\s*/)[1]) : (result.output[item] = true);
    });
    _.forIn(result.output, (value, raw_key) => {
        // REPLACE SPACES IN KEY WITH UNDERSCORES
        const key = raw_key.replaceAll(" ", "_");

        if (JSON.stringify(value) == "true") {
            result.output[key] = true;
        } else if (JSON.stringify(value) == "false") {
            result.output[key] = false;
        } else if (value == "0" || _.toInteger(value) != 0) {
            result.output[key] = _.toInteger(value);
        }

        if (key.includes("padding")) {
            // result.output[key] = formatPadding(value);
        }
        if (key == "container") result.output["depth"] = value == "false" ? 1 : 2;
        if (key == "no_container") result.output["depth"] = value == "false" ? 2 : 1;
    });

    return result.output;

    function correctSpelling(string) {
        let correctedString = string;
        correctedString = correctedString.replaceAll("color", "colour");
        correctedString = correctedString.replaceAll("bg:", "background:");
        correctedString = correctedString.replaceAll("background-colour:", "background:");
        correctedString = correctedString.replaceAll("bg-colour:", "background:");
        correctedString = correctedString.replaceAll("_p:", "palette:");
        return correctedString.toLowerCase();
    }
}

module.exports = {
    setupContent: setupContent,
    setBasicProperties: setBasicProperties
};
