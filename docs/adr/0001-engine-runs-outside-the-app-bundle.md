# 1. The engine runs outside the app bundle

Date: 2026-08-25

## Status

Accepted

## Context

The combined Autobuilder is assembled from two predecessors:

- **AERS Autobuilder v2.5** — a thin Electron bootstrap whose entire logic lives
  on a shared network volume and is picked up on next launch. Strong operations
  story, weak build engine.
- **AERS-Autobuilder (beta v0.2.2)** — a modular engine with a real module /
  component entity model and a recursive template pipeline. Strong engine, no
  operations story: every change requires rebuilding and redistributing the
  `.app`.

The combined product takes the beta's engine. That forces a decision about where
the seam between "compiled into the `.app`" and "editable without a rebuild"
sits. Three positions were considered:

- **A — no seam.** Everything inside the `.app`; one repo, one home. Rejected:
  rule changes happen during live campaigns, and this makes every one of them a
  rebuild-and-redistribute cycle for the whole team.
- **C — seam below the engine.** Bootstrap *and* engine compiled in; only `lib/`
  (module definitions, `.njk` templates, colour libraries, palettes) external.
  Rejected for now, but see Consequences.
- **B — seam above the engine.** Bootstrap only in the `.app`; engine *and*
  `lib/` external. Chosen.

The deciding argument for B over C is empirical rather than architectural:
**engine changes happen more often than the layering suggests they should.** C
would send that traffic back through a rebuild, which is the cost the whole
arrangement exists to avoid.

Two findings made B substantially cheaper than it first appeared:

1. The engine's only non-builtin imports are `lodash`, `xlsx`, `nunjucks` and
   `git-clone` — four packages. Every cross-file import is relative. Prepending
   the `.app`'s `node_modules` to `NODE_PATH` and calling `Module._initPaths()`
   in the bootstrap lets all engine files run unmodified from the volume. v2.5's
   hand-injected dependency object was necessary only because it was one file.
2. `lib/modules/*.js` reaches back into the engine 31 times via
   `require("../../../src/main/utils/load.js")`. `lib/` and `src/` are welded
   together and were always going to move as one unit — which independently
   rules out C without further work.

## Decision

The `.app` contains a bootstrap only. The engine (`src/`) and the library
(`lib/`) live on the shared volume and are loaded at runtime.

The bootstrap makes the `.app`'s `node_modules` resolvable from the external
tree, so engine files need no dependency-injection ceremony.

## Consequences

**What this buys.** Engine and rule changes reach the team on next launch with no
rebuild. The v2.5 safety apparatus — last-known-good offline cache, forced-cache
relaunch when a bad publish throws, atomic staged folder swaps — carries over and
is now protecting the engine, not just one file.

**What it costs.**

- A bad publish can break every installed app at once. The forced-cache relaunch
  must cover the whole external tree, not just a single entry file.
- The engine's dependencies are satisfied by whatever the *installed* `.app`
  bundles. An engine change that needs a new package silently reintroduces the
  rebuild requirement, and does so as a crash on teammates' machines rather than
  as a build error. The dependency set shipped in the `.app` should therefore be
  deliberately generous.
- Two publish paths coexist (`build` and `publish:external`), and which one a
  change needs is not self-evident.

**What was deferred.** C plus an app auto-updater is understood to be the better
end state: it puts the engine back under review and rebuild while keeping content
changes same-day, and the auto-updater removes the redistribution cost that made
rebuilds expensive in the first place. B is chosen as the near-term step, not as
the destination. Revisit once an auto-update mechanism exists.
