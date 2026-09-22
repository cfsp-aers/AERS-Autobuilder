/*
    Writes wide-format.xlsx, the brief behind the `wide-format` golden case.

        node tests/golden/briefs/wide-format.js

    Every other brief here is written in the template the beta was built for,
    which gives each component a row. This one is written in the template v2.5
    was built for, which gives each *module* a row and spreads its components
    across columns. Designers have live campaigns in both, and
    processing/brief_format.js turns the second into the first so the rest of
    the engine only ever sees one shape.

    It is generated rather than saved from a real campaign because what needs
    covering is the translation, not a typical email: the disclaimer column that
    becomes a superscript, the button split across two columns, a link that has
    to reach the image as well as the button, an absolute image URL with the
    <img> tag still wrapped around it, and a row with no module type that
    belongs to the module above it. No real brief does all of that at once.

    Regenerate after editing, then re-record the case:

        node tests/golden/briefs/wide-format.js
        node tests/golden/golden.js --case wide-format --accept
*/

const path = require("node:path");
const XLSX = require("xlsx");

/*
    The human-readable headings a designer sees, and beneath them the
    machine-readable keys the builder actually reads. Both rows spell
    "Module Type", which is what puts find_header_row on the second of them --
    it takes the last row of a run that carries the column it was asked for.

    NOTES has a heading and no key, exactly as the real template leaves it. That
    blank makes sheet_to_json invent `__EMPTY` for the column, which arrives as
    `empty`; nothing reads it, and the case is here partly to keep that harmless.
*/
const HUMAN_HEADER = ["Module Type", "BRAND", "Module Name\nMUST BE UNIQUE", "Image Name", "Callout Badge", "Top Text (Optional)", "Main Offer", "Secondary Offer", "Product Description", "Disclaimer Symbol", "Terms & Conditions / End Date", "Button 1: Link", "ILC 01", "ILC 02", "NOTES", "Button 1: Text", "Colour Palette"];

const KEY_HEADER = ["moduleType", "brand", "moduleName", "image", "badge", "heading_text", "subheading1_text", "subheading2_text", "bodycopy_text", "disclaimer", "terms", "button1_link", "ILC_01", "ILC_02", null, "button1_text", "palette"];

/*
    One module per row. Named arguments rather than a 17-long positional list,
    which is unreadable and silently wrong the first time a column is inserted.
*/
const row = (fields) => [fields.moduleType || null, fields.brand || null, fields.moduleName || null, fields.image || null, fields.badge || null, fields.heading || null, fields.subheading1 || null, fields.subheading2 || null, fields.bodycopy || null, fields.disclaimer || null, fields.terms || null, fields.link || null, fields.ilc01 || null, fields.ilc02 || null, fields.notes || null, fields.buttonText || null, fields.palette || null];

const rows = [
    ["Wide Format", null, null, " ", " ", " "],
    HUMAN_HEADER,
    KEY_HEADER,

    /*
        The header carries a link in the template because v2.5 used it for the
        logo. This engine's header builds its own layout and ignores whatever
        the brief hands it, so the link goes nowhere -- which is the point of
        having it here.
    */
    row({ moduleType: "header", brand: "Petbarn", link: "https://www.petbarn.com.au/" }),

    /*
        The full component set on one row. `disclaimer` is a column of its own
        and belongs on the main offer as a superscript; the button takes its
        label and its link from two columns; and the link has to reach the image
        too, the way every image macro in v2.5 applied it.
    */
    row({
        moduleType: "hero trade",
        moduleName: "HERO_01",
        image: "PB_Wide_Hero",
        subheading1: "Members Double Up & Save",
        bodycopy: "Selected Cat Favourites",
        disclaimer: "*",
        terms: "#T&Cs apply, ends 07/09/26.",
        link: "https://www.petbarn.com.au/c/meow-mania"
    }),

    // A badge, a top text, a second offer line, and a button that names itself.
    row({
        moduleType: "product banner",
        moduleName: "FOOD 1",
        image: "PB_Wide_Food",
        badge: "MEMBERS ONLY",
        heading: "This week only",
        subheading1: "Buy 2 & Save up to 25% off",
        subheading2: "Save up to $8.75",
        bodycopy: "Selected Cat Food",
        disclaimer: "*",
        link: "https://www.petbarn.com.au/c/meow-mania/food",
        buttonText: "SHOP CAT FOOD",
        ilc01: "30341"
    }),

    // A pair of tiles, which is how the template expects tiles to arrive.
    row({ moduleType: "product tile", moduleName: "FOOD 2", image: "PB_Wide_Tile_A", subheading1: "From $74 each\nWhen you buy 2", bodycopy: "Royal Canin Adult Indoor 4kg", disclaimer: "*", link: "https://www.petbarn.com.au/royal-canin" }),
    row({ moduleType: "product tile", moduleName: "FOOD 3", image: "PB_Wide_Tile_B", subheading1: "From $68 each\nWhen you buy 2", bodycopy: "Hill's Science Diet 4kg", disclaimer: "*", link: "https://www.petbarn.com.au/hills" }),

    // Artwork on its own, inset and rounded, on light grey.
    row({ moduleType: "trade image banner", moduleName: "SPECIAL FOOD 1", image: "PB_Wide_Trade_Banner", link: "https://www.petbarn.com.au/trade" }),

    /*
        A countdown timer. Its artwork is rendered by an outside service, and
        what a designer pastes is the whole <img> tag -- which has to be cut
        back to the URL before it reaches the src attribute. An absolute src
        also takes no link, because formatRichText only recognises `http` on the
        branch without brackets.
    */
    row({ moduleType: "countdown timer", moduleName: "TIMER", image: 'https://s.example.invalid/t/ABC1/scale_2x" alt="timer', notes: "Place timer link in Module Name column." }),

    // The palette column, which is the one setting the wide template can carry.
    row({ moduleType: "specials banner", moduleName: "SPECIALS", image: "PB_Wide_Specials", terms: "*Specials available in store and online while stocks last.", link: "https://www.petbarn.com.au/special-offers", palette: "red" }),

    /*
        A row with no module type. v2.5 calls these INLINE rows and folds them
        into the module above; here they need no special case, because a row
        that contributes components and no module row is exactly how the
        component-per-row template says the same thing.
    */
    row({ moduleType: "text block", bodycopy: "An ordinary module, to exercise the background transition.", palette: "white" }),
    row({ bodycopy: "A second line, from a row that names no module type.", link: "https://www.petbarn.com.au/", buttonText: "SEE ALL SPECIALS" }),

    row({ moduleType: "signoff" }),
    row({ moduleType: "footer", terms: "*Full terms at petbarn.com.au/special-offers." })
];

const sheet = XLSX.utils.aoa_to_sheet(rows);
const book = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(book, sheet, "Wide Format");

const target = path.join(__dirname, "wide-format.xlsx");
XLSX.writeFile(book, target);

console.log(`wrote ${target}`);
