const _ = require("lodash");
const fs = require("fs");
const path = require("node:path");

const { load } = require("../utils/load.js");

const { app_dir, user_files } = require("../constants.js");

const aers = load(app_dir, "main/utils/aers utilities.js");

function formatRichText(item, text) {
    if (item.entity_type != "component" || text == undefined) {
        return item;
    } else if (item.type == "button") {
        item.content = {
            text: _.trimEnd(text.split("(")[0]),
            href: _.trimEnd(text.split("(")[1], ")")
        };
        return item;
    } else if (item.type == "image") {
        if (text.includes("(")) {
            const src = _.trim(item.content.split("(")[0]);
            const href = _.trim(item.content.split("(")[1], "( )");
            item.content = {
                src: src.includes(".") ? `images/${src}` : `images/${src}.png`,
                href: _.trimEnd(href, ")")
            };
        } else {
            if (!item.content) {
                item.content = item.name == "icon" ? "image_placeholder" : "banner_placeholder";
            }
            item.content = {
                src: item.content.includes(".") ? `images/${item.content}` : `images/${item.content}.png`
            };
        }
        return item;
    }
    let content_array = [];
    let contentObject = {};
    let regexArray = text.matchAll(/(\[[^\]]+\])\s*\(([^\)]+)\)/g);

    for (let segment of regexArray) {
        contentObject = {};
        if (String(text).indexOf("(") <= 0) {
            contentObject.text = String(item.name).trim();
        } else {
            contentObject.text = String(segment[1]).trim();
        }
        item.content = item.content.replace(segment[0], segment[1]);

        contentObject.properties = aers.clean({});
        let stylingSegments = segment[2].split(/ \| |,/);
        for (let i of stylingSegments) {
            i = String(i).trim();
            switch (true) {
                case i.startsWith("http"):
                    contentObject.properties["href"] = i;
                    break;
                case i.startsWith("#"):
                    contentObject.properties["colour"] = i.substring(1, i.length);
                    break;
                case i.toLowerCase().includes("bold"):
                    contentObject.properties["font_weight"] = i.toLowerCase();
                    break;
                case i.toLowerCase().includes("normal"):
                    contentObject.properties["font_weight"] = i.toLowerCase();
                    break;
                case i.toLowerCase().includes("italic"):
                    contentObject.properties["font_style"] = i.toLowerCase();
                    break;
                default:
                    break;
            }
        }
        content_array.push(contentObject);
    }
    return { ...item, text_segments: content_array };
}

function insertRichText(c) {
    if (c.text_segments.length == 0) {
        console.log(c);
        return c;
    } else {
        c.text_segments.forEach((segment) => {
            let text_template;
            if (segment.properties.href) {
                text_template = `<a href="${segment.properties.href}" style="font-weight:${segment.properties.font_weight || c.font_weight};color:${segment.properties.colour || c.colour};font-size:${c.font_size};line-height:${c.line_height};">${_.trim(segment.text, "[]")}</a>`;
            } else {
                text_template = `<span style="font-weight:${segment.properties.font_weight || c.font_weight};color:${segment.properties.colour || c.colour};font-size:${c.font_size};line-height:${c.line_height};">${_.trim(segment.text, "[]")}</span>`;
            }

            c.content = c.content.replaceAll(segment.text, text_template);
        });
        if (c.content.includes("\\")) {
            c.content = c.content.replaceAll(/\\(.)/g, "$1");
        } else if (c.content.includes("^")) {
            c.content = c.content.replaceAll(/\^(.)/g, '<sup style="line-height: 0px !important;">$1</sup>');
        }

        return c;
    }
}

module.exports = {
    formatRichText: formatRichText,
    insertRichText: insertRichText
};
