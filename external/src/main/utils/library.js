const fs = require("node:fs");
const path = require("node:path");

const { user_files, lib_dev } = require("../constants.js");
const { devLibraryEnabled, noteDevFile } = require("../build_config.js");
const { load } = require("./load.js");

/*
    Where a library file is read from.

    Every read of the library goes through here, so the dev library is one rule
    in one place: while the toggle is on, a file in lib-dev/ at the same relative
    path is read instead of the one in lib/. Anything lib-dev/ does not have comes
    from lib/ as usual. With the toggle off, lib-dev/ is never looked at.

    The overlay is per file and exact. The brand-keyed template cascade asks
    whether a file exists once per tier, and each of those answers is dev-then-
    base -- so a dev `header/header.js` does not beat a base
    `header/header petbarn.js`. JSON is replaced whole, never merged.

    See dev-library-plan.md.
*/

/**
 * The first of `roots` that holds `rel`, or the last root when none does.
 *
 * The fallback is what keeps a missing file failing exactly as it did before
 * the dev library existed: the caller is handed the lib/ path, and the error --
 * and anything that catches it -- is unchanged.
 *
 * Pure, so the rule can be tested against fixture folders.
 *
 * @param {string[]} roots  in order of precedence, the base library last
 * @param {string} rel      a path relative to the library root
 * @param {function} exists (absolute path) -> boolean
 * @returns {string} the root to read `rel` from
 */
function resolveIn(roots, rel, exists) {
    return roots.find((root) => exists(path.join(root, rel))) || roots[roots.length - 1];
}

/** The library roots this build reads, in order of precedence. */
function libraryRoots() {
    return devLibraryEnabled() ? [lib_dev, user_files] : [user_files];
}

function rootOf(rel) {
    return resolveIn(libraryRoots(), rel, fs.existsSync);
}

/**
 * The absolute path to read `rel` from. Records it when that is lib-dev/, so the
 * build can say what it was built from.
 */
function libraryPath(rel) {
    const root = rootOf(rel);
    if (root === lib_dev) noteDevFile(rel);
    return path.join(root, rel);
}

/** Whether either library this build reads holds `rel`. Records nothing. */
function libraryExists(rel) {
    return fs.existsSync(path.join(rootOf(rel), rel));
}

/** load(), from whichever library holds `rel`. */
function loadLibrary(rel) {
    const root = rootOf(rel);
    if (root === lib_dev) noteDevFile(rel);
    return load(root, rel);
}

module.exports = {
    resolveIn: resolveIn,
    libraryRoots: libraryRoots,
    libraryPath: libraryPath,
    libraryExists: libraryExists,
    loadLibrary: loadLibrary
};
