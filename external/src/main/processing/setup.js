const _ = require("lodash");
const { load } = require("../utils/load.js");
// Required directly, not through load(), so the counter is shared with main.js
// rather than each caller getting a fresh module instance.
const { nextUuid } = require("../utils/uuid.js");
const { user_files } = require("../constants.js");

const module_library = load(user_files, "libraries/modules.json");

function setupContent(arr, offers, sheet_name = "this sheet") {
    let result = arr.reduce((acc, object, index) => {
        /*
            The subject line and preheader ride on the header module's content,
            as two labelled lines. They become the <title> and the hidden
            preheader span in main.njk.

            Read defensively: the wide brief template has no column for either
            (see processing/brief_format.js), and a header row in the tall one
            can be left blank or have only the subject filled in. An email with
            no subject line is worth building -- one that dies on
            `Cannot read properties of undefined (reading 'split')` is not.
        */
        if (index == 0) {
            const [subject_line, preheader] = String(object.content ?? "").split("\n");
            object.subject_line = _.trim(String(subject_line ?? "").split(":").slice(1).join(":"));
            object.preheader = _.trim(String(preheader ?? "").split(":").slice(1).join(":"));
        }

        if (!object.entity_type && !object.moduleType && !object.component && !object.content) return acc;
        const item = { ...setBasicProperties(object, arr[0], sheet_name), ...object, user_settings: getUserSettings(object) };

        if (acc[0] && acc[0].user_settings?.transactional === true) {
            item.transactional = true;
        }

        if (item.entity_type == "component" && item.type != "image" && !item.content) {
            return acc;
        }

        if (object.offerDetails) {
            acc.push(item);
            const offerItem = _.find(offers, (o) => o.offerAlias == object.content);

            /*
                Without this the next line throws `Cannot read properties of
                undefined (reading 'offerAlias')`, which says nothing about which
                offer, which sheet, or which of the two likely causes: a typo in
                the brief, or an Offer Library that was read one row out.
            */
            if (!offerItem) {
                throw new Error(`"${object.content}" on ${sheet_name} is not in the Offer Library.\n\n` + `The Offer Library has ${offers ? offers.length : 0} offers${offers && offers.length ? `, starting with "${offers[0].offerAlias}"` : ""}. Check the offer alias in the brief matches one of them.`);
            }

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

function setBasicProperties(object, header = {}, sheet_name = "this sheet") {
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
    object.uuid ??= nextUuid(entity_type);

    let object_name = _.findKey(module_library[entity_type], (o) => _.includes(o["valid names"], object[target_value]));

    /*
        Without this the next lines throw `Cannot read properties of undefined
        (reading 'properties')`, which names neither the spelling that missed nor
        the sheet it is on. A type the library does not know is the single most
        likely thing to be wrong with a brief: a typo, or a module that exists in
        one of the two brief templates and has never been defined here.
    */
    if (!entity_type || !module_library[entity_type] || !module_library[entity_type][object_name]) {
        const spelling = object[target_value] || object.moduleType || object.component;
        if (!entity_type) {
            throw new Error(`A row in ${sheet_name} names both a module type ("${object.moduleType}") and a component ("${object.component}").\n\n` + `Put the module type on its own row, with its components on the rows beneath it.`);
        }
        throw new Error(`"${spelling}" on ${sheet_name} is not a ${entity_type} this builder knows.\n\n` + `Check the spelling against libraries/modules.json, which lists every ${entity_type} and the names that reach it.`);
    }

    let result = {
        uuid: object.uuid,
        name: object_name,
        entity_type: entity_type,
        ...object,
        ...module_library[entity_type][object_name].properties,
        ...object.user_settings
    };

    return _.omit(result, "valid names");
}

function getUserSettings(object) {
    return JSON.parse(JSON.stringify({ ...(object.settings ? formatUserInput(object.settings) : {}), ...(object.styling ? formatUserInput(object.styling) : {}) }));
}

function formatUserInput(string) {
    let result = {
        info: {
            Process: "formatUserInput: Formats user settings and styling",
            success: false
        },
        output: {}
    };
    const processedString = correctSpelling(string);
    result.output = parseToObject(processedString);

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

function parseToObject(input) {
  if (!input || typeof input !== "string") return {};

  function splitTopLevel(str) {
    const parts = [];
    let buf = "";
    let depth = 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === "{" ) depth++;
      if (ch === "}" ) depth = Math.max(0, depth - 1);
      if ((ch === "," || ch === ";") && depth === 0) {
        if (buf.trim()) parts.push(buf.trim());
        buf = "";
        continue;
      }
      buf += ch;
    }
    if (buf.trim()) parts.push(buf.trim());
    return parts;
  }

  function parseValue(val) {
    val = val.trim();
    if (/^\{[\s\S]*\}$/.test(val)) {
      return parseToObject(val.slice(1, -1).trim());
    }
    const lower = val.toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
    if (/^-?\d+$/.test(val)) return parseInt(val, 10);
    return val;
  }

  const out = {};
  const parts = splitTopLevel(input);
  parts.forEach((part) => {
    if (!part) return;
    const idx = part.indexOf(":");
    if (idx === -1) {
      const key = part.trim().replace(/ |-/g, "_");
      out[key] = true;
      return;
    }
    const rawKey = part.slice(0, idx).trim().replace(/ |-/g, "_");
    const rawVal = part.slice(idx + 1).trim();
    out[rawKey] = parseValue(rawVal);
  });

  return out;
}

module.exports = {
    setupContent: setupContent,
    setBasicProperties: setBasicProperties
};
