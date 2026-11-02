# 9. The dev library overlays `lib/` per file, off by default, never published

Date: 2026-10-27

## Status

Accepted

## Context

Trying a new or changed module definition meant editing `lib/` in place. Every
build in the checkout then used the experimental file, the snapshot suites
drifted with it, and the only way back was to undo the edit. There was no way to
keep an unfinished file beside the library and build with it on purpose.

The engine read the library on nineteen lines across eleven files, all through
`user_files`. So the change had one natural seam: the lookup itself.

## Decision

**`external/lib-dev/` mirrors `external/lib/`.** While the *Dev library* toggle is
on, a file in `lib-dev/` is read instead of the file at the same relative path in
`lib/`. Anything `lib-dev/` does not have comes from `lib/`. With the toggle off,
`lib-dev/` is never looked at.

**Every library read goes through `utils/library.js`.** `loadLibrary()`,
`libraryExists()` and `libraryPath()` replace `load(user_files, …)` and the
`existsSync` checks; `libraryRoots()` feeds the two readers that work on folders
rather than files — the nunjucks search path and the asset index. The rule
itself is `resolveIn()`, which is pure and tested against fixture folders.

**The overlay is per file and exact.** The brand-keyed template cascade asks
whether a file exists once per tier, and each tier is answered dev-then-base. A
dev `header/header.js` does not beat a base `header/header petbarn.js`. JSON is
replaced whole, never merged, so "which value ran" always has a file to point at.

**A sibling of `lib/`, not inside it.** Library files reach the engine by
relative `require` depth, which a `lib/dev/` would break, and three test suites
walk `lib/` by path, which a `lib/dev/` would join.

**Off by default, every time.** The flag is compared against `true` in
`build_config.js`, read through `devLibraryEnabled()` — which, unlike
`buildConfig()`, is false rather than a throw when no build is configured — and
is never written to `REQUIRED_DATA`, so neither a launch nor "reload" can restore
it. The toggle is only rendered when `lib-dev/` holds a file.

**Never published.** `publish:external` excludes `/lib-dev/`, so no one else's
app, and no offline cache, can see it. It is visible only when the app runs from
the checkout.

## Consequences

A dev build is never mistakable for an ordinary one: the title bar carries a
*Dev library* badge while the toggle is on, the success message counts the files
read from `lib-dev/`, and the build log lists every one of them —
`build_config.js` keeps that record, because `load()` would give a resolver-held
one a fresh instance per caller.

The golden and layout snapshots always run with the toggle off. A dev file
earns a snapshot when it is promoted into `lib/`, which is a manual copy
followed by the usual test run and re-accept.

`lib-dev/` cannot say that a base file does not exist. Nothing needs that yet.
