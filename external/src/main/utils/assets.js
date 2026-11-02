/**
 * assets.js -- answer, for every image src, what the library can supply for it.
 *
 * Some of what an email renders is not the campaign's artwork. The wobble drawn
 * between two modules of different colours comes from a fixed set of PNGs in
 * lib/libraries/assets, one per background colour, and every campaign that uses
 * one needs a copy somewhere the .html can reach.
 *
 * Nothing joined those two facts up. The library held the files, the transition
 * template asked for `images/wobble-bottom-<colour>.png`, and the campaign's
 * `images` folder is filled in by hand -- so a designer either remembered to
 * drag the right PNG across or shipped an email with a hole in it.
 *
 * This walks the finished tree, and for every image src naming a file the
 * library actually has, copies that file to `assets/` beside the .html and
 * points the src there instead. `images/` keeps the meaning it has always had:
 * the campaign's own artwork, which the builder neither supplies nor touches.
 *
 * Every src is treated the same way, which is what `nameTransitions` is for. A
 * transition used to be named inside transition-component.njk, which made the
 * wobble the one image in the email whose filename did not exist until
 * rendering -- so it could not be looked up, and would have needed a special
 * case in the walk below. structureEDM calls nameTransitions() on the tree it
 * returns, and by the time resolveAssets() runs a wobble is just another src.
 *
 * The library has a second thing to say about the same file. An <img> in an AEM
 * email carries `data-medialibrary-id`, the asset's id in AEM, and before this
 * the only place those existed was typed into the five module definitions that
 * draw a preset image -- seventeen urns spread across headers, footers and the
 * Shop Your Way tiles -- plus `transition_ids`, a table of the same urns for
 * wobbles, keyed by background colour rather than by filename.
 *
 * So the repository said the same thing in three shapes, and a designer adding
 * an asset had to know which one to edit. `asset_ids` in libraries/modules.json
 * is now the single table, keyed the way every other lookup here is keyed: by
 * the filename a src ends in. A wobble is just an image whose name happens to
 * be derived from a colour, so `transitionId()` derives that name and reads the
 * same table -- there is no longer a separate one for transitions.
 *
 * All of this lives here because it is one question -- what does the library
 * have for this src -- answered at three moments. structureEDM owns when a
 * transition exists; it does not need to know what the library calls one, nor
 * what AEM calls it.
 *
 * A src the library has no file for is left exactly as it was. That is the
 * normal case, not a failure -- most of what an email shows is campaign
 * artwork, and saying so on every build would be noise. A transition is the
 * exception, since it is always meant to come from here; those are named in the
 * log, because a missing one is a visible hole in the email.
 *
 * Whether a copy already in `assets/` is replaced is the one thing about any of
 * this a user decides. `assets/` is written by the builder, but it is also a
 * folder someone can reach into -- a designer waiting on a wobble that the
 * library has not had drawn yet may have put a corrected one there by hand. The
 * default is what it has always been, the library overwriting on every build;
 * "ignore existing assets" in the UI makes the opposite promise, and copies only
 * the files that are not there yet.
 */

const fs = require("node:fs");
const path = require("node:path");

const { app_dir, lib_dev } = require("../constants.js");
const { loadLibrary, libraryRoots } = require("./library.js");
const { noteDevFile } = require("../build_config.js");
const { load } = require("../utils/load.js");

const aers = load(app_dir, "main/utils/aers utilities.js");

/** Where a src points when the file is the campaign's own. */
const IMAGES_FOLDER = "images";

/** Where a src points when this build supplied the file. */
const ASSETS_FOLDER = "assets";

/** lib/libraries/assets -- the app's own image files. */
const LIBRARY_FOLDER = "libraries/assets";

/** lib/libraries/modules.json -- where `asset_ids` lives, beside the modules. */
const ID_LIBRARY = "libraries/modules.json";

/*
    Read at require time, which is once per build: main.js and structureEDM.js
    both reach this file through load(), so this module scope re-runs whenever
    they do and an edit to the library is picked up without restarting the app.
*/
const asset_ids = loadLibrary(ID_LIBRARY).asset_ids || {};

/*
    Read rather than guessed at. Anything else in the folder -- a .DS_Store, a
    stray .xlsx -- is not something an email can render, and indexing it would
    let a src match a file no browser can show.
*/
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];

/** How the library names its transitions. One file per background colour. */
const TRANSITION_PREFIX = "wobble-bottom-";

/**
 * What the library calls the wobble drawn against a given colour.
 *
 * The one place that turns a colour into a filename, so that the src below and
 * the id lookup above cannot disagree about which file they mean.
 *
 * @param {string} colour a background, with or without its hash
 * @returns {string} the filename, e.g. "wobble-bottom-FFFFFF.png"
 */
function transitionFile(colour) {
    return `${TRANSITION_PREFIX}${String(colour).replace("#", "")}.png`;
}

/**
 * The AEM id of the wobble drawn against a given colour, if the library has one.
 *
 * structureEDM needs this before any node has a src to look up -- it decides a
 * transition from two adjacent backgrounds, and names it later -- so this is
 * the colour-keyed door into a filename-keyed table. It replaces the separate
 * `transition_ids` table, whose 35 entries became 35 `asset_ids` entries under
 * the filenames they had always described.
 *
 * @param {string} colour the background the wobble sits against
 * @returns {string|undefined} the urn, or undefined for a colour with no wobble
 */
function transitionId(colour) {
    if (!colour) return undefined;
    return asset_ids[transitionFile(colour)];
}

/**
 * The AEM id of a file, by the name a src ends in.
 *
 * @param {string} src any image src
 * @returns {string|undefined} the urn, or undefined for campaign artwork
 */
function assetId(src) {
    if (typeof src !== "string" || !src) return undefined;
    return asset_ids[path.basename(src)];
}

/**
 * Every image file in the library, by the name a src would call it.
 *
 * With the dev library on, lib-dev/libraries/assets is read after lib/'s, so a
 * dev file of the same name replaces the base entry -- the same per-file rule
 * as every other library read, applied to a folder listing.
 *
 * @returns {Map<string, string>} basename -> full path
 */
function libraryIndex() {
    const index = new Map();

    [...libraryRoots()].reverse().forEach((root) => {
        const location = path.join(root, LIBRARY_FOLDER);

        /*
            A missing or unreadable library is worth saying out loud, unlike a
            missing single file: it means every src below falls through and the
            feature silently does nothing at all. A lib-dev/ with no assets of
            its own is the ordinary case, and says nothing.
        */
        let entries;
        try {
            entries = fs.readdirSync(location, { withFileTypes: true });
        } catch (error) {
            if (root !== lib_dev) console.warn(`Could not read the asset library at ${location}: ${error.message}`);
            return;
        }

        entries.forEach((entry) => {
            if (!entry.isFile()) return;
            if (!IMAGE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) return;
            index.set(entry.name, path.join(location, entry.name));
        });
    });

    return index;
}

/**
 * Every node of a finished tree, parents before children.
 *
 * The tree is the module array structureEDM produced: nodes nested through
 * `children`, with components at the leaves. Walked by `children` alone -- the
 * other object-valued keys on a node (`content`, `user_settings`) are bags of
 * properties, not nodes, and descending into them would read their keys as a
 * node's own.
 */
function eachNode(node, visit) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach((entry) => eachNode(entry, visit));

    visit(node);
    if (node.children) eachNode(node.children, visit);
}

/**
 * Give every transition in the tree the src of the wobble it draws.
 *
 * Points into `images/` because that is where a transition has always been
 * looked for, and is where one still comes from when the library has no file
 * for it. resolveAssets() moves it to `assets/` if and only if it can supply it.
 *
 * A sweep of the finished tree rather than a line beside each of the two
 * places structureEDM decides a transition -- because those two are not the
 * only nodes that carry one. Five module definitions forward
 * `{ transition, transition_id }` from the module into a container of their own
 * internal layout, and those nodes draw a wobble too. Naming them per site
 * would mean the library had to know what the asset library calls a wobble,
 * and would have missed all five.
 *
 * Only a node with a `block`, which is main.njk's own condition: the wobble is
 * drawn in the branch that includes `layouts/<block>.njk` and nowhere else. A
 * module node carries a `transition` too -- structureEDM sets one on every
 * module whose background differs from the one above it -- and it is the
 * gridContainer wrapping that module which draws it. Naming the module's as
 * well would put a file in `assets/` that the email never asks for, which is
 * the one thing this is supposed not to do.
 *
 * @param {object[]} module_array the tree structureEDM built
 * @returns {object[]} the same tree
 */
function nameTransitions(module_array) {
    eachNode(module_array, (node) => {
        if (!node.transition || !node.block || node.ignore) return;
        node.transition_src = `${IMAGES_FOLDER}/${transitionFile(node.transition)}`;
    });
    return module_array;
}

/**
 * Give every image in the tree whatever the library has for it.
 *
 * Two things, from one walk, because both are answered by the same key -- the
 * filename a src ends in. The file itself is copied to `assets/` and the src
 * repointed there; the AEM id is written to `content.aem_id`, which
 * image-component.njk renders as `data-medialibrary-id`.
 *
 * An `aem_id` already on the node wins. The library's answer comes from a
 * filename, which is a claim about a name rather than about this image, and a
 * definition or a brief that names an id for one particular image is being more
 * specific than that. Nothing in lib/ needs this any more -- the seventeen urns
 * that were typed into module definitions are in the table now -- but a src
 * pointing outside the library can still carry its own.
 *
 * Mutates the tree, and is called before the stores are written so that what
 * `email_json.json` records is what the .html renders.
 *
 * @param {object[]} module_array  the finished tree, from structureEDM
 * @param {string} outputLocation  the folder the .html is written to
 * @param {boolean} [ignoreExisting] leave a file `assets/` already has alone
 * @returns {{location: string, copied: string[], kept: string[], supplied: string[], filled: number, identified: string[], unidentified: string[], missing_transitions: string[]}}
 */
function resolveAssets(module_array, outputLocation, ignoreExisting = false) {
    const library = libraryIndex();
    const location = path.join(outputLocation, ASSETS_FOLDER);

    /*
        Made whether or not anything lands in it. The folder is where a designer
        is meant to look, and an empty one says "nothing came from the library
        this time" where a missing one says nothing at all.
    */
    fs.mkdirSync(location, { recursive: true });

    const copied = new Set();
    const kept = new Set();
    const missing_transitions = new Set();
    let filled = 0;

    /*
        Overwritten on every build rather than copied only when absent. The
        library is the source of truth for these files (ADR 0002), so a copy
        that has drifted -- edited in place, or left behind by an older version
        of the library -- is wrong, and silently keeping it would hide that.

        `ignoreExisting` is the deliberate exception to that, and the only one:
        a user who asked for it is saying the copy in `assets/` is the one they
        want. It decides nothing else -- a name the folder does not have yet is
        copied either way.

        The src is repointed either way too, because the file is in `assets/`
        either way. Which of the two sets a name lands in is decided once, by
        the first src that asks for it, so no file is counted twice and the
        report adds up.
    */
    function pointAt(src) {
        if (typeof src !== "string" || !src.startsWith(`${IMAGES_FOLDER}/`)) return src;

        const name = path.basename(src);
        const source = library.get(name);
        if (!source) return src;

        if (!copied.has(name) && !kept.has(name)) {
            const destination = path.join(location, name);

            if (ignoreExisting && fs.existsSync(destination)) {
                kept.add(name);
            } else {
                fs.copyFileSync(source, destination);
                copied.add(name);
                if (source.startsWith(lib_dev + path.sep)) noteDevFile(path.relative(lib_dev, source));
            }
        }
        return `${ASSETS_FOLDER}/${name}`;
    }

    eachNode(module_array, (node) => {
        if (node.content && typeof node.content === "object" && node.content.src) {
            node.content.src = pointAt(node.content.src);

            const id = assetId(node.content.src);
            if (id && !node.content.aem_id) {
                node.content.aem_id = id;
                filled += 1;
            }
        }

        if (node.transition_src) {
            const wanted = node.transition_src;
            node.transition_src = pointAt(wanted);
            if (node.transition_src === wanted) missing_transitions.add(path.basename(wanted));
        }
    });

    /*
        Every file this build is answerable for: the ones it copied, and the ones
        it left because they were already there. The email renders both from
        `assets/`, so both are the library's files as far as anything downstream
        is concerned, and an id list drawn from COPIED alone would have gone
        half-empty the moment someone turned the toggle on.
    */
    const supplied = [...copied, ...kept].sort();

    /*
        Which of those the library can name in AEM, and which it cannot. Split
        this way rather than by what the walk above wrote, because the two lists
        then add up to SUPPLIED and a reader can see that they do -- a wobble's
        id reaches it as `transition_id`, decided in structureEDM before any of
        this runs, so counting only the `content.aem_id` fills would have listed
        every wobble as missing one.

        An unidentified file is a gap in the library rather than in the
        campaign: the file is right there in lib/libraries/assets, so someone
        added it and gave it no id, and the email falls back to the generic urn
        in image-component.njk. A src the library has no file for at all is a
        different thing and stays silent -- see the note at the top.
    */
    const identified = supplied.filter((name) => asset_ids[name]);
    const unidentified = supplied.filter((name) => !asset_ids[name]);

    report(location, library, copied, kept, identified, unidentified, missing_transitions);

    return {
        location: location,
        copied: [...copied].sort(),
        kept: [...kept].sort(),
        supplied: supplied,
        filled: filled,
        identified: identified,
        unidentified: unidentified,
        missing_transitions: [...missing_transitions].sort()
    };
}

function report(location, library, copied, kept, identified, unidentified, missing_transitions) {
    /*
        Counted against the library rather than by rows of the table. The two
        agree today -- every row names a file that is there -- but they are not
        the same number, because a row can outlive the file it names: an id is
        the asset's identity in AEM, where it stays whether or not this
        repository still ships a copy. Reading the row count as a count of
        files would be wrong the first time one does.
    */
    const with_id = [...library.keys()].filter((name) => asset_ids[name]).length;

    aers.log(`\n~~~~~ ASSETS: ~~~~~~~~~~`, `LIBRARY | -> ${library.size} file${library.size === 1 ? "" : "s"}, ${with_id} with an AEM id\n---`, `ASSETS_LOCATION | -> ${location}\n---`, `COPIED | -> [ ${[...copied].sort().join(", ")} ]\n---`, `AEM IDS | -> [ ${identified.join(", ")} ]`);

    if (kept.size) {
        /*
            Named rather than counted, because this is the list a designer needs
            when an email shows an old asset: these are the files the build was
            told not to touch, and clearing the toggle is what replaces them.
        */
        aers.log(`---`, `ALREADY IN ${ASSETS_FOLDER.toUpperCase()} | -> [ ${[...kept].sort().join(", ")} ]`, `    "ignore existing assets" is on, so these were left as they were rather than recopied from the library`);
    }

    if (missing_transitions.size) {
        /*
            Logged rather than warned. The library has never covered every
            background colour a brief can use, so this fires on most builds as
            things stand -- but it is the only record of which wobble a campaign
            still needs drawing, and it belongs beside the build it describes.
        */
        aers.log(`---`, `NOT IN LIBRARY | -> [ ${[...missing_transitions].sort().join(", ")} ]`, `    these transitions still read from ${IMAGES_FOLDER}/ and need the file adding by hand`);
    }

    if (unidentified.length) {
        aers.log(`---`, `NO AEM ID | -> [ ${unidentified.join(", ")} ]`, `    the library has the file but no \`asset_ids\` entry, so these render the generic urn`);
        console.log(`---`, `NO AEM ID | -> [ ${unidentified.join(", ")} ]`, `    the library has the file but no \`asset_ids\` entry, so these render the generic urn`);
    }

    aers.log(`~~~~~~~~~~~~~~~`);
    console.log(`Copied ${copied.size} asset${copied.size === 1 ? "" : "s"} from the library${kept.size ? `, left ${kept.size} already in ${ASSETS_FOLDER}/` : ""}, ${identified.length} with an AEM id`);
}

module.exports = {
    resolveAssets: resolveAssets,
    nameTransitions: nameTransitions,
    transitionId: transitionId
};
