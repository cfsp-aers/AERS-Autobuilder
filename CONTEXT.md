# Context

Glossary for **Universal Builder** — the single application replacing AERS
Autobuilder v2.5 and the AERS-Autobuilder beta. The two predecessors use several
of the same words for different things; where that is true it is called out
explicitly.

This file is a glossary. It holds no implementation detail and no decisions —
decisions live in `docs/adr/`.

## Settled

### Bootstrap

The only code compiled into the `.app`. It locates the external tree, makes the
`.app`'s dependencies resolvable from it, loads it, and owns the recovery paths
for when that fails. Deliberately small and rarely changed, because it is the one
part that cannot be fixed without a rebuild.

### Engine

The code that turns a brief into rendered email HTML. Currently the beta's
`src/main/`. Distinguished from the **bootstrap**, which only starts it, and from
the **library**, which supplies the content it operates on.

### Library

The module templates, HTML templates, colour libraries, brand data and
palettes the engine reads. Currently the beta's `lib/`. Welded to the engine —
library files import engine utilities — so the two are published and versioned as
one unit, never separately.

### Brief

The Excel workbook a build reads, and by extension one selected sheet within it.
One brief sheet produces one email. The unit of work a user selects in the UI.

### Module

An entity in a brief that becomes one addressable block of the email. Has a type
(`header`, `product tile`, `hero standard`), resolved styling properties, and
zero or more child **components**.

Note: v2.5 used *module* for a flat spreadsheet row with prefixed properties
(`lockup_width`, `modulePaddingTop`) and no children. The combined product uses
the beta's sense throughout — a module owns components.

### Component

A first-class child entity of a module: `heading`, `subheading`, `bodycopy`,
`terms`, `badge`, `image`, `lockup`, `icon`, `button`. Has its own properties,
brand and palette, and inherits from its parent module where unset.

Note: v2.5 had no component entity — components were `.njk` macros, and `button`
and `lockup` were modelled as module *types*. In the combined product they are
components, never modules.

### Module template

The JavaScript file describing one module type — its `default_properties`,
`component_positions`, and `internal_layout`. Lives under `lib/modules/`. Also
called a **module definition** where the emphasis is on what it describes rather
than on which file it is.

A module or component record carries the path to its own in a `template`
property (`template: "header/header petbarn.js"`), and that path is what the
engine loads to find the rules for it. Components have them too, under
`lib/modules/component/`; `module template.js` and `component template.js` at the
root of `lib/modules/` are blank ones to copy.

Three different things in this system are called templates, and this is the one
that owns the bare word — because it is the one the engine spells that way in
code, and code is the expensive place to be wrong. The other two are always
qualified.

### HTML template

An `.njk` file under `lib/html templates/`. Renders a resolved element tree to
HTML. Never means a module template.

### Brief template

One of the two Excel layouts a **brief** can be written in: the beta's, which
gives every component a row, and v2.5's, which gives every module a row and
spreads its components across columns. Both reach the engine, and
`processing/brief_format.js` normalises them to one shape so that nothing
downstream can tell which a brief came from.

Where the two need telling apart, they are the **tall** one and the **wide**
one — which is how `brief_format.js` names them, and short enough to say
repeatedly. Those two are qualification enough on their own; a bare *template*
in prose about briefs is not.

### Internal layout

The nested element tree a module definition produces for its own contents, before
the engine wraps it in the shared block/column/container structure. A function of
the module's resolved state, not a static shape — it may branch on properties and
may embed literal components inline.

### Universal Builder

The single application replacing both predecessors. *Universal* means one app
covering what previously took two — not the macOS universal binary architecture,
which it also happens to build.

### External tree

The published unit: engine, library and renderer assets, versioned and released
together. Lives at `external/` in the repository and is copied to the shared
volume by a publish. Never authored on the volume — see
[ADR 0002](docs/adr/0002-the-repository-is-the-only-source-of-truth.md).

### Publish

Copying the external tree from the repository to the shared volume. Distinct from
a **build**, which produces a new `.app`. Most changes need only a publish;
teammates pick them up on their next launch.

### Resolved state

The single set of property values a module or component ends up with, after every
**layer** has been applied and every **derived property** recomputed. What the
**HTML templates** read.

### Layer

One of the six ordered sources a property value can come from. Lowest to highest:
component **default properties**, component **styling rule**, module default
properties, module styling rule, component **user setting**, module user setting.
A higher layer always wins. See
[ADR 0005](docs/adr/0005-property-resolution-is-layered.md).

### Default properties

The property values a **module definition** declares for its own type, and for the
components it contains. Layers 1 and 3. The floor, not the final word.

### Styling rule

Code in a module definition that computes property values from **resolved state** —
the `modify` and `style` functions. Layers 2 and 4. A rule reads the fully resolved
value of any property but writes only into its own layer, so nothing it writes can
override a **user setting**.

### User setting

A property value written by a brief author, in a row's settings or styling cell.
Layers 5 and 6, the highest. A module's user setting may address its components, and
outranks a setting on the component's own row.

### Derived property

A property computed from other resolved properties rather than set by any **layer** —
`font_size` and `line_height` from a heading's `mode`, `text_size_class` from
`font_size`. Recomputed after resolution settles, never in competition with a layer.

Note: derived properties are produced by a module definition's `modes` function, which
makes them look like a seventh layer. They are not one — a layer is a *source* of
values, a derivation is a *consequence* of them.

### Mode

A named bundle of property values a component type offers as shorthand — `h1`–`h8` on
headings, `outline` and `underline` on buttons. Sets **derived properties**; loses to
any layer that names the same property explicitly.

### Spacing hole

The `_` written in place of one value in a spacing string — `padding: _ _ 24px` changes
the bottom and leaves top, right and left as they resolved. Marks a slot the writer
declines to set, at any layer.

## Open

### Fragment

Unresolved clash.

- v2.5: a brand-specific `.njk` partial (`header_Petbarn.njk`, `footer_Greencross
  Vets.njk`).
- Beta: a boolean property meaning *this module renders standalone and is not
  wrapped in the grid structure* (`structureEDM.js`).

The beta's sense is the one the engine depends on. The v2.5 sense disappears with
its HTML template set, so the collision resolves itself — but the beta's meaning is
poorly served by the word, since it describes wrapping behaviour rather than
being a kind of thing. Candidate replacements: `standalone`, `unwrapped`.
Low urgency; decide before the layout refactor touches `structureEDM`.
