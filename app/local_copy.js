/**
 * local_copy.js -- which copy of the external tree to run from.
 *
 * The bootstrap keeps a copy of the published tree in userData. Building from
 * the shared volume is far slower than building from that copy, because every
 * module definition, library file, template and require is a network round
 * trip, so the copy is used whenever it matches what is published. See
 * local-copy-plan.md.
 *
 * "Matches" is decided by a stamp, not by comparing files: publish-external.sh
 * writes `.published.json` beside the mirror with a version per publish, and
 * the copy records the stamp it was taken under. Comparing files would read the
 * whole tree over the network, which is the cost this exists to remove.
 *
 * No Electron here, deliberately. Everything that decides something is in this
 * file so tests/local-copy.js can require it; the bootstrap only feeds it what
 * it found on disk. The publish script runs it too, for the shell hash, so the
 * two can never disagree on how that is calculated:
 *
 *   node app/local_copy.js shell-hash <dir>
 */

const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const STAMP_FILENAME = ".published.json";

// ---------------------------------------------------------------------------
// The stamp
// ---------------------------------------------------------------------------

/** The parsed `.published.json` in `dir`, or null when there is none to read. */
function readStamp(dir) {
    try {
        const parsed = JSON.parse(fs.readFileSync(path.join(dir, STAMP_FILENAME), "utf8"));
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
        return null;
    }
}

/** A stamp written by a publish that is stamped at all. Older ones have no version. */
function versioned(stamp) {
    return Boolean(stamp) && typeof stamp.version === "string" && stamp.version.length > 0;
}

/**
 * A stamp whose publish finished. While rsync runs the stamp says
 * "publishing", and the tree beneath it is half old and half new.
 */
function complete(stamp) {
    return versioned(stamp) && stamp.state === "published";
}

// ---------------------------------------------------------------------------
// The shell
// ---------------------------------------------------------------------------

/*
    The part of the tree that is loaded once per launch: main_external.js and
    ui/ (which holds the preload). Everything else -- src/ and lib/ -- is loaded
    fresh on every build, so a new publish reaches a running app's builds
    without a restart, and only a change in here needs one.
*/
const SHELL_ROOTS = ["main_external.js", "ui"];

function shell_files(dir) {
    const found = [];

    function walk(rel) {
        const full = path.join(dir, rel);
        let stat;
        try {
            stat = fs.statSync(full);
        } catch (_) {
            return;
        }
        if (stat.isDirectory()) {
            fs.readdirSync(full)
                // Dotfiles are Finder and editor droppings, and are never copied into the cache.
                .filter((name) => !name.startsWith("."))
                .forEach((name) => walk(path.posix.join(rel, name)));
        } else if (stat.isFile()) {
            found.push(rel);
        }
    }

    SHELL_ROOTS.forEach(walk);
    return found.sort();
}

/** sha256 over the shell's relative paths and contents, in sorted order. */
function shellHash(dir) {
    const hash = crypto.createHash("sha256");
    shell_files(dir).forEach((rel) => {
        hash.update(rel);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(dir, rel)));
        hash.update("\0");
    });
    return hash.digest("hex");
}

// ---------------------------------------------------------------------------
// The decision
// ---------------------------------------------------------------------------

/**
 * Which tree to run from, and why.
 *
 *   published  { dir, stamp } -- the location that would win with no cache in
 *              the picture, or null when none of them can be reached
 *   cache      { dir, stamp } -- the local copy and the stamp it was taken
 *              under, or null when there is none
 *   forced     the launch was pinned to the cache after a published tree failed
 *              to load
 *
 * Returns { dir, stamp, reason, offline }. `dir` is null only when there is
 * nothing at all to run.
 *
 * The local copy wins only when it is current. While the published tree is
 * reachable, a copy that does not match it must never be preferred, or a
 * publish would silently stop reaching people.
 */
function chooseTree({ published, cache, forced }) {
    const use = (tree, reason, offline) => ({ dir: tree ? tree.dir : null, stamp: tree ? tree.stamp || null : null, reason: reason, offline: Boolean(offline) });

    // The published tree just failed to load. Going back to it on every build
    // would fail on every build.
    if (forced) return use(cache, "forced", false);

    if (!published) return use(cache, "offline", true);

    // A checkout, or a tree published before stamping. Nothing can match it.
    if (!versioned(published.stamp)) return use(published, "unstamped", false);

    // Half old and half new. Wait it out on the copy if there is one.
    if (!complete(published.stamp)) return use(cache || published, "publishing", false);

    if (cache && complete(cache.stamp) && cache.stamp.version === published.stamp.version) {
        return use(cache, "current", false);
    }

    return use(published, "newer", false);
}

/**
 * Whether a copy taken between two reads of the published stamp can become the
 * local copy. Only if both reads found the same finished publish -- otherwise
 * a publish started or ended during the copy, and the copy may be torn.
 */
function refreshable(before, after) {
    return complete(before) && complete(after) && before.version === after.version && before.shellHash === after.shellHash;
}

// ---------------------------------------------------------------------------
// Stale requires
// ---------------------------------------------------------------------------

/*
    The shell's load() clears only the file it loads. The engine and library
    also require each other directly, and Node caches those by absolute path.
    When the local copy is replaced in place, the same paths hold new code; when
    a session moves between the published tree and the copy, each keeps its own
    cached modules from whenever it last ran. Either way a build would mix two
    versions.

    So, before a build whose tree or version differs from the previous one,
    everything under that tree's src/, lib/ and lib-dev/ goes. The shell's own
    modules -- main_external.js, ui/ -- stay: they are loaded once per launch,
    and are not what the build runs.
*/
const ENGINE_ROOTS = ["src", "lib", "lib-dev"];

/** Delete every entry of `require_cache` under `dir`'s engine folders. Returns how many. */
function clearTreeRequires(require_cache, dir) {
    const prefixes = ENGINE_ROOTS.map((root) => path.join(dir, root) + path.sep);
    let cleared = 0;
    Object.keys(require_cache).forEach((key) => {
        if (prefixes.some((prefix) => key.startsWith(prefix))) {
            delete require_cache[key];
            cleared += 1;
        }
    });
    return cleared;
}

module.exports = { STAMP_FILENAME, readStamp, complete, shellHash, chooseTree, refreshable, clearTreeRequires };

// ---------------------------------------------------------------------------
// Command line, for the publish script
// ---------------------------------------------------------------------------

if (require.main === module) {
    const [command, dir] = process.argv.slice(2);
    if (command === "shell-hash" && dir) {
        process.stdout.write(`${shellHash(path.resolve(dir))}\n`);
    } else {
        console.error("Usage: node app/local_copy.js shell-hash <dir>");
        process.exit(2);
    }
}
