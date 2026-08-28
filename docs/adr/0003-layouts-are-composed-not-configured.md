# 3. Layouts are composed from node constructors, not selected from presets

Date: 2026-08-25

## Status

Accepted

## Context

The two predecessors sit at opposite ends of one trade-off.

**v2.5 is breadth-cheap and precision-expensive.** Its 33 module types route onto
just 7 generic `.njk` templates — 8 types to `fragment`, 11 to `single column
stack`, 5 to `multi column module`, 4 to `horizontal module`, 4 to `single
component`. A new module type costs a few lines of JSON. Making one module look
*exactly* right means fighting a template shared with ten others.

**The beta is precision-cheap and breadth-expensive.** Every module definition
carries its own hand-written `internal_layout`, so each gets precisely the
structure it wants. A new type costs 100–270 lines of JavaScript, and the
duplication is already visible: `banner.js` and `banner flipped.js` are 111 lines
apiece differing mainly in column order; `product banner.js` and `product banner
reversed.js` likewise; the three footers share a skeleton.

The combined product should be better than both at the thing they are both used
for all day — adding and adjusting module types.

The obvious move is to port v2.5's seven templates as layout presets. Examining
`lib/modules/header/header greencross vets.js` shows why that would fail.
`internal_layout` there does three things a preset cannot express:

1. **Per-node overrides.** `width: "50%"`, `mobile_stack: false`, `padding: "0px
   16px"`, `background: "#001939"` set on individual grid nodes at varying depths.
2. **Branching on resolved module state.** `current.no_nav ? {} : {...}` — the
   layout is a *function of the module*, not a static shape.
3. **Inline literal components.** The Book Now button is declared in full inside
   the layout, not slotted in from the module's content.

A module system that cannot express those is a downgrade, however much
duplication it removes.

## Decision

Layouts are built from small composable node constructors — `container()`,
`row()`, `col()` and component helpers — each taking an options bag and children,
each returning the same plain element-node object the engine already consumes.

Presets exist, and mirror v2.5's seven shapes, but they are **compositions of
those same constructors**, not a separate mechanism. A preset accepts per-slot
option bags. Because presets and constructors emit identical node objects, the
two mix freely at any depth: a hand-built subtree can be dropped inside a preset,
and a preset can be dropped inside a hand-built tree.

`internal_layout` remains a function of `(current, content)`, so branching on
module state and embedding literal components continue to work unchanged.

Presets must never become the only way to express a layout. Per-slot option bags
are mandatory, not optional.

## Consequences

Most module types collapse to a `default_properties` block, a
`component_positions` map, and a one-line layout composition. The genuinely
unusual modules — the Petbarn and Greencross headers and footers — keep
hand-written layouts, which is correct: they *are* bespoke.

Existing duplication is paid down as a side effect rather than as separate
cleanup work.

The risk is a leaky abstraction. If the constructor API is wrong, authors will
route around it with bespoke layouts and the duplication returns with an extra
layer on top. Two mitigations: derive the constructors *from* the 24 existing
module definitions rather than designing them speculatively, and accept up front
that two or three modules will never fit.

This refactor rewrites `internal_layout` across all 24 existing module
definitions. It must not be attempted before golden-file output tests exist,
because the only way to know the rewrite preserved behaviour is to diff the
output.

## Addendum, 2026-08-28

Done, in `external/src/main/systems/layout.js`. The decision above stands; three
things about it were wrong in detail, recorded here rather than edited into the
text above.

There were 19 definitions, not 24 — nine of the files counted are components,
which have no `internal_layout`, and two are scaffolds.

There are three presets, not seven. Only three of v2.5's seven shapes have an
analogue here, and between them they are the whole layout of twelve of the
nineteen modules; the rest of v2.5's seven describe how it grouped whole
modules, which is `structureEDM`'s job in this engine.

The golden tests were not sufficient on their own. They only reach the modules a
golden brief happens to use — twelve of the nineteen — so `tests/layouts/`
snapshots each module's `internal_layout` directly. That test, recorded before
any definition was touched, is what showed the rewrite was byte-identical.

The prediction that held: the two headers and five footers did not fit the
presets, and are still hand-built.
