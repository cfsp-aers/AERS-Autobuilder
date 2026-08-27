# Handoff — Universal Builder combination plan

Date: 25/08/2026
Session type: grill-with-docs, no code changed

## What this was

A design session over two sibling projects in
`Dev Projects/Autobuilder 2.5 Universal/`:

- `AERS Autobuilder v2.5/` — the app the team uses for real work
- `AERS-Autobuilder/` — a newer beta engine, extracted from its working home and
  partially rewired

Goal: decide how to combine them into one application. No implementation was
started.

## Where things stand

Nothing has been built. The output is documentation:

- [combination-plan.md](../../combination-plan.md) — strengths/weaknesses of both,
  all decisions, target architecture, six-phase delivery plan
- [CONTEXT.md](../../CONTEXT.md) — glossary, including the `module` / `component` /
  `template` collisions between the two codebases
- [ADR 0001](../adr/0001-engine-runs-outside-the-app-bundle.md) — engine runs
  outside the app bundle
- [ADR 0002](../adr/0002-the-repository-is-the-only-source-of-truth.md) —
  one-directional publishing
- [ADR 0003](../adr/0003-layouts-are-composed-not-configured.md) — layouts
  composed from node constructors

## The one-line summary

v2.5 has the operations story and a weak engine; the beta has the engine and no
operations story. The combined product is **the beta's engine wearing v2.5's
shell**, published one-directionally from a single repository.

## Decisions a successor must not silently reverse

1. **Bootstrap only in the `.app`.** Engine *and* library run from the shared
   volume. Chosen over the cleaner "engine compiled in, library external" because
   engine changes are frequent, and because `lib/modules/*.js` imports engine
   utilities 31 times. Understood to be revisited once an auto-updater exists.
2. **The repository is authoritative for everything.** `publish-external.sh --pull`
   is removed, not merely unused. Holds only while one person authors rules.
3. **v2.5's 342 JSON rules are retired, not migrated.** New rules get written in
   the new system.
4. **Only two new module types are needed** — `specials banner` and `hero trade`.
   This came from domain knowledge, not the code, and it is the single largest
   scope reduction in the plan. The other 24 v2.5 types are not carried over.
5. **Golden-file tests come before the layout refactor**, not after.

## Things that will surprise a successor

- The beta as extracted **could not start** at session open. `app_dir` pointed at
  `lib/` instead of the repo root and `REQUIRED_DATA.json` was absent. Both were
  fixed mid-session by the user. It works; the extraction was incomplete.
- The beta's root-level `app_main.js`, `index.html`, `renderer.js`, `preload.js`,
  `styles.css` are **untracked in git** — a half-finished copy of v2.5's shell
  onto the beta engine. The preload exposes channels `app_main.js` never handles,
  so the Download Images button is already dead.
- v2.5's engine is weak but its **comments are exemplary** and explain *why*.
  They are the reason the analysis was tractable. Read them before rewriting
  anything they describe.
- Only **four** non-builtin packages are needed by the engine (`lodash`, `xlsx`,
  `nunjucks`, `git-clone`), and every cross-file import is relative. That is why
  `NODE_PATH` + `Module._initPaths()` in the bootstrap is enough, and no
  dependency-injection layer is needed.

## Immediate next step

Phase 0 of the plan: commit two or three real briefs with their expected output,
and seed or strip the random uuids so comparison is deterministic. Everything
else is blocked behind it — particularly the phase 3 layout refactor, which
rewrites `internal_layout` across all 24 module definitions.

## Open questions carried forward

- Rename `fragment` (the beta's "render standalone" boolean) before phase 3.
- Audit `colour_palettes.json` (885 lines) against the beta's palette library —
  the one part of v2.5's rules worth mining.
- The beta ships both table-based and div-based template sets. Which is
  authoritative, and is the other maintained?
