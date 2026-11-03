# Test library — implementation plan

Build the snapshot suites against a library of their own, so editing the real
one can never block a publish by looking different. Written 04/11/2026.

## Status

**Planned, not started.**

## The problem

The golden cases and the layout snapshots build against `external/lib/`, so a
baseline depends on three things: the brief, the engine, and the library.
[ADR 0006](docs/adr/0006-snapshots-record-their-inputs.md) let module edits pass
by tracing each difference back to the definition that produced it and calling
the result "drift". That has one hole, and it is the one that keeps firing:

> If the engine has also changed since the baselines were recorded, nothing is
> forgiven. Every difference is blamed on the engine.

On 04/11/2026, 5 of the 10 golden cases and 1 of the 26 layout snapshots
failed like this:

```
inputs: the engine, brands.json, footer/shop your way petbarn.js
email_json.json -- 7 differences, the engine changed
```

The differences are the Shop Your Way edit (`black` → `#FFFFFF`). But the engine
also had changes that were never recorded, and the suite cannot separate the
two. Baselines are not re-recorded after drift, so engine and library changes
pile up together, and an ordinary module edit then reads as a regression.

## What it is

`external/lib-test/` is the **test library**: a frozen copy of the library that
belongs to the tests. The golden cases and the layout snapshots build against it
and never read `lib/`. Editing `lib/` cannot move a baseline, so the only thing
that can move one is the engine (or a deliberate edit to `lib-test/`), and
every difference is something to read.

The real library keeps a safety net that checks whether it builds, not what it
produces: the **library smoke test**. A broken module still blocks a publish. A
module that only looks different never does.

## Decisions

### A sibling of `lib/`, like `lib-dev/`

The reasons are the same as in [ADR 0009](docs/adr/0009-the-dev-library-overlays-lib-per-file.md).
Library files reach the engine through 58 relative requires
(`../../../src/main/constants.js`), so the copy has to sit at the same depth. A
folder under `tests/` would break every one of those requires. `lib-test/`
copies across unedited, and `tests/properties.js` and `tests/template.js`, which
walk `external/lib` by path, never see it.

It is left out of the publish the same way `lib-dev/` is. `app/local_copy.js`
needs no change: it only clears `require` entries for trees that are published.

### The override lives in `build_config.js`, set by the test itself

There are two ways in, and neither fits:

- **A field on `configure()`.** The layout suite never runs a build. It
  `require`s module files and calls `internal_layout()`, and `component()`
  inside that reads the component rule files through `loadLibrary()`. With no
  build configured, there is nothing for a `configure()` field to live on.
- **An environment variable.** It would work in both suites, but it is
  invisible: nothing at the call site says which library a build used, and the
  app could inherit one from a shell.

So `build_config.js` gains one piece of module-level state, the base library,
with an exported setter:

```js
let baseLibrary = null;

/** Test-only. Build against `root` instead of lib/. Not reset by configure(). */
function useBaseLibrary(root) { baseLibrary = root; }
function baseLibraryRoot() { return baseLibrary; }
```

It belongs in `build_config.js` and not `utils/library.js` for the reason
`devFiles` does: `load()` hands every caller a fresh copy of `library.js`, so
state kept there would be several states. `build_config.js` is required
directly.

`configure()` deliberately does not reset it. The golden runner sets it once in
`build-case.js` before `buildEmails()`, and the layout suite sets it once at the
top. The app never calls it, so for the app nothing changes.

### The dev library never overlays the test library

```js
function libraryRoots() {
    const base = baseLibraryRoot() || user_files;
    return devLibraryEnabled() && base === user_files ? [lib_dev, base] : [base];
}
```

A baseline that depends on what one person has in `lib-dev/` would depend on
whose machine ran it.

### A straight copy first, trimming later

On day one `lib-test/` is a byte-for-byte copy of `lib/`. That makes the
switch-over provable: the output cannot change, so every case and snapshot must
pass unchanged against baselines recorded on `lib/`. Anything else is a bug in
the switch.

Cutting it down to modules built for testing (one test brand, one module per
engine feature) would make it smaller and clearer. That is a separate piece of
work and not needed to fix the problem.

### Any difference fails: no more drift

With a frozen library, "a library file changed" is no longer an everyday event.
It is a deliberate edit to `lib-test/`, made in order to move the output. So the
drift verdict, `--strict`, and the explanation machinery in `tests/inputs.js`
(`explains`, `explainsModule`, `compare`, `compareModule`, and the per-library
loaded/inert split) have nothing left to do.

What stays:

- **The manifest**, slimmed to the engine hash, one hash over `lib-test/`, and
  the brief. It says *what* moved ("the engine changed"), but it no longer
  decides whether that is allowed.
- **`attributor()` and `tally()`**, for display only. "7 differences, all in
  footer/shop your way petbarn.js" is still the quickest way to read a diff.

A failure reads: the output changed, here is what moved, here is the diff,
`npm run test:accept` if it is intended.

### The smoke test checks that the real library builds, not what it produces

`tests/library.js` builds the same brief and sheet as every golden case against
the **real** `lib/`, then:

1. asserts each build succeeds and writes all four stores and the HTML
2. `require`s every real module definition and calls `internal_layout()` for
   every variant the layout suite uses, asserting it returns a node tree
   without throwing

It compares nothing to a baseline, so there is nothing to accept. It runs in
`npm test` and in the publish gate, and it is never waived: a failure means a
real brief would fail to build.

The layout suite's synthetic inputs (`VARIANTS`, `current_for`, `content_for`)
move into `tests/layouts/fixtures.js` so that both files use the same ones.

One known trade-off: the smoke test uses the golden briefs, which name real
module types. Deliberately retiring a module type that one of those briefs uses
means updating the brief. That is the same thing a designer's brief would need,
so the check is fair.

### The rule suites stay on the real library

`template.js`, `palette.js`, `precedence.js`, `update.js`, `properties.js` and
`assets.js` read files in `lib/` by path. They test rules about the real
library ("no brand resolves to the blank default", "the palette layers do not
overrule each other"), which is the point, and they read the current values
rather than snapshotting them. They are out of scope here.

## Steps

### 0. Start from green

The suites fail today, and the plan's proof (step 3 and step 4 change nothing)
needs a clean baseline. Review the current golden and layout failures. They
combine the uncommitted engine work with the Shop Your Way, `hero trade`,
`trade image banner` and `brands.json` edits. If the diff is what was intended,
run `npm run test:accept` and commit the result on its own.

**This is a judgement on someone's work in progress, and it is the user's to
make, not the implementer's.**

### 1. The seam

- `external/src/main/constants.js`: add `lib_test`
  (`external/lib-test`), with a comment pointing here.
- `external/src/main/build_config.js`: add `useBaseLibrary()` and
  `baseLibraryRoot()` as above.
- `external/src/main/utils/library.js`: `libraryRoots()` as above.
  `resolveIn()` is unchanged.
- New cases in `tests/dev-library.js`, which already owns "where a library file
  is read from":
  - no override: `libraryRoots()` is exactly what it was, with the flag on and off
  - override set: `libraryRoots()` is `[override]`, with the flag on and off
  - override set: `libraryPath()` and `loadLibrary()` resolve under the override
    and record no dev files

The engine hash moves, but no output does, so the snapshot suites must still
pass with zero differences.

### 2. The test library

- `cp -R external/lib external/lib-test`, minus `.DS_Store`.
- `scripts/publish-external.sh`: add `--exclude="/lib-test/"` beside the
  `lib-dev/` line, with a comment.
- Check: `npm run publish:external:dry` lists nothing under `lib-test/`.

### 3. Golden cases on the test library

- `tests/golden/build-case.js`: call
  `useBaseLibrary(path.join(repo_root, "external/lib-test"))` before
  `buildEmails()`.
- `tests/inputs.js`: point `HTML_TEMPLATES`, `LIBRARIES` and `MODULES` at
  `external/lib-test` for now (they are replaced in step 5).
- Check: `npm run test:golden` gives **10/10 ok, with no drift**. Then make a
  throwaway edit to `external/lib/modules/footer/shop your way petbarn.js`: still
  10/10 ok.

### 4. Layout snapshots on the test library

- `tests/layouts/layouts.js`: set `modules_root` to `external/lib-test/modules`,
  and call `useBaseLibrary()` before the first module `require`.
- Check: `npm run test:layouts` gives **26/26 ok**. Repeat the same throwaway
  edit: still 26/26.

### 5. Drop drift

- `tests/inputs.js`: shrink to `fingerprint()` (engine, one `lib-test/`
  hash, brief), `describe()` of what moved, `attributor()`/`makeAttributor()`,
  `tally()`, and the manifest read/write.
- `tests/golden/golden.js` and `tests/layouts/layouts.js`: verdicts become
  `ok` / `ok (formatting)` / `CHANGED` / `NO BASELINE`. Remove `--strict` and
  the drift report. Print the per-definition tally on a failure.
- `package.json`: remove `test:strict`.
- Re-record both manifests with `--accept`. The artifacts must not change; only
  the two `inputs.json` files change shape. Commit that on its own.

### 6. The smoke test

- `tests/layouts/fixtures.js`: move `VARIANTS`, `current_for`,
  `components_for` and `content_for` here. `layouts.js` requires them.
- `tests/golden/build-case.js`: take an optional `--library real`, which
  skips `useBaseLibrary()`.
- `tests/library.js`: for each case in `cases.json`, build it in a scratch
  directory with `--library real` (one child process each, as golden does), then
  run the `internal_layout()` check over `external/lib/modules`, using the same
  file walk and `template.js` filter as `layouts.js`.
- `package.json`: add `test:library`, run it in `npm test` after the rule suites,
  and give it a `//test:library` comment.
- `scripts/publish-external.sh`: run it as its own gate step between the rule
  suites and the snapshots, with its own refusal message ("a real brief would
  fail to build").

### 7. Write it down

- `docs/adr/0011-snapshots-build-against-a-test-library.md`, the decisions
  above in ADR form.
- `docs/adr/0006`: status becomes *Superseded in part by 0011*. Recording inputs
  stays; drift and per-difference excusing go.
- `CONTEXT.md`: **test library** and **library smoke test**, next to **dev
  library**.
- `tests/golden/README.md`: rewrite "When a case moves", remove the drift and
  colour-library known gaps, and say where the cases build from.
- The header comments in `golden.js`, `layouts.js` and `inputs.js`.
- This file: Status.

## Checks

At the end, each of these should behave as stated:

| Change | Rule suites | Smoke test | Snapshots |
|---|---|---|---|
| Edit copy or colours in a real module | pass | pass | **pass** |
| Syntax error in a real module | pass* | **fail** | pass |
| Real module's `internal_layout()` throws | pass | **fail** | pass |
| Change a padding default in the engine | pass | pass | **fail**, naming the engine |
| Edit a module in `lib-test/` | pass | pass | **fail**, naming the test library |
| Dev library on with a `lib-dev/` file | pass | pass | pass, unaffected |

\* unless that rule suite happens to `require` the broken file.

## What it costs

- **The engine and two libraries.** When an engine change needs a matching
  library change (a new property every definition must declare, for example),
  it has to be made in `lib/` and in `lib-test/`. The snapshots will catch the
  `lib-test/` half if it is forgotten, and the smoke test will catch the `lib/`
  half. This is the cost of the separation, and it should be rare.
- **`lib-test/` drifts away from `lib/`.** That is the intention. The test
  library tests the engine; it is not a copy of the product to keep in sync.
- **The real modules lose snapshot coverage.** What a real module looks like is
  no longer recorded anywhere. That was the noise the suite could not filter, so
  it is the thing being removed, not a side effect.
