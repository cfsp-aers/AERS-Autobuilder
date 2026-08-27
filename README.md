# Universal Builder

Builds Petbarn and Greencross Vets emails from a campaign brief spreadsheet.

One application replacing **AERS Autobuilder v2.5** and the **AERS-Autobuilder
beta**: the beta's engine wearing v2.5's shell. See
[combination-plan.md](combination-plan.md) for how the two were merged and what
is left to do, [CONTEXT.md](CONTEXT.md) for the language, and
[docs/adr/](docs/adr/) for the decisions that were hard to reverse.

## Layout

```
app/          the .app -- a bootstrap and nothing else
external/     everything that does anything
  src/          the build engine
  lib/          module definitions, templates, palettes
  ui/           the renderer
tests/golden/ real briefs and the output they are expected to produce
scripts/      publishing
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
npm test                   check the engine still builds what it should
npm run test:accept        record current output as expected, then review the diff
npm run publish:external:dry   what publishing would change
npm run publish:external       publish (runs the tests first, and refuses on a diff)
npm run build              package the .app
```

`npm start` always uses this repository's `external/`, never the published copy,
so a dev checkout is never shadowed by whatever is on the volume.

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

The bootstrap keeps a copy of the last external tree that produced a successful
build, in `~/Library/Application Support/Universal Builder/external_cache`. If a
publish is broken, installed apps notice on load and restart against that copy
rather than all failing at once. A bad publish is fixed by fixing the repository
and publishing again; the cache buys the hours in between.

`AB_EXTERNAL=/some/path npm start` points the app somewhere else for one run.
