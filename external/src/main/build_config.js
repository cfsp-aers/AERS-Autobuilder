/**
 * build_config.js -- the configuration for the build currently running.
 *
 * Which brief, which sheets of it, where the output goes, and where this user's
 * scratch files live. Set once by buildEmails() at the top of a build and read
 * from there on.
 *
 * This replaces a round-trip through the filesystem: the renderer's choices were
 * written to REQUIRED_DATA.json, and constants.js read that file back at require
 * time. Under ADR 0001 the engine lives on a shared volume, so that file was
 * shared too -- two people building at once would overwrite each other's brief
 * path mid-build, and a read-only mount would fail outright. It was also the main
 * reason load() had to bust require.cache: re-reading the file was how new
 * configuration reached the engine.
 *
 * IMPORTANT -- require this module directly. Never through load().
 *
 * load() deletes the entry from require.cache, and a module holding state cannot
 * survive that: each caller would get a fresh instance with nothing configured.
 * uuid.js is required directly for the same reason.
 */

const path = require("node:path");

/*
    Module-level state rather than an argument threaded through the call graph.
    That is a deliberate exception, and it is worth naming why: buildEmails()
    does take its configuration as an argument, which is where it matters. But
    aers.log() and aers.writeData() are called from sixteen places across five
    files, and a logger that demands its log location at every call site is worse
    code, not better. Those read from here instead.
*/
let current = null;

/**
 * Everything a build needs to know about where its inputs and outputs are.
 *
 * @param {object} config
 * @param {string} config.briefLocation      the .xlsx to build from
 * @param {string[]} config.selectedSheets   which of its sheets to build
 * @param {string} config.outputLocation     folder the .html files are written to
 * @param {string} config.databaseLocation   per-user scratch: the four data stores
 * @param {string} [config.briefParentFolder] defaults to the brief's own folder
 * @returns {object} the resolved configuration, as buildConfig() will return it
 */
function configure(config) {
    const given = config || {};

    /*
        Checked here rather than left to fail later, because the failures are
        genuinely obscure. An empty briefLocation reaches XLSX.readFile as "" and
        an empty briefParentFolder makes AERS_FILES_LOCATION resolve against the
        working directory, so the app would write a log beside itself and carry
        on. Both were reachable from a first launch.
    */
    const missing = ["briefLocation", "outputLocation", "databaseLocation"].filter((key) => typeof given[key] !== "string" || !given[key].trim());

    if (missing.length) {
        throw new Error(`Cannot start a build: ${missing.join(", ")} not set.`);
    }

    if (!Array.isArray(given.selectedSheets) || given.selectedSheets.length === 0) {
        throw new Error("Cannot start a build: no sheets selected.");
    }

    const briefLocation = path.resolve(given.briefLocation);
    const briefParentFolder = given.briefParentFolder ? path.resolve(given.briefParentFolder) : path.dirname(briefLocation);

    current = Object.freeze({
        briefLocation: briefLocation,
        briefParentFolder: briefParentFolder,
        selectedSheets: [...given.selectedSheets],
        outputLocation: path.resolve(given.outputLocation),
        databaseLocation: path.resolve(given.databaseLocation),

        /** Working files written next to the brief: the log, and per-sheet email data. */
        aersFilesLocation: path.join(briefParentFolder, "AERS files")
    });

    return current;
}

/**
 * The configuration of the build in progress.
 *
 * Throws rather than returning a default, because every caller is inside a build
 * that buildEmails() started. Reaching this before configure() means a new code
 * path bypassed the entry point, and a silent default would hide that by writing
 * to somewhere plausible-looking.
 */
function buildConfig() {
    if (!current) {
        throw new Error("build_config: no build is configured. buildEmails() sets this before anything else runs.");
    }
    return current;
}

/** True when a build has been configured. For code that must not throw. */
function isConfigured() {
    return current !== null;
}

module.exports = {
    configure: configure,
    buildConfig: buildConfig,
    isConfigured: isConfigured
};
