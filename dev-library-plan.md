# Dev library — implementation plan

A way to try experimental library files without touching `lib/`. Written
27/10/2026.

## Status

**Implemented 27/10/2026.** All nine steps. Recorded as
[ADR 0009](docs/adr/0009-the-dev-library-overlays-lib-per-file.md); **dev library**
is in `CONTEXT.md`.

Baseline when the plan was written: `npm test` green at 173 — 46 update, 9
precedence, 20 palette, 14 template, 15 brief-error, 11 properties, 10 assets,
12 regions, 10 golden, 26 layout. After step 3 it was still 173, unchanged; it
now stands at 185 — 11 dev-library, and 11 assets with the overlay case.

Where it differs from the steps below:

- **Step 7.** The renderer *asks* whether `lib-dev/` has files (an `invoke` on
  `dev-library-available`) rather than being sent it like `check-for-dev`. A
  message pushed at `whenReady` can arrive before the page is listening.
- **Step 2.** One case beyond the list: the wrappers against a real `lib-dev/`
  file with the flag off and on. Without it, a resolver that ignored the flag
  passed every other case. It, and the assets overlay case, put one file into
  `external/lib-dev/` and remove exactly what they added, and stand aside if a
  file is already at that path.
- **Dev files recorded** include HTML templates (from nunjucks' `load` event)
  and assets (when copied), not only `loadLibrary()` reads.

Checked by hand as well as by the suites: a real build of `demo.xlsx` with a
dev `main.njk`, a dev include and a copied module definition used all three with
the toggle on and none with it off, and the copied definition's relative
requires resolved unedited. An rsync dry run with the publish excludes listed
nothing under `lib-dev/`. The UI has not been clicked through yet.

## What it is

`external/lib-dev/` mirrors the folder structure of `external/lib/` and holds any
library file being tested — a module template, an HTML template, a JSON library,
an asset. While the **dev library** toggle is on, a file in `lib-dev/` is used
instead of the file in `lib/` at the same relative path. Anything `lib-dev/` does
not have comes from `lib/` as usual. With the toggle off, `lib-dev/` is never
read.

It is for one person's local testing. It is never published.

## Decisions

### A sibling of `lib/`, not `lib/dev/`

Two reasons, either of them sufficient.

**Relative requires.** Every library file that uses engine code reaches it by
depth: 28 of the 29 do it from `lib/modules/<folder>/` with
`require("../../../src/main/constants.js")`. Under `lib/dev/modules/<folder>/` a
copied file would be one level deeper and every one of its requires would break.
`lib-dev/modules/<folder>/` is the same depth, so a template copied across runs
unedited. (`modules/module template.js` is the one exception, and is already
written for the folder a copy lands in — copying it into `lib-dev/` works the
same way it does into `lib/`.)

**The tests walk `lib/` by path.** `tests/properties.js`, `tests/layouts/layouts.js`
and `tests/inputs.js` all scan `external/lib`, and the layouts suite `require()`s
every module file it finds. A `lib/dev/` would be walked, required and hashed by
all three. `lib-dev/` is invisible to them.

### Same path replaces; nothing else does

The overlay is per file and exact. A dev file only shadows the base file with the
same relative path. Two consequences worth knowing:

- **The brand-keyed cascade is checked dev-then-base at each tier**, not dev for
  every tier and then base for every tier. A dev `header/header.js` does not beat
  a base `header/header petbarn.js` — to test a Petbarn header, put
  `header/header petbarn.js` in `lib-dev/`.
- **JSON files are replaced whole, never merged.** A dev `modules.json` is a full
  copy, and will go stale as the base one moves on. Merging was considered and
  rejected: it makes "which value ran" a question with no file to point at.

### Unpublished

`lib-dev/` is excluded from `publish:external`. Nobody else's app can ever see it,
and the offline cache — a copy of the published tree — cannot either.

### The toggle is off unless you turn it on, every time

- Off on every launch. Not saved to `REQUIRED_DATA`, unlike "Ignore existing
  assets", whose IPC path it otherwise copies.
- Rendered only when `lib-dev/` exists and holds at least one file. Nobody without
  a `lib-dev/` ever sees it.
- While it is on, the UI shows an unmissable *Dev library* indicator, and every
  build logs which files came from `lib-dev/`. An email built from dev files must
  never be mistakable for an ordinary build.

## Where the code reads the library today

Every lookup goes through `user_files` (`constants.js:21`). These are all of them,
checked by grep — nothing in `src/`, `ui/` or `main_external.js` reaches `lib/`
any other way, and no library file loads another library file.

| File | Line(s) | What it reads |
|---|---|---|
| `processing/applyModifications.js` | 54, 68 | module and component definitions |
| `processing/structureEDM.js` | 26 | module definitions |
| `processing/setup.js` | 8 | `libraries/modules.json` (module scope) |
| `processing/update.js` | 244 | `libraries/modules.json` (module scope) |
| `properties/template.js` | 79 | `exists()` — the definition cascade |
| `properties/palette.js` | 117, 215, 415, 418, 422 | definitions, button palettes, colour palettes |
| `properties/brand.js` | 6 | `libraries/brands.json` (module scope) |
| `systems/layout.js` | 117–118 | definition `default_properties` |
| `utils/style utilities.js` | 5 | `libraries/colour library.json` (module scope) |
| `utils/assets.js` | 85, 144 | `asset_ids`; the asset folder index |
| `utils/renderEmail.js` | 8, 13 | the nunjucks search path and `main.njk` |

Every one of those files is imported through `load()` wherever the engine imports
it, and `main.js` loads them after `configure()`. So the module-scope reads re-run
on every build, and a per-build flag reaches all of them without a restart.

## Constraints found while checking

**The toggle cannot be read through `buildConfig()`.** Seven suites — `palette`,
`inputs`, `precedence`, `template`, `regions`, `properties`, `update` — `require()`
engine files and call into them without ever calling `configure()`, and
`buildConfig()` throws when nothing is configured. That throw is deliberate and
stays. The resolver reads a soft getter instead, which is simply false when there
is no build.

**State lives in `build_config.js`, not in the resolver.** `load()` hands every
caller a fresh instance, so a list of dev files kept in the resolver would be
several lists. `build_config.js` is already the one module required directly for
exactly this reason.

**A missing file must fail exactly as it does today.** `palette.js` loads brand
palette files that may not exist. When neither `lib-dev/` nor `lib/` has a file,
the resolver returns the `lib/` path, so the error — and anything that catches
it — is unchanged.

**`lib-dev/` is only visible when running from the checkout.** The bootstrap
(`app/main.js:118–128`) tries `AB_EXTERNAL`, then a user-set location, then the
source checkout. If either of the first two points at the shared volume, the app
loads the published tree and `lib-dev/` is not there. Run with `npm start` or
`npm run dev` and neither set. The visibility rule makes the other case quiet
rather than broken: no `lib-dev/`, no toggle.

## Steps

Test-first where there is something to assert: write the case, watch it fail,
make it pass.

### 1. `build_config.js` — the flag and the record

- `configure()` accepts `useDevLibrary`, compared against `true` like
  `ignoreExistingAssets`, and resets the record of dev files used.
- `devLibraryEnabled()` — `current?.useDevLibrary === true`. Never throws.
- `noteDevFile(rel)` / `devFilesUsed()` — the record the build log reports from.

### 2. The resolver — `utils/library.js`, with `tests/dev-library.js`

- A pure core that takes the roots and an `exists` function:
  `resolveIn([devRoot, baseRoot], rel, exists)` → the first root that has `rel`,
  else the base path. This is what the test suite exercises, against fixtures
  rather than the real library.
- Thin wrappers over it: `libraryPath(rel)`, `libraryExists(rel)`,
  `loadLibrary(rel)`. With the flag off the root list is `[baseRoot]` alone.
- `lib_dev` added beside `user_files` in `constants.js`.

Cases for `tests/dev-library.js`:

- flag off → always `lib/`, even when `lib-dev/` has the file
- flag on, file in `lib-dev/` → `lib-dev/`
- flag on, file only in `lib/` → `lib/`
- flag on, in neither → the `lib/` path (so the failure is today's)
- flag on, cascade: dev `header/header.js` and base `header/header petbarn.js` →
  the base Petbarn file
- flag on, cascade: dev `header/header petbarn.js` → the dev file
- no `configure()` at all → behaves as flag off, does not throw

Joins `test:invariants`.

### 3. Switch the call sites

Each `load(user_files, x)` becomes `loadLibrary(x)`, and each `existsSync` on a
library path becomes `libraryExists(x)`. `template.js`'s `exists()` is the one
that implements the per-tier rule, and gets it for free from `libraryExists()`.

`npm test` must stay at 173, unchanged — the flag is off in every suite.

### 4. HTML templates

`renderEmail.js` configures nunjucks with `[lib-dev/html templates, lib/html
templates]` when the flag is on (nunjucks 3.2.4's `FileSystemLoader` takes an
array, first match wins), and renders `"main.njk"` by name rather than by
absolute path. The search path is what makes the includes —
`components/…`, `layouts/…`, `fragments/…` — overlay too, not just `main.njk`.

### 5. Assets

`libraryIndex()` in `assets.js` reads both asset folders, `lib/` first and
`lib-dev/` second, so a dev file of the same name replaces the base entry in the
map. `asset_ids` comes through `loadLibrary("libraries/modules.json")` like every
other JSON read. Extend `tests/assets.js` with one dev-overlay case.

### 6. The build log

After a build, `main.js` reports `devFilesUsed()` once, the way it already
reports template fallbacks — one line per file, so a dev build says what it was
built from.

### 7. UI and IPC

- `main_external.js` tells the renderer at startup whether `lib-dev/` has files,
  over the same kind of channel as `check-for-dev`.
- `index.html` / `renderer.js` — the toggle, next to "Ignore existing assets",
  rendered only on that signal. Off on load.
- Passed into `buildEmails()` as `useDevLibrary` directly. Not written to
  `REQUIRED_DATA`.
- While it is on, a *Dev library* indicator somewhere it cannot be missed.

### 8. Publishing

`--exclude="lib-dev/"` in `scripts/publish-external.sh`, beside the existing
`dev_settings.json` exclude. Confirm with `publish:external:dry` that nothing
under `lib-dev/` is listed.

### 9. Record it

- ADR 0009 — the dev library overlays `lib/` per file, off by default, never
  published.
- `CONTEXT.md` — a glossary entry for **dev library**.
- This plan's status.

## Deliberately not in this plan

- **Merging JSON.** See *Same path replaces*.
- **Deleting a base file from dev.** There is no way to say "this file does not
  exist" in `lib-dev/`. Not needed for testing a template; add a marker
  convention later if it is.
- **Snapshot coverage of dev builds.** The golden and layout suites always run
  with the flag off. A dev file is, by definition, not yet something to record
  expected output for — that happens when it is promoted into `lib/`.
- **Promoting a file.** Moving a dev file into `lib/` is a manual copy, followed
  by the usual test run and re-accept.
