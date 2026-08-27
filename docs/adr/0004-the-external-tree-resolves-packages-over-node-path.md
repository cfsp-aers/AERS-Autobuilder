# 4. The external tree resolves packages over NODE_PATH

Date: 2026-08-27

## Status

Accepted

## Context

[ADR 0001](0001-engine-runs-outside-the-app-bundle.md) puts the engine, the
library and the renderer outside the `.app`, on a shared volume. That creates a
mechanical problem it does not solve: Node finds a bare `require("lodash")` by
walking up from the requiring file looking for `node_modules`. Walking up from
`/Volumes/.../Universal Builder/src/main/main.js` never reaches the app's
`node_modules`, because that is inside the bundle, several directory trees away.

The external tree makes 66 bare requires across roughly 90 files — 52 of
`lodash` alone, plus `xlsx`, `nunjucks` and `electron-log`. Every one of them
fails without an answer to this.

v2.5 answered it by injection. Its bootstrap built a `dependencies_for()` object
holding `XLSX`, `nunjucks`, `DownloaderHelper` and the rest, and passed it to
`init()`. That worked because v2.5's entire external surface was one file, which
could destructure the object at the top and use the results everywhere.

It does not transfer. Threading an injected object down to 90 files means either
a parameter on every function that touches a package, or a module-level
singleton that every file imports — which is a `node_modules` lookup with extra
steps and worse ergonomics. Either way it is a ~90-file rewrite of code that is
otherwise correct, on the critical path, buying nothing a user would notice.

A third option was considered and rejected: publishing a `node_modules` into the
external tree so the ordinary walk succeeds. That puts ~80MB of dependencies on
a network share, makes `npm install` a publishing step, and means a teammate's
`lodash` version depends on when they last launched.

## Decision

The bootstrap prepends the app's `node_modules` to `process.env.NODE_PATH` and
calls `Module._initPaths()` before requiring anything external. Bare requires in
the external tree then resolve normally, unchanged.

`electron` and `electron/main` need none of this — the main process loader
intercepts both before path resolution, so they resolve from anywhere on disk.

`init()` still receives an object, but a much smaller one: where the app is,
where per-user state goes, which candidate location won, and a callback to
report a successful build. Those are things the external tree genuinely cannot
work out for itself. Packages are not among them.

## Consequences

The engine and library are ordinary Node code. A file can be run by the golden
tests under plain `node`, required by the app from a network volume, or required
from the offline cache in `userData`, and it does not know or care which.

`Module._initPaths()` is undocumented API. It has been present and stable across
every Node release the project has run on, and the failure mode if it were
removed is loud and immediate at boot rather than subtle. The alternative is
setting `NODE_PATH` in the process environment before the process starts, which
is not possible for a double-clicked `.app`.

`NODE_PATH` is process-global. That is acceptable here because the process is
ours end to end — bootstrap, engine and library ship together — but it means the
external tree can reach *any* package in the app's `node_modules`, not a declared
subset. Nothing enforces that the tree only uses what `package.json` lists.
Removing a dependency therefore breaks the external tree at runtime rather than
at build time. The golden tests catch it.

Renderer processes inherit `NODE_PATH` through the environment, so `preload.js`
resolves its own packages from the same place. This has been verified for
`electron-log/preload`, which is the only one it currently uses.

Resolution works into `app.asar` in a packaged build; verified against a real
packaged app, not assumed.
