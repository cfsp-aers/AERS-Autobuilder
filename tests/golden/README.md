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

## How a case is run

Each case is a folder holding a `REQUIRED_DATA.json` and a copy of its brief.
That file is the fixture format — a readable way to write a case down — not
something the engine reads. `build-case.js` turns it into the configuration
object it passes to `buildEmails()`, which is the same call the app makes, with
`databaseLocation` pointed at the case's scratch directory so a test run leaves
the user's last real build untouched.

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
