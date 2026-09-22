# 5. Property resolution is layered, and derivation is a separate phase

Date: 2026-09-01

## Status

Accepted

## Context

A module or component's final property values are assembled from six sources: the
component type's `default_properties`, the component's styling rules, the module
type's `default_properties` (including the keys it aims at its components), the
module's styling rules, and user settings written in the brief on a component row
or a module row.

None of that order was expressed anywhere. It emerged from the order
`applyModifications` happens to walk: components before modules, `modify` twice,
`style` twice, `modes` once, with `user_settings` and `locked_settings` re-stamped
after every pass. Precedence was a side effect of loop position, and an
`overwrite` boolean per call site was the only dial.

That produced wrong output in the field, not just untidy code. Probing a
`product tile` whose `default_properties` say `heading: { mode: "h6" }`:

| Brief says | Should be | `mode` stored | rendered `font_size` |
|---|---|---|---|
| component `mode: h1` | h1 / 54px | h6 | 54px |
| module `heading:{mode:h3}` + component `mode:h1` | h3 / 36px | h3 | 54px |
| component `font size: 60px` | 60px + matching leading | h6 | 60px on 26px leading |

The last row renders overlapping text. All three records disagree internally: the
`mode` field and the `font_size` field describe different headings.

The cause is that `modes` — which computes `font_size` and `line_height` from
`mode`, then `text_size_class` from `font_size` — was wired as though it were
another source of values. It runs inside the component pass, before the module
pass, and exactly once. Anything that changes `mode` afterwards leaves the sizes
stale, and anything that sets `font_size` explicitly is stamped over by the mode
preset before the class is computed from the stamped value.

Two more symptoms had the same root. `hero standard.js` ends `style()` with an
unconditional `update` over the same keys its conditionals set, so every hero in
the library renders `palette: white, padding: 0px` regardless of content — and the
golden files record that as expected, because golden files pin what happens rather
than what should. And `lock` — a mechanism for making a rule's write survive the
next pass — exists for exactly one call site, `icon.js`, where it locks `depth` to
the value it would have had anyway.

## Decision

Precedence is stated, not emergent. Six layers, lowest to highest:

1. component `default_properties`
2. component styling rule
3. module `default_properties`, including its component-directed keys
4. module styling rule
5. component user setting
6. module user setting

A styling rule **reads high and writes low**: it sees fully resolved state,
including layers above its own, but its writes land in its own layer. An author
says what the rule wants and never checks whether it is allowed to want it.

Because rule output depends on resolved state which depends on rule output,
resolution iterates until the resolved state stops changing. A sheet that does not
settle within a cap is reported, naming the properties still moving and the rules
writing them.

`modes` is not a layer. It is a derivation, and runs after resolution has settled,
itself to a fixed point because it chains. An explicit value always beats the mode
preset, and everything derived from that value is recomputed from it: a brief
setting `font_size: 60px` gets 60px, a line height computed for 60px, and the size
class for 60px.

`_` marks a slot the writer declines to set, at any layer, filled from the
resolution so far. A `_` that nothing below ever filled resolves to `0px` and
warns.

`lock` and `locked_settings` are removed. Nothing a rule writes may override a
brief.

Two detectors, catching disjoint faults. Within one rule execution, writing the
same key twice with different values warns — this catches `hero standard` on
first run. Across iterations, failure to converge warns.

Both are fed by provenance: every write records the layer it came from and the
file that made it. Provenance is recorded on every build, so the detectors fire on
a designer's machine and not only in CI, and is stripped before the data stores are
written so the stores stay readable and golden diffs stay tight.

Identity resolves before properties do. `modify` decides what a module is (`name`)
and whether it exists (`ignore`), and grouping — which reads `name` and
`max_siblings` to set `row_index` and `group_size` — is recomputed inside that
loop rather than once before it. Grouping and re-typing are mutually dependent:
grouping's inputs are exactly what re-typing changes.

The phase boundary is a convention, not a constraint. Nothing stops a `modify`
rule writing `padding`, and for now nothing will; the people writing rules know
the boundary. Enforcing it is deferred rather than rejected.

## Consequences

`update()` stops carrying `default_properties` in its closure, which is what
removes the wrong-entity bug in `_` resolution rather than patching it: a
component's blanks were being filled from the module's defaults.

Two behaviours change deliberately, and golden files must be re-accepted for both:
every `hero standard` gains its real palette and padding, and `_` fills from
resolved state rather than from `default_properties`. The second is invisible today
in all but one golden case and diverges only where a styling rule touched the
property — which is exactly the case a brief author would find hardest to explain.

`update()` itself has never had a test, and carries three silent faults that the
rewrite must not preserve. A range selector whose bounds compare backwards as
strings matches nothing — `heading/2:10` and `heading/3:12` select zero components
because `"2" <= "10"` is lexicographic, while `heading/1:10` works. A bracket group
splits on `,` before parsing indices, so `[heading/1,2]` looks for a component
named `"2"`. And `typeof null === "object"` routes a null value into the
component-target branch, which is why `background: null` in `heading.js` has never
done anything and why no property can be explicitly cleared.

The risk is the fixed-point loop. Today's `max_loops = 2` has no convergence check
at all, so a non-converging module silently ships whatever the second pass left;
iterating makes that visible rather than introducing it. The cap must be generous
enough for the one legitimate multi-pass case — `modify` rules that re-type a
module, where `product tile` becomes `product banner` and a different definition
file loads on the next iteration.

Golden files cannot express any of this. They record output, so they pinned the
`hero standard` bug as correct for as long as it has existed. The layer order needs
tests that assert which layer won, per property, independent of what the output
happens to look like.
