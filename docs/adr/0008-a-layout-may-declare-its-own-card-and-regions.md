# 8. A layout may declare its own card, and regions with their own palette

Date: 2026-10-07

## Status

Accepted

## Context

The `promo tile` design is a white card whose bottom half is a red band of
white text, with its button sitting *below* the card on the module's
background. Three things in the engine stood in the way.

1. **The card was not the layout's to draw.** A `depth: 2` module is wrapped
   whole in a `container.njk` card by `structureEDM`, after `internal_layout`
   has run. Nothing a layout builds can sit outside that card.
2. **Only a container could be coloured and rounded, and containers do not
   nest.** `gridContainer` takes a background but had no `border_radius`;
   `container.njk` has both but cannot go inside another container.
3. **Components took their colours from the module and nothing else.** A text
   component resolves against its parent's palette, and its parent was always
   the module, so there was no way to say "these three components sit on red".

ADR 0003 already lets a layout be hand-composed from constructors. This ADR is
the part of that which was missing: a layout that composes its own *colour
layers*, so most modules keep the simple presets while a few can be bespoke.

## Decision

**`depth` decides how the palette is layered, and nothing else.** `depth: 1` is
one background layer, the band. `depth: 2` is two: the band, and a card in the
module's foreground colour (`m.colour`).

**By default the whole module is the card**, exactly as before. A layout may
instead declare its own card with `card()` in `systems/layout.js`. `structureEDM`
looks for one in the tree `internal_layout` returned; if it finds one, it skips
its own wrapper and gives the declared card what the wrapper would have had --
`m.colour` as background, `m.border_radius`, `m.container_padding` -- for any of
those the `card()` call did not set itself. Anything outside the card sits on
the band.

A card is a single-row, single-column `gridContainer`, not a `container.njk`,
because containers do not nest. `gridContainer` gains an optional
`border_radius`, which renders nothing when unset.

**On a `depth: 1` module a declared card gets no fill.** It is still a
structural wrapper -- radius, padding and anything written in the call apply --
but there is no foreground layer to paint it with. Moving a module between
flat and carded is a change to `depth` alone, never to its layout; a card does
not imply `depth: 2`.

**A slot can carry settings, written like a component target.** A key in
`default_properties` (or a brief's module settings) that names one of the
module's `component_positions` slots -- `bottom: { palette: "red" }` -- targets
that slot. It is recognised only for a module that declares the slot, through
the same `update()` and the same layers as any other target.

- `palette` and `background` belong to the **region**, and are recorded on the
  module under `slots.<name>`. They are not delivered to the components: a
  region's background is not a button's background.
- Every other key is delivered to each component in the slot, as `components`
  would deliver it to all of them.

**A region with a palette is its components' parent.** `setPalettes` resolves
each slot bag as it resolves a module: `background` defaults to the region
palette's background unless one was written. A component in that slot then
resolves its colours against the region rather than the module -- which is why
`palette` need not, and must not, be delivered to it: a text component reads its
palette from its parent by design (see `setPalette`). `replaceColours` already
walks the module recursively, so `slots.<name>.background` arrives in
`internal_layout` as hex. `region()` in `systems/layout.js` builds the coloured
`gridContainer` for a slot from it, and renders nothing for an empty slot.

## Deferred

**Specificity between targets in one layer.** When `components`, a slot, a
component name and `name/index` all set the same key in the same layer, the one
written last in the object wins. A CSS-like order (`components` < slot < name <
`name/index`) was considered and deferred: it does not block this, and key order
is how every other target collision already behaves.

## Consequences

`promo tile` is the first module to use all of it. A module that declares no
card and no slot settings builds exactly what it did before, which the golden
and layout snapshots confirm.

A region's palette reaches its components through `setPalettes` alone. A rule
file reading a component's colours during `modify`/`style` still sees the
module's palette, as it always has: palette derivation runs after the rules.
