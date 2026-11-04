# Universal Builder

Builds Petbarn and Greencross Vets emails from a campaign brief spreadsheet.

One application replacing **AERS Autobuilder v2.5** and the **AERS-Autobuilder
beta**: the beta's engine wearing v2.5's shell. See
[combination-plan.md](combination-plan.md) for how the two were merged and what
is left to do, [CONTEXT.md](CONTEXT.md) for the language, and
[docs/adr/](docs/adr/) for the decisions that were hard to reverse.

## Layout

```
app/           the .app -- a bootstrap and nothing else
external/      everything that does anything
  src/           the build engine
  lib/           module definitions, templates, palettes
  lib-test/      a frozen copy of the library the snapshots build against
  ui/            the renderer
tests/golden/  real briefs and the output they are expected to produce
tests/layouts/ every module's layout, snapshotted on its own
tests/library.js  whether the real library still builds
scripts/       publishing
```

The split is the point. `app/` is compiled into a `.app` and changes almost
never; `external/` is published to a shared volume and reaches the team on their
next launch with no rebuild. See
[ADR 0001](docs/adr/0001-engine-runs-outside-the-app-bundle.md).

`src/` and `lib/` are siblings because ninety-odd files reach across between them
by relative path. Moving either alone breaks all of them.

## Working on it

```
npm start                  run from source, against external/ in this repo
npm test                   everything
npm run test:invariants    what correct means -- precedence, palettes, brief errors
npm run test:library       whether the real library builds -- every golden brief, every layout
npm run test:snapshots     what the engine currently produces -- golden, layouts
npm run test:golden        just the golden cases
npm run test:layouts       just the module layouts
npm run test:accept        re-record both snapshot suites, then review the diff
npm run publish:external:dry   what publishing would change
npm run publish:external       publish (runs the tests first)
npm run build              package the .app
```

`npm start` always uses this repository's `external/`, never the published copy,
so a dev checkout is never shadowed by whatever is on the volume.

### Three kinds of test, and why a publish stops

The **invariants** say what correct means, written against the decisions rather
than against today's output. A failure is always a defect and there is nothing
to accept. A publish stops dead.

The **library smoke test** builds every golden brief against the real library,
`external/lib/`, and runs every real module's layout. It checks that they build,
not what they produce, so editing a module's copy, colours or structure never
trips it. A module that will not parse or whose layout throws does. Nothing to
accept; a publish stops dead.

The **snapshots** say what the engine currently produces. They build against
`external/lib-test/`, the test library, never `lib/`, so editing the real
library cannot move them. Only an engine change, or a deliberate edit to
`lib-test/`, can, and any difference stops a publish:

```
layout              CHANGED
  moved since the baseline: the engine

  email_json.json -- 6 differences
          6  component/bodycopy.js
```

If the differences are intended, `npm run test:accept` re-records them; review
and commit that separately, so the commit is a record of what the change did to
the output. When an engine change needs a matching library change, make it in
both `lib/` and `lib-test/`. See
[ADR 0011](docs/adr/0011-snapshots-build-against-a-test-library.md).

## Adding or changing a module

A module definition in `external/lib/modules/` says what its defaults are, which
components go in which slot, and what shape it takes. The shape is built from
the constructors in `external/src/main/systems/layout.js` -- `container`, `row`,
`col` and friends, with three presets for the shapes that recur. Start from
`modules/module template.js`, which explains the vocabulary.

A **new** type also needs an entry in `lib/libraries/modules.json`, which is
what turns what a designer types in the brief into a module. Its `valid names`
are the spellings that reach it; its `category` and `name` are the folder and
filename the definition has to sit at, so `"category": "hero"` for `hero trade`
means `modules/hero/hero trade.js` and nothing else. A type with no matching
file silently falls back to `modules/default/default.js`.

Editing a module in `lib/` needs no test changes. `npm run test:library` checks
it still builds and lays out.

`npm run test:layouts` snapshots every module's shape on its own, from the test
library. A new type gets a snapshot only once it is in `lib-test/` too: copy the
definition to the same path under `external/lib-test/modules/`, and its entry
into `external/lib-test/libraries/modules.json`. Defaults, palettes and rules need
a brief, so a new type also wants a sheet in
`tests/golden/briefs/new-modules.js`. That case builds against `lib-test/`, so
without both copies it fails to build ("not a module this builder knows"), or
silently uses the default module if only the `modules.json` entry was copied.

## The two brief templates

Designers have live campaigns written in two different spreadsheets, and the
builder reads both.

| | Shape | Recognised by |
|---|---|---|
| The one the beta was built for | One row per **component**, under a module row | It has a `component` column |
| The one v2.5 was built for | One row per **module**, components spread across columns | It has not |

`external/src/main/processing/brief_format.js` turns the second into the first
as the sheet is read, so nothing downstream knows which one a brief came from.
A column that only the wide template has -- the disclaimer symbol, a button
split across a label and a link, the palette -- is translated there, and that
file is the place to look when a wide brief renders something unexpected.

## Publishing

`npm run publish:external` pushes `external/` to:

```
/Volumes/Chats_Marketing/.../AERS Autobuilder/Universal Builder
```

That is a parallel folder. v2.5 keeps serving the team from its own folder,
untouched, until parity is proven -- the two apps have different bundle
identifiers and coexist.

Publishing is one-directional. Nothing on the volume is ever edited there, so
there is nothing to pull back; the repository is the only source of truth. See
[ADR 0002](docs/adr/0002-the-repository-is-the-only-source-of-truth.md).

## When something goes wrong

**External Files** in the menu bar answers "which copy of the code am I
running?" — where it resolved from, which candidate won, whether the offline copy
is in use, and how to point the app somewhere else. It is a dialog owned by the
bootstrap, not a window, because every window loads its HTML and its preload from
the external tree, and this has to work when that tree is the problem.

The bootstrap keeps a copy of the last external tree that produced a successful
build, in `~/Library/Application Support/Universal Builder/external_cache`. If a
publish is broken, installed apps notice on load and restart against that copy
rather than all failing at once. A bad publish is fixed by fixing the repository
and publishing again; the cache buys the hours in between.

`AB_EXTERNAL=/some/path npm start` points the app somewhere else for one run.

## Where a build's files go

Nothing per-user is written beside the engine — under ADR 0001 that is the shared
volume. The engine takes its configuration as an argument to `buildEmails()`, and
its scratch space is `~/Library/Application Support/Universal Builder/build_state`.
Working files a designer might want (the log, per-sheet email data) go to an
`AERS files` folder beside the brief, as they always have.
