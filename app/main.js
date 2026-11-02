/**
 * main.js -- bootstrap only.
 *
 * Everything that makes this application do anything lives in the external
 * tree, outside the compiled .app, so it can be changed without a rebuild.
 * See docs/adr/0001-engine-runs-outside-the-app-bundle.md.
 *
 * This file's whole job is:
 *
 *   1. find the external tree,
 *   2. make the app's node_modules reachable from it,
 *   3. require its main_external.js and call init(),
 *   4. keep a copy of the last tree that produced a working build, run from it
 *      while it matches the published version (it is far faster than the
 *      shared volume), and fall back to it when the published one is
 *      unreachable or broken.
 *
 * It also owns the "where is the external tree?" setting and the UI to change
 * it. That MUST stay here: if the external tree cannot be found, nothing in it
 * can run, so any UI inside it would be unreachable exactly when it is needed.
 *
 * Do not add application logic here. Anything added here is frozen into the
 * build, which is the problem this arrangement exists to solve.
 */

const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require("electron/main");
const path = require("node:path");
const fs = require("node:fs");
const Module = require("node:module");

const local_copy = require("./local_copy.js");

// ---------------------------------------------------------------------------
// Where to look for the external tree
// ---------------------------------------------------------------------------

/*
    The external tree is a folder containing main_external.js, src/, lib/ and
    ui/. main_external.js at its root is the marker: a folder either has it and
    is a candidate, or does not and is skipped.
*/
const EXTERNAL_MAIN_FILENAME = "main_external.js";

/**
 * Compiled-in default -- where a freshly installed app looks first.
 *
 * This points at the parallel development folder, not at the folder v2.5 reads.
 * The two applications have different bundle identifiers and different published
 * trees, so they coexist and v2.5 keeps serving the team until parity is proven.
 * See the combination plan, section 5.
 */
const DEFAULT_EXTERNAL_LOCATION = "/Volumes/Chats_Marketing/Design WIP/- 2019 Design WIP/Design Team/AERS Autobuilder/Universal Builder";

/**
 * The user's override, stored in userData -- outside the .app, so it survives
 * app updates and reinstalls.
 */
function user_location_file() {
    return path.join(app.getPath("userData"), "external_location.json");
}

function read_user_location() {
    try {
        const parsed = JSON.parse(fs.readFileSync(user_location_file(), "utf8"));
        return typeof parsed.location === "string" && parsed.location.trim() ? parsed.location : null;
    } catch (_) {
        return null;
    }
}

function write_user_location(location) {
    const file = user_location_file();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ location }, null, 4), { encoding: "utf8" });
}

function clear_user_location() {
    try {
        fs.unlinkSync(user_location_file());
    } catch (_) {}
}

/** A location may be the folder, or main_external.js itself. Normalise to the folder. */
function to_external_dir(location) {
    if (!location) return null;
    return location.endsWith(".js") ? path.dirname(path.resolve(location)) : path.resolve(location);
}

function main_file_in(location) {
    const dir = to_external_dir(location);
    return dir ? path.join(dir, EXTERNAL_MAIN_FILENAME) : null;
}

function is_external_tree(location) {
    const file = main_file_in(location);
    try {
        return Boolean(file) && fs.statSync(file).isFile();
    } catch (_) {
        return false;
    }
}

/**
 * The real locations, highest priority first -- everything but the local copy.
 * The first one that actually contains main_external.js is the published tree
 * this launch would run, if the local copy were out of the picture.
 *
 * Nothing here reads from inside the .app: the external tree is deliberately
 * not bundled, so changing it never requires rebuilding the app.
 */
function real_candidates() {
    return [
        { label: "AB_EXTERNAL environment variable", location: process.env.AB_EXTERNAL },
        { label: "User-set location", location: read_user_location() },
        // Only when running from source, so a dev checkout is never shadowed by
        // the published tree. Packaged builds skip straight to the default.
        { label: "Running from source", location: app.isPackaged ? null : path.join(__dirname, "..", "external") },
        { label: "Default location", location: DEFAULT_EXTERNAL_LOCATION }
    ]
        .filter((candidate) => candidate.location)
        .map(with_file);
}

/**
 * Every location a launch may look in, for telling the user where it looked.
 *
 * A relaunch after a failed load pins the cache to the top. Ordinary priority
 * would walk straight back into the published tree that just threw, because it
 * is present and readable -- it simply does not work.
 */
function external_candidates() {
    const cache = with_file({ label: CACHE_LABELS.offline, location: cache_dir() });
    return forced_to_cache() ? [{ ...cache, label: CACHE_LABELS.forced }] : real_candidates().concat(cache);
}

function with_file(candidate) {
    return { ...candidate, location: to_external_dir(candidate.location), file: main_file_in(candidate.location) };
}

/** What the panel and the log call the local copy, by why it was chosen. */
const CACHE_LABELS = {
    forced: "Offline cache (published tree failed to load)",
    offline: "Offline cache",
    current: "Local copy (matches published)",
    publishing: "Local copy (publish in progress)"
};

/*
    The local copy used to be the last candidate, on the rule that while a real
    location is reachable the cache must never win, or published changes would
    silently stop taking effect. That rule still holds. What enforces it now is
    the version stamp rather than the cache's place in the list: the copy wins
    only when it was taken from the same publish that is out there now. See
    local-copy-plan.md and app/local_copy.js, where the decision itself lives.

    Read afresh on every call. A launch asks once; every build asks again, so a
    publish made while the app is open reaches the next build.
*/
function choose_tree() {
    const forced = forced_to_cache();
    const published = forced ? null : real_candidates().find((candidate) => is_external_tree(candidate.location)) || null;
    const info = read_cache_info();

    const choice = local_copy.chooseTree({
        published: published ? { dir: published.location, stamp: local_copy.readStamp(published.location) } : null,
        cache: is_external_tree(cache_dir()) ? { dir: cache_dir(), stamp: info ? info.stamp : null } : null,
        forced: forced
    });

    return { ...choice, published: published };
}

/** The candidate to run, with the choice that picked it, or null when there is none. */
function resolve_external() {
    const choice = choose_tree();
    if (!choice.dir) return null;

    if (choice.published && choice.dir === choice.published.location) {
        return { ...choice.published, choice: choice };
    }
    return { ...with_file({ label: CACHE_LABELS[choice.reason] || CACHE_LABELS.offline, location: cache_dir() }), choice: choice };
}

function searched_locations_text() {
    return external_candidates()
        .map((candidate) => `  ${candidate.label}:\n    ${candidate.file}`)
        .join("\n");
}

// ---------------------------------------------------------------------------
// Making the app's packages reachable from the external tree
// ---------------------------------------------------------------------------

/*
    The external tree sits outside the .app, so Node's ordinary directory walk
    from, say, external/src/main/main.js never reaches the app's node_modules.
    Every bare require in the engine and library -- 52 of lodash alone -- would
    fail.

    v2.5 solved this by injecting each package into init() as an argument. That
    worked because its external file was one file. Here the requires are spread
    across ~90 files, so injection would mean rewriting all of them.

    Putting the app's node_modules on NODE_PATH and re-initialising the module
    search paths makes them resolve normally instead, unchanged. It is a global
    setting on a process we own end to end, and it costs nothing at runtime:
    globalPaths is consulted only after the ordinary walk has failed.

    Electron itself needs none of this -- "electron" and "electron/main" are
    intercepted by the main process loader before path resolution, so they
    resolve from anywhere on disk.
*/
function add_app_modules_to_search_path() {
    const app_node_modules = path.join(__dirname, "..", "node_modules");
    const existing = process.env.NODE_PATH;

    process.env.NODE_PATH = existing ? `${app_node_modules}${path.delimiter}${existing}` : app_node_modules;
    Module._initPaths();

    return app_node_modules;
}

// ---------------------------------------------------------------------------
// Per-user build state
// ---------------------------------------------------------------------------

/*
    The engine's scratch space: the intermediate data stores it writes on the way
    through a build, and the settings of the last build so "reload" can pick them
    up again.

    This has to be per-user. Under ADR 0001 the external tree is on a shared
    volume, so anything written beside it is written for everyone: two people
    building at once would overwrite each other, and a read-only mount would fail
    outright.

    The bootstrap owns it because the bootstrap is what knows where userData is.
    It is passed over as buildStateDir; the external tree decides what to put in
    it. Phase 1 did this by setting three environment variables that constants.js
    read at require time -- a stopgap for the file round-trip that is now gone.
*/
function make_build_state_dir() {
    const state_dir = path.join(app.getPath("userData"), "build_state");
    fs.mkdirSync(state_dir, { recursive: true });
    return state_dir;
}

// ---------------------------------------------------------------------------
// Offline cache -- the last external tree that actually produced a build
// ---------------------------------------------------------------------------

/*
    A mirror of the external tree kept in userData. It covers two failures:

      1. the published tree is unreachable, and
      2. the published tree IS reachable but broken -- a bad publish, which
         would otherwise stop every installed app at once.

    (2) is the reason this exists. (1) is only partial cover: briefs and output
    folders usually live on the same volume, so an offline user has a working
    app and nothing to build from. v2.5 had the same limitation.

    It has a third job now, and the one it does most: while it was taken from
    the publish that is out there now, it is what the app runs, because a build
    over the network is many times slower. See choose_tree above.

    v2.5 kept two caches with two different gates -- one on the app booting, one
    on a successful build. Those guarded two things with different lifecycles.
    Here the whole tree is published by one command, so it is one unit, and only
    one of the two gates is worth keeping: a cached tree that boots but cannot
    build is worthless, because building is the entire purpose of the app.
    Gating on a build means the cache always holds a tree that demonstrably
    produced an email.

    The exception is a first launch with no cache at all. There, a tree that
    merely boots is better than nothing, so one is seeded once the window
    appears and replaced by the first successful build.
*/

/** Written inside the cache folder so it travels with it. Dotted: never copied. */
const CACHE_INFO_FILENAME = ".cache_info.json";

/** Pins a launch to the cache. Added by the relaunch in handle_boot_failure. */
const FORCE_CACHE_FLAG = "--use-cached-external";

/**
 * Delay between the first window appearing and an absent cache being seeded.
 * Long enough for an immediate post-init crash to happen first, short enough
 * that a quick launch-and-quit still leaves something behind.
 */
const CACHE_SEED_DELAY_MS = 10000;

function cache_dir() {
    return path.join(app.getPath("userData"), "external_cache");
}

function is_cache_dir(location) {
    return Boolean(location) && path.resolve(location) === path.resolve(cache_dir());
}

function forced_to_cache() {
    return process.argv.includes(FORCE_CACHE_FLAG);
}

function read_cache_info() {
    try {
        const parsed = JSON.parse(fs.readFileSync(path.join(cache_dir(), CACHE_INFO_FILENAME), "utf8"));
        return { cachedAt: parsed.cachedAt || null, source: parsed.source || null, gate: parsed.gate || null, stamp: parsed.stamp || null };
    } catch (_) {
        return null;
    }
}

function write_cache_info(info) {
    fs.writeFileSync(path.join(cache_dir(), CACHE_INFO_FILENAME), JSON.stringify(info, null, 4), { encoding: "utf8" });
}

/**
 * Copy an external tree over the cache.
 *
 * Staged in a sibling folder and swapped in by rename, because a copy
 * interrupted part way through (volume unmounts, laptop sleeps) must never
 * become the cache: a half-written cache is worse than none, since it would
 * load and then misbehave rather than being skipped.
 *
 * The published stamp is read on both sides of the copy. A publish that starts
 * or finishes in between leaves a copy that may be half one version and half
 * the other, and that is abandoned. The stamp is recorded in .cache_info.json,
 * because .published.json is a dotfile and is not copied.
 */
function refresh_cache(source_dir, gate) {
    const target = cache_dir();
    const staging = `${target}.partial`;
    const previous = `${target}.previous`;

    try {
        const before = local_copy.readStamp(source_dir);

        fs.rmSync(staging, { recursive: true, force: true });
        fs.rmSync(previous, { recursive: true, force: true });

        fs.cpSync(source_dir, staging, {
            recursive: true,
            // Dotfiles here are Finder and editor droppings (.DS_Store), never app code.
            filter: (src) => path.resolve(src) === path.resolve(source_dir) || !path.basename(src).startsWith(".")
        });

        /*
            A tree published before stamping has nothing to check, and is
            copied as it always was. A stamped one is copied only if the same
            finished publish was there throughout.
        */
        const after = local_copy.readStamp(source_dir);
        const stamped = Boolean((before && before.version) || (after && after.version));
        if (stamped && !local_copy.refreshable(before, after)) {
            fs.rmSync(staging, { recursive: true, force: true });
            console.log(`Offline cache not updated: a publish was in progress at ${source_dir}. Keeping the previous copy.`);
            return;
        }

        if (fs.existsSync(target)) {
            fs.renameSync(target, previous);
        }
        fs.renameSync(staging, target);
        fs.rmSync(previous, { recursive: true, force: true });

        write_cache_info({ cachedAt: new Date().toISOString(), source: source_dir, gate: gate, stamp: stamped ? after : null });
        console.log(`Offline cache updated from: ${source_dir}  (${gate}${stamped ? `, version ${after.version}` : ""})`);
    } catch (error) {
        // Never fatal -- the app is already running, and a stale cache still
        // beats a broken one. Leave the old copy in place.
        console.error(`Could not update the offline cache: ${error.message}`);
        fs.rmSync(staging, { recursive: true, force: true });
    }
}

/** True when this tree is a sensible thing to keep a copy of. */
function cacheable(source_dir) {
    // Never cache a dev checkout: it is not what teammates should fall back to.
    if (!app.isPackaged) return false;
    // Copying the cache over itself achieves nothing.
    if (is_cache_dir(source_dir)) return false;
    return true;
}

/**
 * Called by the external tree when a build succeeds, with the tree the build
 * ran from. This is the gate: the cache holds a tree that has demonstrably
 * produced an email on this Mac.
 *
 * A build from the published tree refreshes the cache from it, and the build
 * after that runs locally. A build from the cache copies nothing, but proves a
 * copy that was only seeded. An older main_external.js passes no tree, and
 * means the one this launch booted from.
 */
function on_build_succeeded(dir) {
    const source = typeof dir === "string" && dir ? dir : booted_from;

    if (is_cache_dir(source)) {
        promote_cache_gate();
        return;
    }
    if (!cacheable(source)) return;
    refresh_cache(source, "successful build");
}

/*
    A copy seeded at first launch holds the same files as the publish it came
    from, so a build from it proves exactly what a build from the volume would
    have. Its gate is updated in place rather than recopied.
*/
function promote_cache_gate() {
    const info = read_cache_info();
    if (!info || info.gate === "successful build") return;
    try {
        write_cache_info({ ...info, gate: "successful build" });
    } catch (error) {
        console.error(`Could not update the offline cache record: ${error.message}`);
    }
}

/**
 * First launch, no cache. A tree that boots is a poor fallback, but it is
 * better than the alternative, which is nothing at all until the user's first
 * successful build. Replaced by the real thing as soon as one happens.
 */
function seed_cache_if_absent(source_dir) {
    if (!cacheable(source_dir)) return;
    if (fs.existsSync(path.join(cache_dir(), EXTERNAL_MAIN_FILENAME))) return;

    app.once("browser-window-created", () => {
        setTimeout(() => {
            if (fs.existsSync(path.join(cache_dir(), EXTERNAL_MAIN_FILENAME))) return;
            refresh_cache(source_dir, "first launch, unproven");
        }, CACHE_SEED_DELAY_MS);
    });
}

/**
 * Shown only when every real location was unreachable -- not when the local
 * copy was chosen because it matches the published version. Worth interrupting
 * for: the code is stale by definition, and briefs usually live on the same
 * volume, so there may be nothing to build from either.
 */
function warn_running_from_cache() {
    if (forced_to_cache()) {
        // handle_boot_failure already explained it before relaunching.
        return;
    }

    const info = read_cache_info();
    app.whenReady().then(() => {
        dialog.showMessageBoxSync({
            type: "warning",
            title: "Universal Builder -- offline",
            message: "Running from the offline copy.",
            detail: `The shared folder could not be reached, so the app started from the last copy saved on this Mac${cached_at_text(info)}.\n\nThis code may be out of date, and anything that reads a brief from the same volume will not work until it is back.`,
            buttons: ["Continue"],
            defaultId: 0
        });
    });
}

function cached_at_text(info) {
    return info && info.cachedAt ? ` (${new Date(info.cachedAt).toLocaleString()})` : "";
}

// ---------------------------------------------------------------------------
// Changing the location -- no rebuild required
// ---------------------------------------------------------------------------

/**
 * Ask the user to point at the external tree, and remember it. Returns the
 * chosen location, or null if they cancelled. Uses the sync dialog API so it
 * can be driven from the startup recovery flow, before any window exists.
 */
function pick_external_location(parent_window) {
    while (true) {
        const picked = dialog.showOpenDialogSync(parent_window || undefined, {
            title: `Select the folder containing ${EXTERNAL_MAIN_FILENAME}`,
            message: `Select the folder containing ${EXTERNAL_MAIN_FILENAME}`,
            properties: ["openDirectory"]
        });

        if (!picked || !picked[0]) {
            return null;
        }

        if (is_external_tree(picked[0])) {
            write_user_location(picked[0]);
            return picked[0];
        }

        dialog.showErrorBox("Not the right folder", `${EXTERNAL_MAIN_FILENAME} is not in:\n\n${picked[0]}\n\nPick the folder that contains it.`);
    }
}

/** Startup recovery: nothing was found, so offer to locate it rather than dying. */
function recover_external_location() {
    const choice = dialog.showMessageBoxSync({
        type: "warning",
        title: "Universal Builder -- external files not found",
        message: `Could not find ${EXTERNAL_MAIN_FILENAME}.`,
        detail: `The app's code lives in this folder, which is stored outside the app.\n\nLooked in:\n${searched_locations_text()}\n\nIf the files have moved, locate them now -- this is remembered and does not require a new version of the app.`,
        buttons: ["Locate Files...", "Quit"],
        defaultId: 0,
        cancelId: 1
    });

    if (choice !== 0) {
        return null;
    }

    return pick_external_location() ? resolve_external() : null;
}

function offer_relaunch(parent_window, location) {
    const choice = dialog.showMessageBoxSync(parent_window || undefined, {
        type: "info",
        title: "External files location updated",
        message: "External files location updated.",
        detail: `${location}\n\nThe app needs to restart to load the code from the new location.`,
        buttons: ["Restart Now", "Later"],
        defaultId: 0,
        cancelId: 1
    });

    if (choice === 0) {
        app.relaunch();
        app.exit(0);
        return true;
    }
    return false;
}

// ---------------------------------------------------------------------------
// The external files panel
// ---------------------------------------------------------------------------

/*
    v2.5 had a config popup for three separately relocatable folders, backed by a
    user_config.json. All of that is gone: there is one external location now and
    this file owns it. What is left is worth showing -- where the code came from,
    which candidate won, and whether the offline copy is in use -- because when
    something is wrong, "which copy am I running?" is the first question.

    A dialog rather than a window, deliberately. The panel has to work when the
    external tree is missing or broken, and every window in this application
    loads its HTML and its preload from that tree. A dialog needs neither, so
    this keeps working in exactly the case it exists for.
*/
function external_panel_detail() {
    const resolved = resolve_external();
    const info = read_cache_info();
    const user_set = read_user_location();

    const lines = [resolved ? `Loaded from:\n${resolved.location}\n(${resolved.label})` : `Not found. Looked in:\n${searched_locations_text()}`];

    lines.push(user_set ? `Location set by you:\n${user_set}` : `Using the default location:\n${DEFAULT_EXTERNAL_LOCATION}`);

    const published_stamp = resolved && resolved.choice && resolved.choice.published ? local_copy.readStamp(resolved.choice.published.location) : null;
    if (published_stamp && published_stamp.version) {
        lines.push(`Published version: ${published_stamp.version}${published_stamp.state === "published" ? "" : " (publish in progress)"}`);
    }

    if (info) {
        lines.push(`Local copy saved ${new Date(info.cachedAt).toLocaleString()}\n(${info.gate}${info.stamp && info.stamp.version ? `, version ${info.stamp.version}` : ""})${is_cache_dir(booted_from) ? `\n\n${in_use_text()}` : ""}`);
    } else {
        lines.push("No offline copy saved yet. One is kept after a successful build.");
    }

    return lines.join("\n\n");
}

/** Why this launch is running from the local copy, from what booted rather than a fresh resolve. */
function in_use_text() {
    if (booted_label === CACHE_LABELS.current) return "This app started from that copy, because it matches the published version.";
    if (booted_label === CACHE_LABELS.publishing) return "This app started from that copy, because a publish was in progress.";
    return "This app is running from that copy, because the shared folder could not be reached.";
}

function show_external_panel(parent_window) {
    const buttons = ["Close", "Change Location...", "Reset to Default", "Show in Finder"];

    const choice = dialog.showMessageBoxSync(parent_window || undefined, {
        type: "info",
        title: "Universal Builder -- external files",
        message: "The app's code lives outside the app.",
        detail: external_panel_detail(),
        buttons: buttons,
        defaultId: 0,
        cancelId: 0
    });

    if (choice === 1) {
        const location = pick_external_location(parent_window);
        if (location) offer_relaunch(parent_window, location);
    } else if (choice === 2) {
        clear_user_location();
        offer_relaunch(parent_window, DEFAULT_EXTERNAL_LOCATION);
    } else if (choice === 3) {
        const resolved = resolve_external();
        if (resolved) shell.showItemInFolder(resolved.file);
    }
}

/*
    Reachable from the menu bar, which this file owns, so it does not depend on a
    button in a renderer that may never have loaded. Appended to the default menu
    rather than replacing it -- the standard Edit and Window menus carry copy,
    paste and the devtools shortcut, and losing those to add one item would be a
    poor trade.
*/
function install_menu() {
    const existing = Menu.getApplicationMenu();
    if (!existing) return;

    const template = existing.items.map((item) => item);
    const built = Menu.buildFromTemplate([
        ...template,
        {
            label: "External Files",
            submenu: [
                { label: "External Files...", click: () => show_external_panel(BrowserWindow.getFocusedWindow()) },
                { type: "separator" },
                { label: "Show in Finder", click: () => shell.showItemInFolder(main_file_in(booted_from) || booted_from) }
            ]
        }
    ]);

    Menu.setApplicationMenu(built);
}

/*
    Registered here, not in the external tree, so they keep working when it is
    missing or broken -- which is exactly when someone needs to repoint the app.
*/
ipcMain.handle("show-external-panel", async (event) => {
    show_external_panel(BrowserWindow.fromWebContents(event.sender));
    return null;
});

ipcMain.handle("get-external-location", async () => {
    const resolved = resolve_external();
    const info = read_cache_info();
    return {
        location: resolved ? resolved.location : null,
        file: resolved ? resolved.file : null,
        source: resolved ? resolved.label : null,
        userSet: read_user_location(),
        default: DEFAULT_EXTERNAL_LOCATION,
        cache: {
            location: cache_dir(),
            exists: is_external_tree(cache_dir()),
            cachedAt: info ? info.cachedAt : null,
            gate: info ? info.gate : null,
            // From what actually booted, not a fresh resolve: the volume may
            // have come back since launch, and the app would still be running
            // cached code.
            inUse: is_cache_dir(booted_from),
            // Whether that is because it matches the published version, or
            // because nothing else could be reached.
            inUseText: is_cache_dir(booted_from) ? in_use_text() : null,
            version: info && info.stamp ? info.stamp.version || null : null
        }
    };
});

ipcMain.handle("change-external-location", async (event) => {
    const parent = BrowserWindow.fromWebContents(event.sender);
    const location = pick_external_location(parent);
    if (!location) {
        return null;
    }
    offer_relaunch(parent, location);
    return location;
});

ipcMain.handle("reset-external-location", async (event) => {
    clear_user_location();
    offer_relaunch(BrowserWindow.fromWebContents(event.sender), DEFAULT_EXTERNAL_LOCATION);
    return DEFAULT_EXTERNAL_LOCATION;
});

ipcMain.handle("open-external-location", async () => {
    const resolved = resolve_external();
    if (resolved) {
        shell.showItemInFolder(resolved.file);
    }
    return resolved ? resolved.location : null;
});

// ---------------------------------------------------------------------------
// Which tree a build runs from
// ---------------------------------------------------------------------------

/*
    The engine and library are loaded fresh on every build, so each build can
    run from whichever tree is current: a publish made while the app is open
    reaches the very next build, from the published tree, and once that build
    has succeeded and refreshed the local copy, the one after runs locally.

    The shell -- main_external.js and ui/ -- is loaded once per launch and
    cannot be swapped in the same process, because its IPC handlers would
    register twice. So when the publish a build runs from carries a different
    shell from the one this launch booted, shellChanged says so, and the
    renderer offers a restart.
*/
function tree_for_build() {
    const choice = choose_tree();

    // Nothing reachable and no local copy: let the build try what it booted
    // from, and fail the way it always has.
    const dir = choice.dir || booted_from;
    const version = choice.stamp && choice.stamp.version ? choice.stamp.version : null;

    if (!last_build || last_build.dir !== dir || last_build.version !== version) {
        const cleared = local_copy.clearTreeRequires(require.cache, dir);
        console.log(`Building from: ${dir}  (${choice.reason}${version ? `, version ${version}` : ""}; ${cleared} cached modules cleared)`);
    }
    last_build = { dir: dir, version: version };

    return {
        dir: dir,
        version: version,
        reason: choice.reason,
        shellChanged: local_copy.complete(choice.stamp) && choice.stamp.shellHash !== booted_shell_hash
    };
}

// ---------------------------------------------------------------------------
// What the external tree is handed
// ---------------------------------------------------------------------------

/*
    Much smaller than v2.5's equivalent, because NODE_PATH already solved the
    package problem and the tree can work out its own __dirname. What is left is
    the things it genuinely cannot know: where the app is, and how to talk back
    to the bootstrap.

    IMPORTANT -- this object is a contract, and the two sides are versioned
    separately: a teammate may be running an older .app against a newer
    published tree. Adding a key here is safe; the external tree must treat
    every key as possibly-absent and degrade rather than crash.
*/
function dependencies_for(external_dir) {
    return {
        /** App root -- inside app.asar when packaged. */
        appDir: __dirname,

        /** Root of the external tree. Also available there as __dirname. */
        externalDir: external_dir,

        /** Which candidate won, for display in the UI. */
        externalSource: booted_label,

        /** Per-user, per-build scratch space. Never on the shared volume. */
        buildStateDir: build_state_dir,

        /**
         * Call before a build. Which tree to load the engine from for it --
         * the local copy when it matches the published version, else the
         * published tree. See tree_for_build.
         */
        treeForBuild: tree_for_build,

        /**
         * Call after a build succeeds, with the dir treeForBuild gave it. Gates
         * the offline cache: see the cache section above. Safe to call often --
         * copying half a megabyte is cheap next to rendering an email.
         */
        notifyBuildSucceeded: on_build_succeeded,

        /** Escape hatch for anything NODE_PATH cannot reach. */
        requireFromApp: (name) => require(name)
    };
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

let booted = false;

/** Tree actually booted from. Not re-resolved later, so it stays truthful. */
let booted_from = null;
let booted_label = null;
let build_state_dir = null;

/**
 * The shell hash of the tree booted from, out of its stamp. The shell is loaded
 * once per launch, so this is what the running app's windows and IPC are,
 * whatever tree a build later runs from. Null when that tree carried no stamp.
 */
let booted_shell_hash = null;

/** The tree and version the last build ran from, to know when to clear stale requires. */
let last_build = null;

function boot(resolved) {
    if (booted) return;
    booted = true;

    booted_from = resolved.location;
    booted_label = resolved.label;

    const stamp = resolved.choice ? resolved.choice.stamp : null;
    booted_shell_hash = stamp && stamp.shellHash ? stamp.shellHash : null;
    last_build = { dir: booted_from, version: stamp && stamp.version ? stamp.version : null };

    console.log(`Loading external tree from: ${booted_from}  (${resolved.label}${last_build.version ? `, version ${last_build.version}` : ""})`);
    console.log(`Packages resolvable from:   ${add_app_modules_to_search_path()}`);

    build_state_dir = make_build_state_dir();
    console.log(`Per-user build state in:    ${build_state_dir}`);

    delete require.cache[require.resolve(resolved.file)];

    try {
        require(resolved.file).init(dependencies_for(booted_from));
    } catch (error) {
        handle_boot_failure(resolved, error);
        return;
    }

    app.whenReady().then(install_menu);

    // A local copy chosen because it is current is the normal case now, and
    // says nothing. Only one chosen because nothing else could be reached does.
    if (is_cache_dir(booted_from)) {
        if (resolved.choice && resolved.choice.offline) warn_running_from_cache();
    } else {
        seed_cache_if_absent(booted_from);
    }
}

/**
 * The external tree was found but blew up on load -- almost always a bad
 * publish, since every installed app reads the same copy.
 *
 * Recovery is a relaunch rather than an in-process retry: init() may have got
 * far enough to register IPC channels and app hooks before throwing, and
 * calling init() again on the cached copy would then fail on a duplicate
 * ipcMain.handle. A fresh process has none of that half-built state.
 */
function handle_boot_failure(resolved, error) {
    const reason = error && error.message ? error.message : String(error);
    console.error(`Failed to load ${resolved.file}:\n`, error && error.stack ? error.stack : error);

    /*
        Only relaunch if there is something DIFFERENT to load: not when this
        launch was already pinned to the cache (that loops), and not when the
        cache is what just failed.
    */
    const can_retry_from_cache = app.isPackaged && !forced_to_cache() && !is_cache_dir(resolved.location) && is_external_tree(cache_dir());
    console.error(can_retry_from_cache ? `Falling back to the offline cache: ${cache_dir()}` : "No usable offline cache -- cannot start.");

    app.whenReady().then(() => {
        if (!can_retry_from_cache) {
            dialog.showErrorBox("Universal Builder -- could not start", `${EXTERNAL_MAIN_FILENAME} was found but could not be loaded.\n\n${resolved.file}\n\n${reason}`);
            app.exit(1);
            return;
        }

        dialog.showMessageBoxSync({
            type: "warning",
            title: "Universal Builder -- using the last working copy",
            message: "The published copy of the app's code could not be loaded.",
            detail: `${reason}\n\nRestarting with the last copy that worked on this Mac${cached_at_text(read_cache_info())}.\n\nThis is a problem with the published files, not with your Mac.`,
            buttons: ["Restart"],
            defaultId: 0
        });

        app.relaunch({ args: process.argv.slice(1).concat(FORCE_CACHE_FLAG) });
        app.exit(0);
    });
}

const resolved_at_startup = resolve_external();

if (resolved_at_startup) {
    // Load before "ready" so the external tree can register its own app hooks.
    boot(resolved_at_startup);
} else {
    // Dialogs need the app to be ready, so recovery is deferred. Loading after
    // "ready" is still fine: app.whenReady() is already resolved by then, so a
    // .then() inside the external tree still runs.
    console.error(`Could not find ${EXTERNAL_MAIN_FILENAME}. Looked in:\n${searched_locations_text()}`);
    app.whenReady().then(() => {
        const recovered = recover_external_location();
        if (recovered) {
            boot(recovered);
        } else {
            app.quit();
        }
    });
}
