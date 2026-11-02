# 10. The local copy runs whenever it matches the published version

Date: 2026-10-27

## Status

Accepted

## Context

[ADR 0001](0001-engine-runs-outside-the-app-bundle.md) runs the engine from the
shared volume and keeps a last-known-good copy of it in `userData` for when the
volume is unreachable or a publish is broken. The copy came last among the
places the bootstrap looked, on the rule that while a real location is
reachable the cache must never win, or published changes would silently stop
taking effect.

Building from the volume turned out to be very slow. Every module definition,
library file, template and `require` is a network round trip, and Node's loader
makes several per `require` as it walks up folders looking for `package.json`.
Headless, the demo brief took 870 s to build from the volume and 0.2 s from the
copy, and loading the engine took 5.9 s against 0.1 s.

The Update AERS button existed to make people pick up a publish. It had stopped
doing anything at all, and returned "Nothing to do."

## Decision

**Each publish carries a version stamp.** `publish-external.sh` extends the
`.published.json` it already wrote with `version` (new on every publish),
`shellHash`, and `state`. The local copy records the stamp it was taken under
in `.cache_info.json`.

**The local copy wins only when it is current.** At launch and before every
build, the bootstrap reads the published stamp. If it equals the copy's, the
build runs from the copy. If the published tree is newer, the build runs from it,
and a successful build refreshes the copy. If the volume can't be reached, the
build runs from the copy, as before. The rule ADR 0001 relied on still holds:
what enforces it now is the version, not the copy's place in a list.

**A tree without a version is never matched.** A checkout, or a tree published
before this change, wins whenever it is reachable, exactly as it did.

**A half-finished publish is never used or copied.** The stamp says
`publishing` while rsync runs. Apps build from their copy meanwhile. A refresh
reads the stamp on both sides of the copy, and abandons it unless both reads
found the same finished publish.

**The engine follows the publish within a session; the shell waits for a
restart.** `src/` and `lib/` are loaded on every build, so a build can run from
whichever tree is current. `main_external.js` and `ui/` are loaded once per
launch, and their IPC handlers cannot be registered twice. When a build runs on
a publish whose `shellHash` differs from the running shell's, the window shows a
non-blocking *Restart to finish updating* notice. It never restarts on its own,
which would close whatever the user had open.

**Stale requires are cleared when the build's tree or version changes.** Engine
and library files require each other directly, and Node caches those by path, so
a copy replaced in place, or a session moving between trees, would otherwise mix
versions.

**The decision is tested, not the bootstrap.** It lives in `app/local_copy.js`,
which has no Electron dependency, with `tests/local-copy.js` in
`test:invariants`. The publish script calls the same file for the shell hash.

**Update AERS is removed.**

## Consequences

Builds run locally almost all the time, and a publish reaches each app on its
next build rather than its next launch. The first build after a publish is still
a volume build.

A forced-cache session, the relaunch after a published tree failed to load,
never switches to the published tree, because it would fail on every build.

The bootstrap changed, so this needed a rebuilt `.app`. Both halves are
compatible across versions: `main_external.js` feature-detects the new bootstrap
functions with `typeof` and builds from its own folder without them, and a new
`.app` treats an unstamped publish as ADR 0001's did. Publish first, then
distribute the `.app`.

A rsync that fails part way leaves the stamp at `publishing`, so every app keeps
building from its copy until the next good publish. An app with no copy yet
builds from the torn tree, as any app did before.

Under the new rule, the offline warning appears only when the volume really
couldn't be reached at launch, not whenever the app starts from the copy.
