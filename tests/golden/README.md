# Golden-file tests

Real briefs, built, with their output committed. When the engine's output
changes, these say so.

```
node tests/golden/golden.js                  # check every case
node tests/golden/golden.js --case layout    # check one
node tests/golden/golden.js --accept         # record current output as expected
node tests/golden/golden.js --keep           # leave .work/ behind to inspect
node tests/golden/golden.js --strict         # treat accounted-for drift as failure
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

## When a case moves

A case's output is a function of the brief, the engine and the library — and
editing the library is the daily work of the product, so output moving is not by
itself a finding. Each case records what it was built from in
`expected/inputs.json`, and every difference is charged to the file that produced
it. That gives two verdicts instead of one.

**drift** — every difference lies inside a library file that changed. This is an
ordinary edit showing up in its own output. Reported as a count and an
attribution, and does not fail:

```
styling             drift
  email_json.json        10 differences
         10  footer/shop your way petbarn.js
  email.html              2 differences
      footer/shop your way petbarn.js changed
```

**CHANGED** — something is unaccounted for: the engine changed, or a difference
landed outside the definitions that did. That is the alarm this suite exists to
raise. It fails and prints the diff.

A library change accounts for a difference; an engine change never does. A
difference outside the definitions that changed fails on its own even when every
other difference in the case is accounted for — which is the thing `--accept`
could never give you, because it approves the case as a whole.

Either way the baselines are behind afterwards. Re-run with `--accept` and commit
the new expected files and `inputs.json` separately; the commit is then a
reviewable record of what your change did to real output. `--strict` fails on
drift too, for checking the baselines are current before committing.

A difference in key order or whitespace alone is reported and passed. Byte
exactness was the evidence that ADR 0003's constructors emitted the same nodes
the hand-written literals did; that refactor is finished. See
[ADR 0006](../../docs/adr/0006-snapshots-record-their-inputs.md).

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
- **A colour library change accounts for a difference anywhere.** A palette value
  can surface in any module, and nothing here can localise it, so editing
  `lib/libraries/` excuses drift across every case at once. It is the coarsest
  rule in the attribution and the one most worth narrowing.
- **Drift does not force a re-record,** so baselines go stale. Attribution is
  judged against the recorded inputs, so this degrades safely — a stale baseline
  accumulates more changed definitions, and anything outside them still fails —
  but `npm run test:strict` is what keeps them current.
