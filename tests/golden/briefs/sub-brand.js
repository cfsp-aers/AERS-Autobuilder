/*
    Writes sub-brand.xlsx, the brief behind the `sub-brand` golden case.

        node tests/golden/briefs/sub-brand.js

    The Nosh Project is one of eight brands in brands.json with no header and no
    footer of its own. Until 01/10/2026 a brief like this one built an email
    whose header was a bare grey block: the brand-keyed definition missed and
    resolution fell to `default/default.js` without a word. It now falls to the
    parent brand's -- see properties/template.js and tests/template.js.

    tests/template.js asserts which file resolution picks. This case is here for
    what that file does once it is picked: a Petbarn header and footer rendering
    inside a Nosh Project email, with Nosh's own palette on the modules between
    them. The two halves of the behaviour, and this is the half a designer sees.

    Written in code rather than saved from Excel for the same reason
    new-modules.js is: a committed .xlsx cannot be read in a diff.

    Regenerate after editing, then re-record the case:

        node tests/golden/briefs/sub-brand.js
        node tests/golden/golden.js --case sub-brand --accept
*/

const path = require("node:path");
const XLSX = require("xlsx");

const HEADER = ["Module Type", "component", "Content", "Offer Details\n(DO NOT TOUCH)", "Brand", "Dynamic Content", "Settings", "Notes"];

/** A module row: the type in column A, the brand in E, settings in G. */
const module_row = (type, brand, settings) => [type, null, null, null, brand || null, null, settings || null];

/** A component row: the component in column B, its content in column C. */
const component_row = (component, content) => [null, component, content];

const rows = [
    ["Nosh Sub Brand", null, null, null, null, null, "Settings"],
    HEADER,

    /*
        The brand is named once, on the header row, which is where the rest of
        the sheet inherits it from -- main.js falls every module back to
        `db.ms[0].brand`. Spelled "nosh" rather than "the nosh project" so the
        case also covers the alias in brands.json reaching the resolver.
    */
    ["header", null, "Subject line: Nosh Project, no header of its own\nPreheader: The parent brand's header, on a sub-brand's email", null, "nosh"],

    // What the sub-brand does have: a palette file. The modules between the
    // header and the footer are its own, the two ends are Petbarn's.
    module_row("hero standard"),
    component_row("image", "TNP_Hero (https://www.petbarn.com.au/the-nosh-project)"),
    component_row("heading", "Real food for real dogs"),
    component_row("terms", "*Available while stocks last."),

    module_row("text block"),
    component_row("heading", "Freshly made, gently cooked"),
    component_row("body copy", "Every Nosh recipe is cooked in small batches, then frozen so nothing is lost."),
    component_row("button", "SHOP NOSH (https://www.petbarn.com.au/the-nosh-project)"),

    /*
        Two tiles, to put a grouped module on the record for a brand whose
        palette file exists but whose module definitions do not.
    */
    module_row("old product tile"),
    component_row("image", "TNP_Beef"),
    component_row("heading", "Beef & Pumpkin"),
    component_row("button", "ADD TO CART (https://www.petbarn.com.au/the-nosh-project)"),

    module_row("old product tile"),
    component_row("image", "TNP_Chicken"),
    component_row("heading", "Chicken & Rice"),
    component_row("button", "ADD TO CART (https://www.petbarn.com.au/the-nosh-project)"),

    // The other three brand-keyed types, all of them resolving to Petbarn's.
    module_row("shop your way"),
    module_row("signoff"),
    module_row("footer"),
    component_row("terms", "*Full terms at [petbarn.com.au](https://www.petbarn.com.au, #white)")
];

const sheet = XLSX.utils.aoa_to_sheet(rows);
const book = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(book, sheet, "Nosh Sub Brand");

const target = path.join(__dirname, "sub-brand.xlsx");
XLSX.writeFile(book, target);

console.log(`wrote ${target}`);
