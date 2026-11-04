# 11. The snapshots build against a test library of their own

Date: 2026-11-04

## Status

Accepted. Supersedes the drift verdict of
[ADR 0006](0006-snapshots-record-their-inputs.md).

## Context

The golden cases and the layout snapshots built against `external/lib/`, so a
baseline depended on the brief, the engine and the library. ADR 0006 let library
edits through by charging each difference to the definition that produced it and
calling the result *drift*. It had one hole, and it was the one that kept
firing: if the engine had also changed since the baselines were recorded,
nothing was forgiven, and every difference was blamed on the engine.

Drift never forced a re-record, so engine work and library edits piled up
together under stale baselines. On 04/11/2026, five of the ten golden cases
and one of the twenty-six layout snapshots failed this way. Their differences
were a Shop Your Way colour edit, reported as *the engine changed*. An ordinary
module edit read as a regression and blocked the publish, which was exactly
what ADR 0006 set out to stop.

The snapshots' job is to catch the engine changing. Real modules change on
purpose most days, and no attribution rule could reliably tell the two apart.
The way out was to stop the real library being an input at all.

## Decision

**`external/lib-test/` is the test library.** It started as a byte-for-byte
copy of `lib/`, and both snapshot suites build against it and never read
`lib/`. Editing the real library cannot move a baseline.

**It is a sibling of `lib/`,** for the reasons
[ADR 0009](0009-the-dev-library-overlays-lib-per-file.md) gives for `lib-dev/`:
library files reach the engine through relative `require`s, so the copy has to
sit at the same depth. `publish:external` excludes `/lib-test/`, and the app
never reads it.

**The engine has one test-only seam: `build_config.useBaseLibrary(root)`.**
`libraryRoots()` returns `[root]` while it is set. It lives in
`build_config.js` for the same reason as the dev-file record: `load()` hands
every caller a fresh copy of `utils/library.js`. It is not an option on
`configure()`, because the layout suite reads the library without ever
configuring a build, and `configure()` does not reset it. It is not an
environment variable, so the code that sets it shows which library the suite
built from. `build-case.js` and `layouts.js` set it before anything loads.

**The dev library never overlays the test library.** A baseline that depended
on what one person has in `lib-dev/` would depend on whose machine ran it.

**Any difference fails.** With a frozen library there is no ordinary edit left
to excuse, so drift, `--strict` and the explanation rules are gone. Each
baseline still records its inputs in `expected/inputs.json`: the engine, one
hash over `lib-test/`, and the brief. A failure says which of those moved, and
still tallies its differences by definition, because that is the quickest way
to read a diff. Neither of those decides the verdict.

**The real library gets a smoke test, `tests/library.js`.** It builds every
golden case's brief and sheet against `lib/`, then requires every real module
definition and runs its `internal_layout()` on the layout suite's fixtures
(`tests/layouts/fixtures.js`, so the two cannot disagree). It asserts that each
one succeeds, never what it produces, so there is nothing to accept. It runs in
`npm test` and as its own step in the publish gate, between the invariants and
the snapshots.

**The rule suites stay on `lib/`.** `template`, `palette`, `precedence`,
`update`, `properties` and `assets` check rules about the real library, and
they read current values rather than snapshotting them.

## Consequences

Editing a real module's copy, colours or structure no longer touches the
snapshots. A module that will not parse, or whose layout throws, still blocks
a publish, through the smoke test.

A snapshot failure always means the engine moved, or someone edited `lib-test/`
on purpose, and the report names which.

When an engine change needs a matching library change (a property every
definition must now declare, for example), it has to be made in both `lib/` and
`lib-test/`. If the `lib-test/` half is forgotten, the snapshots catch it. If
the `lib/` half is forgotten, the smoke test catches it.

`lib-test/` is expected to drift away from `lib/`. It exists to test the engine,
not to mirror the product. Cutting it down to definitions built for testing is
possible later and was not needed to fix this.

Nothing records what a real module's output looks like any more. That was the
noise the snapshots could not filter out, so losing it is the point of this
change.

The smoke test builds the golden briefs, which name real module types. Retiring
a type one of them uses means updating that brief.
