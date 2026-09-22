# 6. Snapshots record what they were built from

Date: 2026-09-22

## Status

Accepted

## Context

A snapshot in `tests/golden/` or `tests/layouts/` is a function of three inputs:
the brief, the engine (`external/src/`) and the library (`external/lib/` —
module definitions, HTML templates, colour libraries).

[ADR 0003](0003-layouts-are-composed-not-configured.md) added them to prove the
layout refactor preserved behaviour, and for that they were exactly right. The
engine was the thing moving, and any difference in output was the finding.

The library is in the hash too, and editing the library is the daily work of the
product. A module definition holds hardcoded content — the Shop Your Way footer
names six delivery tiles, their images, their links and their copy — so
rearranging those tiles is an ordinary edit that moves three golden cases and one
layout snapshot. The suite reported it identically to a regression, because it
could not tell the difference.

That made the publish gate fire on the common case. The only way past it was
`npm run test:accept`, which re-records everything: a blanket approval covering
whatever else had changed. With a diff of 1192 insertions and 906 deletions
across 40 files, the review it implies cannot actually be performed, so the gate
had become a step that looked like review and was not.

The evidence that this had already failed was in the baselines themselves.
`--accept` writes all five artifacts of a case together, so an accept leaves five
matching timestamps. Instead every case's `email.html` shared one timestamp and
its stores shared an older one — the baselines were being patched file by file to
get a publish out. At that point they record nothing, and the suite asserts
nothing.

Making the gate advisory was considered and rejected: a prompt that always
appears is a prompt that is always dismissed, and the engine would then have no
guard at all. Normalising content out of the comparison — ignoring `src`,
`aem_id`, copy — was also rejected: it would not have caught the tile
rearrangement, which is structural, and it weakens the assertion permanently.

## Decision

Each snapshot records what it was built from, in `expected/inputs.json` beside
the baselines: hashes of the engine tree, the HTML templates, the colour
libraries, the brief, and each module and component definition the case loaded.
The definitions need no listing — every record in the stores carries the path to
its own in `template`, so a case reports its own dependencies.

Each difference is charged to the definition that produced it. A node names its
definition in `template`, or the module it belongs to in `uuid`, and owns
everything beneath it that claims no owner of its own. That reaches the
components a layout embeds inline, which appear in no store, and the grid
wrappers the engine builds around a module, which carry its uuid and no template.

A verdict is then one of two things:

- **drift** — the output moved, and every difference lies inside an input that
  changed. Reported as a count and an attribution, not as the diff. Does not
  fail.
- **changed** — something is unaccounted for. Fails, and prints the diff.

**A library change accounts for a difference. An engine change never does.** The
engine is what these snapshots guard, so output moving underneath it is the alarm
they exist to raise, and it is answered by reading the diff and recording it.

The stores are judged difference by difference. `email.html` is judged whole,
because rendered markup has no structure to attribute through — which is why
`build-case.js` records the stores alongside it.

The gate splits to match. `test:invariants` (`update`, `precedence`, `palette`,
`brief-errors`) states what correct means, is untouched by library edits, and is
never waived. `test:snapshots` states what the engine currently produces and
judges its own drift.

Byte-exactness on the JSON stores is dropped. Key order was the evidence that
ADR 0003's constructors emitted the same nodes the hand-written literals did;
that refactor is finished, and the check now only costs a failed publish. A
difference in key order or whitespace alone is reported and passed.

## Consequences

A definition can be edited and published the same day. The drift report names the
file and the count — `10 differences, footer/shop your way petbarn.js` — which is
reviewable, where the diff it replaces was not.

A regression riding along inside expected drift is now caught. `--accept` never
could: a difference outside the definitions that changed fails on its own, even
when every other difference in the case is accounted for.

Baselines go stale, because drift no longer forces a re-record. This degrades
safely rather than silently: attribution is judged against the recorded inputs,
so a stale baseline simply accumulates more changed definitions, and anything
outside them still fails. `npm run test:strict` treats drift as failure, for
checking the baselines are current before a commit.

Attribution cannot separate an engine change from a library change made in the
same working tree. It does not try — the engine rule means any engine change
fails the whole suite regardless of how cleanly the differences attribute, and
the report names the engine as the reason. That is the conservative direction.

A colour library change accounts for differences anywhere, since a palette value
can surface in any module. That is the coarsest rule here and the one most likely
to want narrowing, if colour resolution ever becomes attributable.

The baselines were re-recorded in full against a clean tree when this landed, as
its own commit, because the hand-patched ones could not be trusted as a starting
point.
