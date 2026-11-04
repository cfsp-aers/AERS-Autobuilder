# Golden-file tests

Real briefs, built against the test library, with their output committed. When
the engine's output changes, these say so.

```
node tests/golden/golden.js                  # check every case
node tests/golden/golden.js --case layout    # check one
node tests/golden/golden.js --accept         # record current output as expected
node tests/golden/golden.js --keep           # leave .work/ behind to inspect
```

npm equivalents: `npm run test:snapshots`, `npm run test:accept`.

## What is compared

Five artifacts per case:

| Artifact | Why |
|---|---|
| `module_store.json` | Modules after all rule passes, before structuring |
| `entity_store.json` | Modules with their components attached |
| `component_store.json` | Components keyed by parent module |
| `email_json.json` | The resolved element tree |
| `email.html` | The rendered email |

Snapshotting the intermediate stores, not only the HTML, is the point. A palette
change shows up as one altered hex value in `module_store.json` rather than as a
wall of re-flowed markup, and the store that first differs tells you which pass
introduced the change.

## What a case builds from

Every case builds against `external/lib-test/`, the test library, and never
reads `external/lib/`. Editing a real module, a palette or `brands.json` cannot
move a case. The only things that can are:

- **the engine**, which is what this suite is here to watch
- **the test library**, edited on purpose in order to move the output
- **the brief**

Whether the real library still builds is checked by `tests/library.js`, the
library smoke test. It builds these same briefs and sheets against `lib/` and
only checks that they succeed. See
[ADR 0011](../../docs/adr/0011-snapshots-build-against-a-test-library.md).

## When a case moves

Any difference is **CHANGED**, and fails. The report says which input moved since
the baseline was recorded (from `expected/inputs.json`), how many differences
fall in each definition, and then the differences themselves:

```
layout              CHANGED
  moved since the baseline: the engine

  email_json.json -- 6 differences
          6  component/bodycopy.js

    [5].children[0]...children[1].colour
      expected: "black"
      actual:   "#123456"
```

If every difference is intended, re-record with `npm run test:accept` and commit
the new expected files and `inputs.json`. That commit is the record of what the
change did to the output.

When an engine change needs a matching library change, make it in `lib-test/` as
well as `lib/`. The snapshots catch the `lib-test/` half if it is forgotten, and
the smoke test catches the `lib/` half.

A difference in key order or whitespace alone is reported and passed. Byte
exactness was the evidence that ADR 0003's constructors emitted the same nodes
the hand-written literals did; that refactor is finished.

## How a case is run

Each case is a folder holding a `REQUIRED_DATA.json` and a copy of its brief.
That file is the fixture format — a readable way to write a case down — not
something the engine reads. `build-case.js` turns it into the configuration
object it passes to `buildEmails()`, which is the same call the app makes, with
`databaseLocation` pointed at the case's scratch directory so a test run leaves
the user's last real build untouched.

Most briefs here are real ones, saved as designers sent them. Two are not, and
are written by scripts beside them, because a committed `.xlsx` cannot be read
in a diff or edited without Excel:

| Brief | Written by | Covers |
|---|---|---|
| `new-modules.xlsx` | `briefs/new-modules.js` | Module types no campaign has used yet |
| `wide-format.xlsx` | `briefs/wide-format.js` | The other brief template — one row per module, components in columns |

Regenerate and re-record either the same way:

```
node tests/golden/briefs/new-modules.js               # rewrite the brief
node tests/golden/golden.js --case new-modules --accept
```

`wide-format` is the only case in the second template. Every other sheet here,
real or generated, gives each component a row; that one gives each module a row
and spreads its components across columns, and `processing/brief_format.js`
translates it. Both templates are in live use, so both need a case.

One child process per case. That used to be forced: `constants.js` read
`REQUIRED_DATA` at require time and every importer destructured it at require
time in turn, so two cases in one process fought over the module cache.
`buildEmails()` taking its configuration as an argument removed that constraint.
It stays for the isolation — the engine holds the module library and rule files
in module-level state, and a case that dies part way through cannot leave that
behind for the next one — and costs about a second.

## Known gaps

- **Cases run sequentially.** Seven cases take a few seconds; not worth solving
  yet, though it is now possible (see above).
- **Nothing covers a brief that is wrong.** Every case here is a brief that
  builds. The errors a user is most likely to hit — an offer alias that is not in
  the Offer Library, a sheet with no header row — are raised by
  `sheet_to_objects` and `setupContent` and are not exercised by anything.
- **Real modules have no snapshot.** What a real module's output looks like
  is not recorded anywhere, only that it builds. That is deliberate (see
  ADR 0011).
