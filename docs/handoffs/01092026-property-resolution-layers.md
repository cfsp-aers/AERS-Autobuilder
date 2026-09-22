# Handoff — property resolution layers

Date: 01/09/2026
Session type: grill-with-docs, no engine code changed

## What this was

A design session over how a module or component ends up with its property values:
`default_properties`, the `modify`/`style`/`modes` rules, brief settings, and the
`or "…"` fallbacks in the `.njk` templates.

Nine decisions were made. They are recorded in
[ADR 0005](../adr/0005-property-resolution-is-layered.md); the vocabulary is in
[CONTEXT.md](../../CONTEXT.md). Nothing has been implemented.

The user deleted `external/lib/html templates table/` during the session — a dead
parallel template set nothing referenced. That is the only change to the tree.

## The one-line summary

Precedence was never stated anywhere; it emerged from the order
`applyModifications` happens to walk its loops. Making it explicit fixes four
confirmed live bugs and one class of silent failure.

## Bugs confirmed during the session

Every one of these was reproduced, not inferred. Baseline at session open was
green: 9 golden + 23 layout + 10 brief-error cases passing.

1. **Every `hero standard` in the library renders wrong.** `style()` ends with an
   unconditional `update` over the same keys its conditionals set, so all six
   golden cases show `palette: white, padding: 0px, hide_transition: true`
   regardless of content. `default_properties` says `palette: "primary"`; no hero
   has ever got it. The `0px 0px 24px 24px` rounded corner never renders.
   **The golden files record this as expected output.**

2. **`mode` and `font_size` routinely disagree on the same record.** A `product
   tile` heading carrying `mode: h1` from the brief stores `mode: h6` and renders
   at 54px. One carrying a module-level `heading: {mode: h3}` stores `h3` and
   renders at h1's 54px. `modes` runs inside the component pass, before the module
   pass, exactly once, so anything that changes `mode` afterwards leaves the sizes
   stale.

3. **`font_size: 60px` from a brief renders on 26px leading**, tagged with the size
   class for 24px. The mode preset stamps over the user's value, the class is
   derived from the stamped value, and `user_settings` is restored afterwards.

4. **Unitless spacing crashes the build.** `padding: 24` or `padding: 0` in a
   settings cell gives `TypeError: updated_spacing.map is not a function`, naming
   no sheet, no module and no cell. `24px` is fine. Two independent places coerce
   bare digits to Number; `formatSpacingToArray` then returns non-strings
   untouched.

5. **`update()` selectors fail silently.** `heading/2:10` and `heading/3:12` match
   zero components (`"2" <= "10"` is a string comparison); `[heading/1,2]` looks
   for a component named `"2"`; `background: null` is read as a component target
   because `typeof null === "object"`, which is why `heading.js:14` has never done
   anything.

6. **`font-style: bold` ships on every button** — invalid CSS, dropped by every
   client, so buttons have no working italic path. `font-weight: 18px` sits beside
   it and never fires.

## Decisions a successor must not silently reverse

1. **Six layers, stated.** component defaults < component rule < module defaults <
   module rule < component user setting < module user setting. A module's opinion
   about its components outranks the component type; the brief outranks both.
2. **Rules read high and write low.** A rule sees fully resolved state but writes
   only its own layer. This is what deletes `icon.js`'s
   `!current.user_settings.depth` guard and every future copy of it.
3. **`modes` is a derivation, not a layer.** It runs after resolution settles, to
   its own fixed point. An explicit `font_size` beats the mode preset *and*
   everything derived from it is recomputed from the explicit value.
4. **`lock` and `locked_settings` are deleted, not moved.** One call site in the
   whole library, and it is a no-op today: `icon.js` locks `depth` to the value it
   would have had anyway, because `depth` is commented out of its
   `default_properties`. The mechanism existed to survive the `overwrite = true`
   restamp being removed.
5. **`_` is a hole, not a lookup.** It keeps whatever resolved so far. This differs
   from today, which fills from `default_properties` — visible only where a rule
   touched the property, which is the case a brief author could never explain. An
   unfilled `_` resolves to `0px` and warns.
6. **Templates may hold only CSS-neutral fallbacks.** `transparent`, `0px`,
   `normal`, `auto`. Not `24px`, not `center`, not `#FFFFFE`, not a hardcoded Adobe
   asset id. Six of the current fallbacks are unreachable and should be deleted
   rather than reconciled.
7. **Grouping is recomputed inside the identity loop.** `setGroupingData` reads
   `name` and `max_siblings`; `modify` changes both. It does not bite today only
   because both re-type rules fire on groups of one.
8. **Phase enforcement is deferred, not rejected.** Nothing stops a `modify` rule
   writing `padding`; for now nothing will.
9. **Provenance is recorded always, stripped before the stores are written.**

## Things that will surprise a successor

- **90 of 102 rule bodies in the library are empty.** The three-pass structure
  serves twelve functions. `modes` is used only by components (`heading`,
  `subheading`, `button`, `lockup`); `style` only by two modules, one of which is
  the broken one.
- **The `overwrite` flag is load-bearing by accident.** Every module passes `true`,
  every component `false` — not as a choice, but because components are processed
  first and a module's opinion about its components has to arrive second *and* with
  overwrite on to win. `hero standard.js` is the proof: it passes `false`, which
  kills all four of its component padding rules, and gets them back only because
  `style()` re-calls `update(current, default_properties)` with overwrite on. Two
  bugs cancelling.
- **Golden files cannot express any of this.** They record output, which is why
  they have defended the `hero standard` bug for as long as it has existed. Two
  cases will need re-accepting deliberately: `hero standard` gains its real palette
  and padding, and the `layout` case's one `_` heading changes from
  `12px 32px 0px 32px` to `12px 0px 4px 0px`.
- **`m.template` still names the module-definition path** in `formatProperties` and
  `applyModifications`, though CONTEXT.md retired that name — it collides with
  `.njk` templates. Renaming it is not part of this work but it will confuse
  whoever reads `applyModifications` next.

## Where the evidence lives

The probe briefs used to reproduce 2, 3 and 4 are in the session scratchpad, not
the repository. They are worth rebuilding as `tests/precedence.js` rather than
recovering — see the plan.
