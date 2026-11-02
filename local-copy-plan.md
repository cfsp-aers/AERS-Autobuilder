# Local copy — implementation plan

Build from the copy of `external/` on this Mac whenever it matches what is
published, and update it automatically when it does not. Written 27/10/2026.

## Status

**Implemented 27/10/2026, apart from step 7**, which needs a rebuilt `.app`.
Recorded as
[ADR 0010](docs/adr/0010-the-local-copy-runs-whenever-it-matches-the-published-version.md).
**Published version** and **local copy** are in `CONTEXT.md`.

When the plan was written, `npm test` was green at 185. It now stands at 208,
which adds the 23 local-copy cases.

**Step 0, measured.** Headless Node, building `demo.xlsx` / *PB Demo Email*:

| From | Engine load | Build |
|---|---|---|
| the volume | 5.9 s | 870 s |
| the cache | 0.07–0.11 s | 0.17–0.20 s |

The volume figure is one run. The other two were stopped, because they would
have taken another half hour. Most of the time is Node's loader walking up
folders for `package.json` on every `require`, and each of those walks is an
SMB round trip. Inside the app the loader may be warmer, but the difference
won't be small.

Where it differs from the steps below:

- **`clearTreeRequires()`** joined `app/local_copy.js`, so the clearing rule
  is tested as well (one case). There are 23 cases in all.
- **`chooseTree()` also returns the chosen tree's stamp.** The bootstrap takes
  the booted shell's hash from that stamp rather than hashing `ui/` at launch,
  which would have meant reading `ui/` over the network.
- **The bootstrap no longer treats the cache as the last candidate.**
  `real_candidates()` lists the real locations, and `choose_tree()` hands the
  first reachable one and the cache to `chooseTree()`. `external_candidates()`
  remains only for the "Looked in:" text.
- **The refresh guard covers the first-launch seed too.** Seeding from a tree
  mid-publish is abandoned like any other refresh.
- **A failed build from a newer publish says so** in its message, as
  *Deliberately not in this plan* intended.
- **The restart notice sits where Update AERS was**, in the bottom-left bar.

Checked by hand beyond the suites: the real `app/main.js` was driven in Node
against a stubbed Electron, a fake published tree and a scratch `userData`.
Each of these behaved as the plan says:

- first build from the published tree, then the cache refreshes
- next build local
- a library-only publish builds once from the volume, then locally again
- modules under the cache's `src/` are cleared after the copy is replaced
- a `publishing` stamp keeps builds on the cache and blocks the refresh
- a shell-changing publish sets `shellChanged`
- a relaunch starts from "Local copy (matches published)" with no dialog
- `--use-cached-external` stays on the cache despite a newer publish

An offline launch couldn't be checked that way, because the volume is mounted
and the default location wins. It is covered by the unit cases only.

## What it is

Building from the shared volume is much slower than building from the offline
cache in `userData/external_cache`. Every build re-reads module definitions, JSON
libraries, HTML templates and assets, and on the volume each read is a network
round trip.

After this change:

- **Each publish carries a version stamp.** The cache records the stamp of the
  tree it was copied from.
- **At launch,** if the cache's stamp matches the published one, the app starts
  from the cache. Otherwise it starts from the published tree, as it does today.
- **On every Generate HTML,** the app reads the published stamp, which is one
  small file:
  - If it matches the cache, the build runs from the cache.
  - If the published tree is newer, the build runs from the published tree, and
    a successful build refreshes the cache. The build after that is local again.
  - If the volume can't be reached, the build runs from the cache.
- **Restart notice.** When a newer publish changed the shell as well, the app
  shows a *Restart to finish updating* notice.
- **The Update AERS button goes.** Updates no longer need a click.

Nothing changes when running from the checkout (`npm start`): it is never cached
and has no stamp.

## Decisions

### The cache becomes the normal place to run from, but only when it is current

This reverses a rule stated in `app/main.js:125`: *"While a real location is
reachable the cache must never win, or published changes would silently stop
taking effect."* The rule was protecting against publishes silently not reaching
people, and that still holds. The version check replaces the cache's position in
the list as the thing that keeps it true. A cache that doesn't match the
published stamp is never preferred while the volume is reachable.

### The engine follows the publish within a session; the shell waits for a restart

The tree has two parts with different lifetimes:

- **The engine and library** (`src/`, `lib/`) are loaded fresh on every build
  (`main_external.js:390`). A build can therefore run from whichever tree is
  current, with no restart.
- **The shell** (`main_external.js` and `ui/`, which includes `preload.js`) is
  loaded once per launch. It can't be reloaded in the same process, because its
  IPC handlers would register twice.

The stamp therefore records a hash of the shell's files as well as the version.
After a build from a newer publish whose shell hash differs from the running
shell's, the renderer shows the restart notice. Most publishes only touch `lib/`
and `src/`, and nobody sees anything for those. Until the user restarts, the
new engine runs under the old shell. That's the same mix an old `.app` already
runs with against a new publish, and the reason every option in
`create-html-file` has a default.

### A notice, not an automatic restart

Restarting unasked, just after an email has built, would close whatever window
the user had open. The notice is non-blocking, and its *Restart* button
relaunches the app. On relaunch:

- If the build that showed the notice succeeded, the cache now matches, and the
  app starts from it with the new shell.
- If the build failed, the app starts from the published tree, as it would today.

### The stamp is the existing `.published.json`, extended

`publish-external.sh` already writes `.published.json` beside the mirror, as a
dotfile so rsync's `--delete` leaves it alone. It gains three fields:

| Field | What it holds |
|---|---|
| `version` | a unique id per publish (the `publishedAt` timestamp) |
| `shellHash` | sha256 over the shell's files |
| `state` | `"publishing"` before rsync starts, `"published"` once it ends |

`state` closes a gap: rsync isn't atomic, and today the stamp is only written
after it finishes. A tree whose state is `publishing` is half old and half new.
The app treats it as unavailable: it builds from the cache if there is one, and
never copies that tree into the cache.

A published tree whose stamp has no `version` field behaves exactly as it does
today. The cache can never match it, so the published tree wins while it is
reachable. That covers trees published before this change.

### The cache refresh checks the stamp on both sides of the copy

`refresh_cache()` reads the stamp before copying and again after. If the two
differ, or either says `publishing`, it abandons the refresh and keeps the old
cache. Otherwise it writes the stamp into `.cache_info.json`, because the cache
doesn't copy dotfiles, so `.published.json` itself never arrives.

### Stale `require`s are cleared when the build's copy changes

`load()` clears only the module it loads. Engine and library files also require
each other directly (54 such requires, for example `main.js` requiring
`build_config.js`, and library files requiring `constants.js`), and Node caches
those by absolute path. Two cases would mix versions:

- The cache folder is replaced in place, so the same paths now hold new code.
- A session alternates between the published tree and the cache.

Before a build, when the tree or the version differs from the previous build's,
every `require.cache` entry under that tree's `src/`, `lib/` and `lib-dev/` is
cleared. The shell's own entries are left alone.

### A forced-cache session stays on the cache

When a published tree fails to load, the app relaunches pinned to the cache with
`--use-cached-external`. That session would otherwise build from the broken
publish on every click. It never switches.

### It applies only to a published tree

The local copy is used only when the location that would win without the cache
(`AB_EXTERNAL`, then the user-set location, then the default) has a completed
stamp. A user-set location pointing at a checkout has no stamp and behaves
exactly as it does today.

### Old apps keep working

New published trees will reach `.app`s that haven't been rebuilt yet.
`main_external.js` checks each new bootstrap function with `typeof` before
calling it, as it already does for `notifyBuildSucceeded`. When a function is
missing, it builds from its own folder, as it does today. A new `.app` meeting an
old publish finds no `version` field and falls back as described above.

## Where the code is today

| File | Lines | What it does |
|---|---|---|
| `app/main.js` | 106–131 | `external_candidates()`: the cache is last |
| `app/main.js` | 246–343 | cache: `refresh_cache`, `cacheable`, `on_build_succeeded`, the first-launch seed |
| `app/main.js` | 346–363 | `warn_running_from_cache()`: shown every time the app boots from the cache |
| `app/main.js` | 532–552 | `get-external-location`: what the panel shows, including `cache.inUse` |
| `app/main.js` | 595–618 | `dependencies_for()`: the API passed to `init()` |
| `main_external.js` | 304–313 | `update-autobuilder`: returns "Nothing to do." |
| `main_external.js` | 390, 458 | the build and the image downloader load from `external_dir` |
| `main_external.js` | 427 | `notifyBuildSucceeded()` |
| `ui/index.html` | 22–25 | the Update AERS button |
| `ui/renderer.js` | 134–147, 191 | its handler, plus a commented-out call |
| `ui/preload.js` | 14 | `updateAutobuilder` |
| `scripts/publish-external.sh` | end | writes `.published.json` after rsync |

## Constraints found while checking

**This needs a rebuilt `.app`.** Choosing the tree is the bootstrap's job, and
the bootstrap is compiled in. Everything outside `app/` ships by publish as
usual. The order matters:

1. Publish the external half first. It is harmless under the old app.
2. Distribute the new `.app`.

**The offline warning would fire on every launch.** `warn_running_from_cache()`
assumes that booting from the cache means the volume was unreachable. It must
fire only in that case, not when the cache was chosen because it is current.

**The first-launch seed is unproven.** A cache seeded at first launch holds the
same files as the publish, so building from it is no different from building
from the volume. It is used when its stamp matches. Its first successful build
updates the gate in `.cache_info.json` to `successful build`, with no copy.

**The bootstrap has no tests.** It requires Electron. The decisions it has to
make move into a small module with no Electron dependency, `app/local_copy.js`,
which a test suite can require. The same file computes the shell hash, so the
publish script and the app can't disagree on how it is calculated.

## Steps

Test first wherever there is something to assert.

### 0. Measure it

Build `demo.xlsx` from the volume, then from the cache (launch with
`AB_EXTERNAL` pointing at `userData/external_cache`), and record both times
here. This confirms the gain is worth a rebuild, and gives a number to check
step 7 against.

### 1. `app/local_copy.js`, with `tests/local-copy.js`

Pure functions with no Electron dependency:

- `shellHash(dir)`: sha256 over the sorted relative paths and contents of
  `main_external.js` and `ui/**`, skipping dotfiles. Runnable as
  `node app/local_copy.js shell-hash <dir>` for the publish script.
- `readStamp(dir)`: the parsed `.published.json`, or `null`.
- `chooseTree({ published, cache, forced })`: returns which tree to use and
  why. `published` and `cache` each carry a `dir` and a `stamp`.
- `refreshable(before, after)`: whether a copy taken between two stamp reads can
  become the cache.

Cases:

- published stamp equals the cache stamp → cache
- published newer → published
- published stamp `publishing`, cache present → cache
- published stamp `publishing`, no cache → published
- published unreachable, cache present → cache, marked offline
- published stamp has no `version` → published
- no published stamp at all (a checkout) → published
- forced → cache, whatever the stamps say
- `refreshable`: identical completed stamps → yes; different → no; either
  `publishing` → no
- `shellHash`: ignores `.DS_Store`; changes when a `ui/` file changes; doesn't
  change when a `lib/` file changes

Joins `test:invariants`.

### 2. The publish script stamps the version and the shell

- Before rsync (not on a dry run), write `.published.json` with
  `state: "publishing"`, keeping the previous `version`.
- After rsync, write it with a new `version`, the `shellHash` from
  `node app/local_copy.js shell-hash external`, and `state: "published"`,
  alongside the existing fields.
- If rsync fails, `set -e` leaves the stamp saying `publishing`. Every app then
  keeps building from its cache until the next good publish, which is the right
  outcome.

### 3. Launch: start from the cache when it is current

In `app/main.js`:

- `resolve_external()` resolves as today, then asks `chooseTree()` whether the
  cache should win.
- The new candidate label is "Local copy (matches published)".
- `warn_running_from_cache()` fires only when `chooseTree()` says offline.
- The panel's `cache.inUse` text tells "current local copy" apart from "offline
  copy".

### 4. Per build: the engine follows the publish

New bootstrap functions in `dependencies_for()`:

- `treeForBuild()`: reads the published stamp, calls `chooseTree()`, clears
  stale `require.cache` entries when the tree or version changed since the last
  build, and returns `{ dir, version, shellChanged }`. `shellChanged` compares
  the published `shellHash` with the booted shell's, which is hashed once at
  boot.
- `notifyBuildSucceeded(dir)`: refreshes the cache from `dir` when that is the
  published tree, using the stamp check on both sides of the copy. When `dir` is
  the cache, it only promotes an unproven gate. Called without an argument, it
  behaves as today, which is what an older `main_external.js` will do.

In `main_external.js`:

- `create-html-file` and the image downloader load `src/main/…` from
  `treeForBuild().dir` when the function exists, and from `external_dir` when it
  doesn't.
- The build result carries `restartToUpdate: true` when `shellChanged`.

### 5. The restart notice

- `main_external.js` adds a `restart-to-update` handler: `app.relaunch()`,
  then `app.exit(0)`.
- `preload.js` exposes it.
- `index.html` and `renderer.js` add a quiet, non-blocking notice with a
  *Restart* button, shown when a result carries `restartToUpdate`. It stays up
  until the user acts on it.

### 6. Remove Update AERS

Remove the button, its handler and the commented-out call in `renderer.js`, the
`preload.js` entry, and `updateAutobuilder()` with its IPC handler. Reload AERS
stays.

### 7. Check it by hand

Rebuild the `.app`, publish, and go through:

- **Launch and first build:**
  - first launch with no cache → starts from the published tree
  - first build → cache refreshed
  - second build → runs from the cache, timed against step 0
- **A library-only publish while the app is open:**
  - the next build runs from the published tree
  - the build after it is local again
  - no restart notice
- **A publish that changes the shell:**
  - the restart notice appears
  - after a restart, the app starts from the cache with the new shell
- **Failure cases:**
  - volume unmounted → builds from the cache, and the offline warning shows only
    at a launch with the volume missing
  - stamp left at `publishing` (edit it by hand) → builds stay on the cache, and
    the cache doesn't refresh
  - an older `.app` against the new publish → builds as before

### 8. Record it

- **ADR 0010:** the local copy runs whenever it matches the published version.
  Note what it changes in ADR 0001's description of the cache.
- **`CONTEXT.md`:** glossary entries for **published version** and **local
  copy**, distinguished from the offline cache's fallback role.
- This plan's status.

## Deliberately not in this plan

- **Restarting automatically.** See *A notice, not an automatic restart*.
- **Retrying a failed build on the cache.** A failed build from a new publish is
  reported as it is, and the error says the build ran on a newly published
  version. A bad publish can't be told apart from a bad brief, so an automatic
  retry would quietly hide the bad publish.
- **Diffing trees instead of stamping them.** Comparing file contents on every
  click would read the whole tree over the network, which is the cost this plan
  removes.
- **Copying the cache in the background.** The refresh after a successful build
  stays synchronous, as it is now. The tree is about half a megabyte.
