/*
    Writes new-modules.xlsx, the brief behind the `new-modules` golden case.

        node tests/golden/briefs/new-modules.js

    The other briefs here are real ones, saved as designers sent them. This one
    is written in code because it exists to cover module types no campaign has
    used yet -- `hero trade` and `specials banner`, added in phase 4 -- and a
    committed .xlsx cannot be read in a diff or edited without Excel. Keeping
    the source beside the file means the next module type added is four lines
    here rather than a spreadsheet round trip.

    Regenerate after editing, then re-record the case:

        node tests/golden/briefs/new-modules.js
        node tests/golden/golden.js --case new-modules --accept
*/

const path = require("node:path");
const XLSX = require("xlsx");

const HEADER = ["Module Type", "component", "Content", "Offer Details\n(DO NOT TOUCH)", "Brand", "Dynamic Content", "Settings", "Notes"];

/** A module row: the type in column A, settings in column G. */
const module_row = (type, settings) => [type, null, null, null, null, null, settings || null];

/*
    A component row: the component in column B, its content in column C.

    An image takes its link in parentheses, the same way a button does --
    "artwork (https://...)". The space-separated form some older briefs use
    ("artwork https://...") is not parsed: formatRichText only looks for the
    bracket, so the whole string ends up in `src` and the image renders broken.
*/
const component_row = (component, content) => [null, component, content];

const rows = [
    ["New Module Types", null, null, null, null, null, "Settings"],
    HEADER,

    [
        "header",
        null,
        "Subject line: This week's trade specials\nPreheader: Two module types no other golden brief reaches",
        null,
        "Petbarn"
    ],

    /*
        A trade hero as v2.5 defined one: artwork and legal text, nothing else.
        Full bleed, square corners, on yellow.
    */
    module_row("hero trade"),
    component_row("image", "PB_Trade_Hero (https://www.petbarn.com.au/trade)"),
    component_row("terms", "*Trade prices available to approved account holders only."),

    /*
        A second one carrying the rest of the component set. v2.5's `hero trade`
        excluded these through its `order`; this one keeps hero standard's slots,
        so the case says what a heading, a body and a button actually do here.
    */
    module_row("hero trade"),
    component_row("image", "PB_Trade_Catalogue"),
    component_row("heading", "Trade Catalogue"),
    component_row("body copy", "Every line in this month's catalogue, in one place."),
    component_row("button", "SHOP TRADE (https://www.petbarn.com.au/trade)"),
    component_row("terms", "^Prices correct at time of publication."),

    /*
        The specials banner: one image in a rounded red container on light grey,
        with its terms inside the container. The link rides on the image, where
        v2.5's fragment had it hard-coded in the markup.
    */
    module_row("specials banner"),
    component_row("image", "PB_Weekly_Specials (https://www.petbarn.com.au/special-offers)"),
    component_row("terms", "*Specials available in store and online while stocks last."),

    // A second, to hold the grouping behaviour of two in a row on the record.
    module_row("specials banner"),
    component_row("image", "PB_Weekly_Specials_Pantry"),
    component_row("terms", "*Pantry specials exclude clearance lines."),

    /*
        An ordinary module after them, on a different background, so the case
        also covers the transition graphic structureEDM inserts between the two.
    */
    module_row("text block", "palette: white"),
    component_row("body copy", "An ordinary module after the new ones, so the change of background is exercised."),
    component_row("button", "SEE ALL SPECIALS (https://www.petbarn.com.au/special-offers)"),

    module_row("signoff"),
    module_row("footer"),
    component_row("terms", "*Full terms at [petbarn.com.au/special-offers](https://www.petbarn.com.au/special-offers, #white)")
];

const sheet = XLSX.utils.aoa_to_sheet(rows);
const book = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(book, sheet, "New Module Types");

const target = path.join(__dirname, "new-modules.xlsx");
XLSX.writeFile(book, target);

console.log(`wrote ${target}`);
