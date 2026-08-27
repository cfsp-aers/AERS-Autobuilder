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

The module definitions, `.njk` templates, colour libraries, brand data and
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

### Module definition

The JavaScript file describing one module type — its `default_properties`,
`component_positions`, and `internal_layout`. Lives under `lib/modules/`.

The beta's code refers to this file path as a module's `template` property
(`template: "header/header petbarn.js"`). That name is retired: it collided with
`.njk` **templates**, which are a different thing entirely.

### Template

An `.njk` file under `lib/html templates/`. Renders a resolved element tree to
HTML. Never used to mean a module definition.

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

## Open

### Fragment

Unresolved clash.

- v2.5: a brand-specific `.njk` partial (`header_Petbarn.njk`, `footer_Greencross
  Vets.njk`).
- Beta: a boolean property meaning *this module renders standalone and is not
  wrapped in the grid structure* (`structureEDM.js`).

The beta's sense is the one the engine depends on. The v2.5 sense disappears with
its template set, so the collision resolves itself — but the beta's meaning is
poorly served by the word, since it describes wrapping behaviour rather than
being a kind of thing. Candidate replacements: `standalone`, `unwrapped`.
Low urgency; decide before the layout refactor touches `structureEDM`.
