# 2. The repository is the only source of truth

Date: 2026-08-25

## Status

Accepted

## Context

[ADR 0001](0001-engine-runs-outside-the-app-bundle.md) puts the engine and library
on a shared volume. That raises a second question it does not answer: when the
copy on the volume and the copy in the repository disagree, which one is real?

v2.5 answered this differently per folder, and the inconsistency is the root of
the "half in a repo, half local" complaint that started this work:

- `external/main/` — repository authoritative, pushed outward, never pulled.
- `external/rules/` and `external/modules/` — **volume** authoritative. The team
  edited JSON and `.njk` directly on the share, and `publish-external.sh --pull`
  copied their work back down to reseed the repository mirror.

So the direction of truth changed depending on which folder you were standing in,
and nothing in the folder told you which rule applied. Git held a snapshot of
whatever the volume looked like the last time someone remembered to pull.

That arrangement was defensible when the editable surface was inert JSON and
templates. Under ADR 0001 it is not: the library's equivalent of `rules/` is
`lib/modules/**/*.js` — executable JavaScript that imports engine utilities and
runs during a build. Volume-authoritative executable code has no history, no
review, no attribution, and under ADR 0001 a bad file breaks every installed app
at once.

The deciding fact is a practical one: **only one person authors rules today.**
The workflow that volume-authoritative editing existed to protect is not
currently in use.

## Decision

The repository is authoritative for the entire external tree. Publishing is
one-directional: repository → volume.

The shared volume is a distribution target. Nothing is authored there, and
nothing is ever read back from it into the repository. `publish-external.sh
--pull` is removed rather than left unused, so the reverse path cannot be taken
by accident.

## Consequences

The question "which copy is real?" has one answer everywhere, always. Engine and
library changes get history, diffs and attribution for the first time. A bad
publish is recovered by fixing the repository and republishing, with the offline
cache covering the interval.

Removing `--pull` also removes a real hazard: with a bidirectional sync, a push
could silently overwrite a live edit made on the volume, and a pull could silently
overwrite local work. Neither is possible now.

The cost is that hand-editing a file on the share no longer works — it will be
overwritten by the next publish without warning, and there is no mechanism to
notice. If a second author starts contributing rules, the options are to give
them the repository, or to revisit this decision and split the library by risk:
`lib/libraries/*.json` and `lib/html templates/**` are genuinely data and could
safely become volume-authoritative again, while `lib/modules/**/*.js` and
`lib/config/*.js` are code and should not.

Speed is deliberately preserved: a change still reaches the team on their next
launch with no rebuild. It is simply routed through a commit and a publish first.
