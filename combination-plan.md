# Universal Builder — Combination Plan

One application replacing **AERS Autobuilder v2.5** and the **AERS-Autobuilder
beta**. Target version `3.0.0`.

Written 2026-08-25 from a grill session over both codebases. Terminology in
[CONTEXT.md](CONTEXT.md); decisions in [docs/adr/](docs/adr/).

---

## 1. The shape of the problem

The two projects are not two versions of one thing. They are two halves of one
product, and each is strong exactly where the other is weak.

| | v2.5 | Beta |
|---|---|---|
| Shell | Thin bootstrap + externalised logic | Monolith |
| Engine | One 700-line function over a flat row array | Modular, entity-modelled |
| Output | String-concatenated `.njk` renders | Recursive element tree |
| Deployment | Edit on a share, no rebuild | Rebuild for every change |
| Resilience | Two-tier offline cache, forced-cache relaunch | None |
| Module breadth | 33 types from 7 templates | 17 declared types, bespoke each |
| Tests | None | None |

**v2.5 has the operations story and a weak engine. The beta has the engine and no
operations story.** The combination is therefore not a merge of two similar
systems — it is the beta's engine wearing v2.5's shell.

---

## 2. Strengths and weaknesses

### AERS Autobuilder v2.5

**Strengths — nearly all operational.**

- *Externalised logic.* The `.app` is a 576-line bootstrap that locates
  `main_external.js`, injects dependencies, and gets out of the way. Every
  change to logic, rules, templates or UI reaches the team on next launch with no
  rebuild. This is the single most valuable idea in either project.
- *Two-tier offline cache.* An external-code cache gated on the app booting, and
  a rules/templates cache gated on a **successful build** — deliberately
  different guarantees, thoughtfully chosen.
- *Atomic cache replacement.* Staged in a sibling folder, swapped by rename, so
  a copy interrupted by an unmounted volume or a sleeping laptop never becomes
  the cache.
- *Forced-cache relaunch.* When the published tree throws on load, the app
  relaunches pinned to the last known-good copy. The reasoning is exactly right:
  an in-process retry would fail on half-registered IPC handlers.
- *Startup recovery.* If the external files cannot be found at all, the user is
  offered a folder picker rather than a crash, and the choice is remembered.
- *Publish tooling that understands its environment.* `publish-external.sh`
  checks the volume is genuinely *mounted*, not merely that the directory exists
  — because `/Volumes` is writable, so an unmounted share would silently publish
  to the boot disk and leave a stub blocking the real mount.
- *Build-time UI snapshot.* A `beforePack` hook copies the external UI into the
  bundle as a fallback, tracking a manifest so deletions propagate.
- *Breadth economy.* 33 module types from 7 layout templates. Adding a type is
  minutes.
- *Documentation.* The comments explain *why*, not what. They are the reason this
  analysis took hours rather than days.

**Weaknesses — nearly all in the engine.**

- `create_html_file` is a ~700-line function that redefines a dozen nested
  helpers on every call.
- `await someArray.forEach(async …)` appears five times. `forEach` ignores the
  returned promises, so none of those awaits wait for anything.
- No component model. A brief row *is* a module, with pseudo-components flattened
  into prefixed properties (`lockup_width`, `modulePaddingTop`). `button` and
  `lockup` are modelled as module types, which they are not.
- Output is built by string concatenation with `@indent@` / `#newline#` sentinel
  round-trips to manage whitespace.
- The JSON rule DSL **fails silently on a misspelled key.** Two rules in
  `setup_rules.json` say `"ovewrwrite"` and have therefore never executed —
  `trade product tile` and `trade product banner` have never been normalised. Two
  dead rules out of ~342 is a decent hit rate; the silence is the problem.
- `valid_rule` contains several empty `if`/`else` branches and unreachable
  assignments — evidence of debugging left in place.
- No tests.

### AERS-Autobuilder beta

**Strengths — nearly all in the engine.**

- *A real entity model.* Modules and components are distinct, uuid-identified,
  parent-linked. Components have their own brand, palette and properties, and
  inherit from their parent where unset.
- *Explicit structural assembly.* `structureEDM` builds the nested tree through
  successive reduces — module column, module container, block column, block row,
  block container, structure — each governed by a named predicate
  (`start_new_block_container`) that states its grouping rule in readable terms.
- *Recursive rendering.* Layout primitives (`gridContainer`, `gridRow`,
  `gridCol`, `container`) plus component templates, rendered recursively. No
  string surgery.
- *Expressive module definitions.* Each is a JS module exporting
  `default_properties`, `component_positions`, `internal_layout`, and
  `modify()` / `style()` / `modes()` hooks.
- *Layered settings.* `default_properties` → rules → `user_settings` →
  `locked_settings`, applied over multiple passes with explicit loop counts.
- *Proper property systems.* Brand inheritance with `parent_brand`, palettes
  resolved per brand, spacing normalised to arrays via `updateSpacing`, rich text
  split into `formatRichText` / `insertRichText`.
- *Two template sets*, div-based and table-based, for output-format switching.
- *Free instrumentation.* Every run writes `email_json.json`, `module_store.json`,
  `entity_store.json` and `component_store.json`. These are exactly the artifacts
  golden-file testing needs.
- *Better diagnostics.* All 20 console methods forwarded to the renderer,
  `electron-log` to disk, a dev-mode banner driven by `dev_settings.json`, and an
  `uncaughtException` dialog.

**Weaknesses — nearly all operational or structural.**

- *No deployment story.* Everything ships inside the `.app`; every rule tweak is
  a rebuild and a redistribution.
- *Configuration travels through the filesystem.* `REQUIRED_DATA.json` is written
  to disk, then read at require time by `constants.js`, then re-exported to ~44
  module-level importers. The cache-busting `load()` helper exists largely to
  force that chain to re-evaluate.
- *Layout duplication.* Every module type carries a bespoke `internal_layout`.
  `banner.js` / `banner flipped.js` and `product banner.js` / `product banner
  reversed.js` are near-identical pairs; the three footers share a skeleton.
- *Rule files reloaded per module per pass*, with `require.cache` busted each
  time.
- *Dead and half-finished code.* `git-clone` imported twice and used nowhere;
  `updateAutobuilder()` is a `// TBC` stub. Together these are the remains of an
  intended auto-updater.
- *The UI contract has already drifted.* The copied `preload.js` exposes
  `downloadImages`, `setRules`, `setModuleTemplates` and
  `_test_add_file_locations`; `app_main.js` registers handlers for none of them.
  The Download Images button currently invokes a channel that does not exist.
- *Log forwarding is unsafe and incomplete.* Arguments are sent raw over IPC, so
  anything non-cloneable throws, and only the main window receives them.
- No tests. Git history is 20 consecutive commits titled `_`.

---

## 3. Decisions

| # | Decision | Record |
|---|---|---|
| 1 | Bootstrap only in the `.app`; engine and library run from the shared volume | [ADR 0001](docs/adr/0001-engine-runs-outside-the-app-bundle.md) |
| 2 | The repository is the only source of truth; publishing is one-directional | [ADR 0002](docs/adr/0002-the-repository-is-the-only-source-of-truth.md) |
| 3 | Layouts composed from node constructors; presets are compositions, not a separate mechanism | [ADR 0003](docs/adr/0003-layouts-are-composed-not-configured.md) |
| 4 | The beta's module library is the foundation. v2.5's rules are retired, not migrated | §4.2 |
| 5 | Build configuration passed in memory, not through disk | §4.3 |
| 6 | Renderer UI ships in the external tree | §4.1 |
| 7 | One offline cache, gated on a successful build | §4.4 |
| 8 | Golden-file tests gate publishing, and precede the layout refactor | §4.5 |

### 3.1 What was deliberately *not* chosen

- **Everything inside the `.app`.** Rejected: rule changes happen during live
  campaigns and this makes each one a rebuild for the whole team.
- **Engine compiled in, library external.** Rejected for now, and understood to
  be the better end state once an app auto-updater exists. Engine changes are
  more frequent than the layering suggests. Also ruled out mechanically:
  `lib/modules/*.js` imports engine utilities 31 times, so library and engine
  cannot be separated without significant rework.
- **Migrating v2.5's 342 JSON rules.** Rejected: sampled, they are mostly the
  same decisions the beta already re-encodes structurally.
  `{"for":"header","fill":{"palette":"brandPalette",…}}` is `default_properties`
  in older syntax. New rules will be written in the new system as needed.
- **Volume-authoritative library files.** Rejected: the library is executable
  code, and only one person authors it today.

---

## 4. Target architecture

### 4.1 Repository layout

```
/
├── CONTEXT.md
├── docs/adr/
├── app/                    ← packaged into the .app; bootstrap only
│   ├── main.js
│   ├── package.json
│   └── build/
├── external/               ← the published tree
│   ├── src/                ← engine
│   ├── lib/                ← library
│   └── ui/                 ← index.html, renderer.js, styles.css, preload.js
├── tests/golden/           ← briefs + expected output
└── scripts/publish-external.sh
```

`src/` and `lib/` keep their names and stay siblings, so all 44 relative imports
(`require("../../../src/main/utils/load.js")` and friends) resolve unchanged. A
prettier naming scheme would cost a 44-site edit for no functional gain.

The renderer UI ships externally, and works better here than it did in v2.5. There,
`preload.js` was external while `get-external-location` and its siblings stayed
frozen in the bootstrap, so the preload contract straddled the seam. Here the
engine registers nearly all handlers and is itself external, so preload and its
handlers version together. The bootstrap keeps only the location and recovery
channels that must survive a broken engine.

### 4.2 Module library

The beta's library is the foundation and is **already almost complete**. Of
v2.5's 33 module types, only nine are actually needed, and seven already have
counterparts:

| v2.5 type | Status |
|---|---|
| petbarn header | exists |
| product tile | exists |
| product banner | exists |
| signoff | exists |
| shop your way | exists |
| footer | exists |
| trade image banner | covered by `text block` with a single image |
| hero trade | duplicate `hero standard`, minor modifications |
| specials banner | **new** — small |

The remaining 24 v2.5 types are not carried over. This is the single biggest
scope reduction available and it comes from domain knowledge, not from the code.

### 4.3 Build configuration

`constants.js` becomes a module whose values are assigned at runtime by a
`configure({ briefLocation, outputLocation, selectedSheets, … })` call from the
bootstrap, replacing the `REQUIRED_DATA.json` write-then-read-at-require-time
round-trip.

This is not cosmetic. Under ADR 0001 the engine lives on a shared volume, so the
current code would write per-user build state to shared storage — two people
building at once would overwrite each other's brief path mid-build, and it would
fail outright on a read-only mount. Removing the file read also removes most of
the reason `load()` busts `require.cache`.

Passing configuration as explicit arguments is better still, and is the direction
of travel for new code. It is not a precondition, because it is a ~44-file
refactor on the critical path buying correctness nothing currently needs.

> **This last paragraph was wrong, and phase 2 did the better thing instead.**
> The 44 came from counting `require("constants.js")` sites, not from what they
> read. Forty-three of the forty-five want only `app_dir` and `user_files`, which
> are derived from `__dirname` and are not configuration at all. Two files read
> build configuration. See *Phase 2 — done*.

`PREVIOUS_REQUIRED_DATA.json` — genuine per-user session state — moves to
`userData`, alongside the external location setting and the cache.

### 4.4 Resilience

One cache holding the whole external tree, refreshed after a **successful build**
and seeded on first launch if absent.

v2.5's two caches guarded two things with different lifecycles — code the team
did not edit, and data they did. Those are now one unit published by one command.
Of the two gates only one is worth keeping: a cached tree that boots but cannot
build is worthless, because building is the entire purpose of the app. Gating on
a successful build means the cache always holds a tree that demonstrably produced
an email.

v2.5's selective-copy machinery (`rules_cache_entries` reading `rules_list.json`)
is dropped. It existed solely to avoid dragging ~50MB of ILC spreadsheets across
the network — spreadsheets the app never opened, since the ILC lookup is a live
HTTP call. The whole external tree is under half a megabyte; copy it wholesale.

Carried over unchanged, because ADR 0001 raises its stakes: **atomic staged
replacement**, the **forced-cache relaunch**, and the **startup recovery picker**.

Two limits worth stating plainly:

- Caching engine and library means the app *starts and can build* offline. If
  briefs and output folders live on the same volume, an offline user still has
  nothing to build from. v2.5 admitted the same limitation.
- The cache is also the rollback. A bad publish is recovered by fixing the
  repository and republishing; the cache buys the hours in between. A
  "republish the previous good commit" path is worth adding eventually.

### 4.5 Testing

Golden-file tests: two or three real briefs committed alongside their expected
output. `publish:external` runs them and refuses to publish on an unexpected
diff. An intended change is accepted by committing the new expected output, which
makes the change reviewable.

Snapshot the **intermediate** artifacts, not only the final HTML. The engine
already writes `email_json.json`, `module_store.json`, `entity_store.json` and
`component_store.json` on every run, so the instrumentation exists. A palette
change then shows as one altered hex value rather than a wall of re-flowed HTML —
which is what makes the layout refactor tractable.

**Prerequisite:** uuids are randomly generated, so they must be seeded or stripped
before comparison. Small, contained, and blocking.

### 4.6 Carryover slate

| Feature | Decision |
|---|---|
| ILC image downloader | Port **and fix**. Currently `await emailData.forEach(async …)` returns before any download starts, and `download_image` is fire-and-forget, so failures are swallowed. |
| Config popup | Shrinks to a bootstrap-owned panel: where the external tree resolved from, which candidate won, cache status. v2.5's three-folder config and `user_config.json` disappear — there is one external location now, and the bootstrap already owns it. Stays in the bootstrap so it works when the engine is broken. |
| `file_data` window | Keep as-is. |
| Console forwarding | The beta's 20-method coverage and `electron-log`, wrapped in v2.5's defensive serialisation and all-windows broadcast. |
| Dev mode, `electron-log` | Keep. `electron-log` earns its place under ADR 0001 — an on-disk log is how a teammate's failure against a published tree gets diagnosed. |
| `git-clone` | Remove the dead imports. Revisit at auto-update. |

---

## 5. Delivery

Publishing targets a parallel location for the whole of development:

```
/Volumes/Chats_Marketing/Design WIP/- 2019 Design WIP/Design Team/AERS Autobuilder/Universal Builder
```

v2.5 continues to serve the team, untouched, until parity is proven. The two
`.app`s have different bundle identifiers and coexist.

This matters more than it looks. Under ADR 0001 the external-loading and cache
machinery *is* the product. Developing locally and publishing only at cutover
would mean discovering `NODE_PATH` resolution problems, cache staging failures
and publish bugs on the day of the switch. A parallel folder costs one constant
and allows running the real thing end-to-end from week one.

| Phase | Work | Rationale |
|---|---|---|
| **0** | ✅ Golden briefs; strip uuid nondeterminism | Nothing downstream is safe without it |
| **1** | ✅ Repo layout; bootstrap; `NODE_PATH` external loading; one cache; publish script → parallel folder | Proves the architecture first, not last |
| **2** | ✅ `configure()` refactor; carryover slate; config panel; reconcile the drifted preload contract | Makes the shell real |
| **3** | ✅ Layout constructors across all 19 module definitions | Guarded by phase 0 |
| **4** | `specials banner`; `hero trade` | Cheap only once phase 3 lands |
| **5** | Parity on real briefs; cut over | The switch |

### Phase 0 — done

Six cases in `AERS-Autobuilder/tests/golden/`, run with `npm test`. Two real
campaign briefs (Petbarn and Greencross) plus four of the beta testing sheets
covering layout, styling, palettes and brand inheritance. Each case snapshots
the four intermediate stores and the rendered HTML.

Determinism came cheaper than expected. There was exactly one source of
randomness in the engine — `Math.random()` at `setup.js:103` — now a per-entity
counter in `src/main/utils/uuid.js`, reset at the top of each sheet so a sheet
builds identically whether run alone or after five others. Verified across
repeated builds inside one process, which is how the app actually runs.

Nothing else varied: `Date()` reaches the templates but no template reads it,
and the four stores are written with `addDate = false`.

### Phase 1 — done

The repository is now the layout in 4.1, with one deviation: a single root
`package.json` rather than one per folder. One dependency list, one `npm
install`, and the golden tests resolve the same package versions the app does.
`external/` is kept out of the bundle by a `files` whitelist instead.

`src/` and `lib/` moved together and kept their names, so all ninety-odd
cross-tree relative imports resolved unchanged — confirmed by the phase 0
goldens passing byte-for-byte immediately after the move, which is the job they
were built for.

Packages resolve over `NODE_PATH` rather than by injection —
[ADR 0004](docs/adr/0004-the-external-tree-resolves-packages-over-node-path.md).
This is what made the move a move rather than a rewrite: v2.5's injection
approach would have meant threading an object through ~90 files.

Verified against a real packaged `.app`, not assumed:

| | |
|---|---|
| Published tree found on the volume with no environment override | ✅ |
| Bare requires resolve from inside `app.asar` over `NODE_PATH` | ✅ |
| Preload resolves its own packages in the renderer process | ✅ |
| Cache refreshed on a successful build, gate recorded | ✅ |
| Cache seeded on first launch when absent | ✅ |
| Bad publish detected, falls back to the cache | ✅ |
| Launch pinned to the cache ignores the broken tree | ✅ |
| Broken tree *and* no cache fails with a clear message | ✅ |
| `publish:external` refuses to publish on a golden diff | ✅ |

Two things came out that were not planned work. `index.html` referenced six
icons under `build/` that were never copied across from v2.5, so every one of
them has been a broken image in the beta; they now live in `external/ui/icons/`.
And per-user build state — `REQUIRED_DATA.json` and the four data stores — was
being written beside the engine, which under ADR 0001 is the shared volume. The
bootstrap now points both at `userData` through the environment. That is a
stopgap wearing the shape of 4.3, not the fix, but it is what makes the published
tree safe to run from before `configure()` exists.

Copying the tree off the network share for the cache takes around 25 seconds.
It is backgrounded and gated behind a ten-second delay, so nobody waits on it,
but it is slower than the half-megabyte suggests.

**Phase 3 is the one expected to slip.** It is the only phase with genuine design
risk, and "I'll know the right constructor API when I see it" is doing real work
in the estimate. Derive the API from the existing 24 definitions rather than
designing it up front.

### Phase 2 — done

**The `configure()` refactor was two files, not forty-four.** 4.3 sized it by
counting `require("constants.js")` sites. But 43 of the 45 want only `app_dir`
and `user_files`, both derived from `__dirname` — static paths, not
configuration. Only `main.js` and `aers utilities.js` read anything a build
chooses, and two of the destructures were dead: `renderEmail.js` pulled five
values it never used, `setup.js` pulled a sixth.

So the better option — explicit arguments, which 4.3 called the direction of
travel and deferred as too expensive — turned out to be the affordable one, and
that is what `buildEmails(config)` now is.

| | Before | After |
|---|---|---|
| How configuration reaches the engine | written to `REQUIRED_DATA.json`, read back at require time | an argument |
| `constants.js` | 8 exports, read a file on load | 2 exports, both `__dirname`-relative |
| Env vars between bootstrap and engine | 3 | 0 |
| Per-user state on the shared volume | prevented by a stopgap | structurally impossible |

`build_config.js` holds the configuration for the build in progress. Module-level
state, deliberately: `buildEmails()` takes an argument, which is where explicitness
matters, but `aers.log()` and `aers.writeData()` are called from sixteen places,
and a logger that demands its log location at every call site is worse code. It
must never be loaded through `load()`, which deletes it from `require.cache` — the
same constraint `uuid.js` already carried.

Two failures that were reachable from a first launch are now refused up front: an
empty brief path reaching `XLSX.readFile` as `""`, and an empty
`BRIEF_PARENT_FOLDER` making `AERS_FILES_LOCATION` resolve against the working
directory, so the app wrote a log beside itself and carried on.

**The brief parser now finds its header row by looking for it.** It scans for the
column the sheet is required to have — `offerAlias`, `moduleType` — and takes the
last of a run, because the current template repeats the Offer Library header and
the data sits under the second one. Both templates now parse: `demo.xlsx` lands on
row 2 as before, `beta-testing.xlsx` on row 1, which it never did.

That closes the gap 4.5 left open. **`GXV Brand Testing` is now a golden case** —
the sheet the tests could not cover, because it exercises `offerDetails` against
the older template and the build died on `Cannot read properties of undefined
(reading 'offerAlias')`. Its offers resolve correctly and the header row is no
longer consumed as an offer.

Alongside it, `tests/brief-errors.js`: ten cases over the failures the golden
tests structurally cannot reach, because every golden brief is one that builds.
They assert on the *message*, not on the fact of throwing — the old exception
threw too, it just named neither the sheet nor the cause.

**The preload contract is reconciled, and checkable.** Every channel the renderer
can invoke now has a handler; `downloadImages` was implemented, `setRules`,
`setModuleTemplates` and `_test_add_file_locations` were removed along with the
config popup that drove two of them, which nothing had ever opened.

Three more things turned out to be dead in the beta, not just drifted:

- `openFileData` in `renderer.js` was `async () => {}`. The channel and its
  handler both existed; only the renderer's half was missing, so the "show file
  data" button did nothing.
- The window it opens compares `original_data` against `new_data`, and the engine
  declared both on its result and assigned neither. It showed `{}` against `{}`.
  They now hold the brief as read and the modules that came out of it.
- `updateAutobuilder()`'s message was assigned to a variable and dropped.

**The ILC downloader works.** v2.5's had three separate reasons not to:
`await emailData.forEach(async …)` returned before any fetch started, the
download was fire-and-forget, and the lookup returned a *string* on failure that
the caller then read `.image` off. The UI opened a folder after a fixed
three-second wait regardless. It is now awaited end to end, bounded at four
concurrent requests, and returns per-code failures that the renderer shows.
`node-downloader-helper` is not carried over — `fetch` plus a file write covers
it, and its resume and progress features were unused.

Verified against a mocked network (bounded concurrency, `"0"` cells skipped,
direct URLs passed through, timeouts and missing products collected rather than
swallowed) and the live endpoint's response shape re-checked, since the port
would have shipped broken if Petbarn's search had changed since v2.5. **Not
verified end to end against a real brief: neither test brief has ILC columns.**

**The config panel is a dialog, not a window.** 4.6 says it stays in the
bootstrap so it works when the engine is broken — but every window in this app
loads its HTML *and its preload* from the external tree, so a window would fail
in precisely the case the panel exists for. A dialog needs neither. It is reached
from an `External Files` menu the bootstrap appends to the default menu, so it
survives the renderer never loading at all, and from a button in the app.

Console forwarding is now safe and reaches every window. The beta sent arguments
over IPC raw, so `console.error("failed:", err)` threw inside the error handler —
`Error` does not survive structured cloning, and would arrive as `{}` if it did.
Errors go across as their stack, and the whole thing is wrapped so logging can
never be what breaks a build.

### Phase 3 — done

**Nineteen module definitions, not twenty-four.** The count in the table came
from `ls`. Nine of the files under `lib/modules/` are components, which have no
`internal_layout` — a component does not decide where it goes, the module
holding it does — and two are scaffolds to copy.

The constructors were derived from those nineteen rather than designed, and what
they turned out to be is one point for each level of a grammar the `.njk`
templates already enforce:

| | emits | children are |
|---|---|---|
| `container(options, rows)` | `gridContainer` | rows |
| `columns(options, cols)` | `gridContainer` + an implied row | columns |
| `row(options, cols)` | `gridRow` | columns |
| `stack(options, components)` | `gridRow` + an implied column | components |
| `col(options, children)` | `gridCol` | components, or a container |

`columns()` and `stack()` are the two shorthands, and they exist for a reason
found while reading the definitions: the implied row and column are selected by
writing a bare string key, `innerLayout: "single_row"`, that nothing validates.
Two footers spell it `inner_block`. More on that below.

Alongside them `component()`, `image()` and `button()` for components a layout
declares itself, and `nothing()` for a branch that drops part of a layout —
which was written as `{}` and read like an oversight.

**Three presets, not seven.** ADR 0003 says presets should mirror v2.5's seven
templates. Three of the seven have an analogue here — `single_column`,
`two_columns`, `stacked_rows` — and between them they are the whole layout of
twelve of the nineteen modules. The other four of v2.5's seven describe how it
grouped *whole modules*, which in this engine is `structureEDM`'s job, not a
module's. Writing them now would be the speculative design the ADR warns
against; each is three lines when something needs it.

The seven that stayed hand-built are the two headers and five footers — the ones
the ADR predicted would never fit, and they still get per-node overrides,
branching on module state, and inline literal components, because the
constructors and the presets emit the same nodes and mix at any depth.

| | Before | After |
|---|---|---|
| Lines across the 19 definitions | 2558 | 1936 |
| `banner.js` vs `banner flipped.js` | 111 lines each, structurally duplicated | 96 each, differing in two padding values |
| `header greencross vets.js` | 253 | 159 |
| `footer greencross vets.js` | 271 | 143 |

**The rewrite is provably a no-op.** `tests/layouts/` calls every module's
`internal_layout` directly, once per branch it can take, and snapshots the tree.
It was recorded before a single definition was touched, and all nineteen were
byte-identical afterwards — key order included, because `email_json.json` is
compared byte for byte and every constructor emits
`{ block, [innerLayout], ...options, children }` so an options bag lands in the
order it was written.

This test exists because the golden briefs only reach twelve of the nineteen
modules. `article`, `banner flipped`, `banner stacked`, `default`, `footer
default`, `product banner` and `product banner reversed` appear in no brief in
the repository, and the refactor rewrote all seven.

**Two footers have been shipping malformed tables.** `signoff petbarn.js` and
`shop your way petbarn.js` set `inner_block: "single_row"` where they meant
`innerLayout`. Nothing reads `inner_block`, so the container held a column with
no row between them and the rendered email put a `<td>` straight inside a
`<tbody>` — seven times across the golden cases, in two modules that go out on
real Petbarn campaigns.

Fixed as a separate step, after the byte-identical rewrite, so the golden diff
shows only the fix: seven `<tr>`/`</tr>` pairs added across four cases, nothing
removed, nothing else changed. It is the class of bug the constructors are meant
to end — `columns()` cannot be misspelled into silence.

---

## 6. Notable findings

Things discovered during analysis that are worth acting on regardless.

- **Two v2.5 rules have never executed.** `setup_rules.json` lines 5 and 11 spell
  the key `"ovewrwrite"`. `trade product tile` and `trade product banner` have
  never been normalised to their base types. Moot once the rules are retired, but
  it explains any historical oddity with trade product modules.
- **The beta's Download Images button is dead.** `preload.js` exposes the
  channel; `app_main.js` has no handler. Fixed in phase 2, along with the
  three other orphaned channels and three features that were dead in the
  renderer rather than merely drifted.
- **Six of the UI's icons have never loaded.** `index.html` was copied from v2.5
  along with its references to `build/folder.svg`, `build/tick.svg` and the four
  `navigate_*.svg`, but the files themselves were not. Fixed in phase 1; the
  icons now live in `external/ui/icons/`.
- **`resources/` is 15MB of duplicated packages.** Copies of `lodash`,
  `nunjucks`, `xlsx`, `asap`, `a-sync-waterfall` and `git-clone`, plus an empty
  folder named `bing bong`. It was the beta's `buildResources` directory and
  nothing reads it. Untracked, excluded from packaging, and safe to delete.
- **`git-clone` is imported twice and used nowhere.** With the `updateAutobuilder()`
  stub, it marks an auto-updater that was started and abandoned — the same
  mechanism ADR 0001 defers to.
- **The beta's log forwarding will throw on non-cloneable arguments** and only
  reaches the main window. Fixed in phase 2.
- **`applyModifications` reloads every module's rule file from disk on every
  module on every pass**, busting `require.cache` each time. Not urgent; likely
  the largest easy performance win in the engine.
- **The brief parser locates its header row by counting, not by looking.**
  `setup.js` deletes a fixed two rows from the Offer Library sheet and one from
  a content sheet. The current brief template happens to carry two header rows
  in the Offer Library; the previous generation carried one. Open an older brief
  and the first offer is silently consumed as the header, every alias lookup
  misses, and the build dies with `Cannot read properties of undefined (reading
  'offerAlias')` — which names neither the sheet nor the brief. Found in phase 0
  and left unfixed on purpose: it is a behaviour change, and it now has golden
  tests to be made against. **Fixed in phase 2**, and `GXV Brand Testing` — the
  sheet this made untestable — is a golden case now.

---

## 7. Open questions

- **`fragment`** — the beta's boolean meaning "render standalone, do not wrap in
  the grid" is poorly named. Candidates: `standalone`, `unwrapped`. Decide before
  phase 3 touches `structureEDM`.
- **Auto-update** — the deferred half of ADR 0001. Once it exists, revisit moving
  the engine back inside the `.app`.
- **Brand data migration** — `colour_palettes.json` (885 lines) and the
  brand-conditional rules in `module_rules.json` are the one part of v2.5's rules
  worth mining. A data question, not an architectural one; needs an audit against
  the beta's existing palette library.
- **Table vs div template sets** — the beta ships both. Which is authoritative,
  and is the other maintained?
