# Golden-file tests

Real briefs, built, with their output committed. When the engine's output
changes, these say so.

```
node tests/golden/golden.js                  # check every case
node tests/golden/golden.js --case layout    # check one
node tests/golden/golden.js --accept         # record current output as expected
node tests/golden/golden.js --keep           # leave .work/ behind to inspect
```

npm equivalents: `npm test`, `npm run test:accept`.

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

## When a case fails

A failure means output changed. Usually that is the change you just made. Read
the diff; if it is what you intended, re-run with `--accept` and commit the new
expected files. The commit is then a reviewable record of what your change did
to real output.

If it is *not* what you intended, you have caught a regression.

## Why a child process per case

`constants.js` resolves `REQUIRED_DATA` at require time and around 44 files
destructure it at require time in turn. Two cases in one process would fight
over the module cache. A fresh process per case sidesteps the question entirely
and costs about a second.

The child sets `AB_REQUIRED_DATA_PATH` so a test run never overwrites the
`REQUIRED_DATA.json` left behind by the user's last real build.

## Known gaps

- **`src/database/` is still written on every run.** The four stores are written
  to a path hard-coded in `constants.js`, so a test run overwrites the artifacts
  from your last real build. Nothing reads them back, so this is untidy rather
  than unsafe. It goes away with `configure()`.
- **Cases run sequentially** for the same reason. Seven cases take a few
  seconds; not worth solving yet.
- **`GXV Brand Testing` is not covered.** That sheet uses `offerDetails`, and
  `beta-testing.xlsx` is an older brief template whose Offer Library has one
  header row where the current template has two. `setup.js` deletes a fixed two
  rows, so the first offer is consumed as the header, every alias lookup misses,
  and the build dies with `Cannot read properties of undefined (reading
  'offerAlias')`. Greencross is covered by `demo-greencross` instead. The
  underlying fragility — a fixed row count where the header should be located by
  its contents — is worth fixing, but after these tests exist, not before.
