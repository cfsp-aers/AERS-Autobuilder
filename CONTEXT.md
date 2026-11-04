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

The module templates, HTML templates, colour libraries, brand data, palettes
and image assets the engine reads. Currently the beta's `lib/`. Welded to the engine —
library files import engine utilities — so the two are published and versioned as
one unit, never separately.

### Dev library

`external/lib-dev/` — experimental **library** files, in the same folder
structure as `lib/`, for one person's local testing. While the *Dev library*
toggle is on, a file there is read in place of the `lib/` file at the same
relative path; everything else still comes from `lib/`. Off on every launch,
offered only when the folder holds a file, and never **published**
([ADR 0009](docs/adr/0009-the-dev-library-overlays-lib-per-file.md)).

Promoting a dev file means copying it into `lib/`. Until then nothing but a
build with the toggle on can see it.

### Test library

`external/lib-test/` — a frozen **library** that belongs to the snapshot tests.
The golden cases and the layout snapshots build against it and never read
`lib/`, so editing the real library cannot move a baseline. The app never reads
it, the **dev library** never overlays it, and it is never **published**
([ADR 0011](docs/adr/0011-snapshots-build-against-a-test-library.md)).

It started as a copy of `lib/` and is expected to drift from it. It is not a
second copy of the product to keep in sync.

### Library smoke test

`tests/library.js` — the check that the real **library** still builds. It builds
every golden brief against `lib/` and runs every real module's **internal
layout**, and asserts only that nothing fails. Unlike the snapshots, it has no
baseline and nothing to accept.

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
engine loads to find the rules for it — the file that ran, not the one the
module's brand would name if every brand had one. See **brand-keyed template**.
Components have them too, under `lib/modules/component/`; `module template.js` and
`component template.js` at the root of `lib/modules/` are blank ones to copy.

Three different things in this system are called templates, and this is the one
that owns the bare word — because it is the one the engine spells that way in
code, and code is the expensive place to be wrong. The other two are always
qualified.

### Brand-keyed template

A **module template** that exists once per brand, named by appending the brand to
the file name — `header/header petbarn.js`. The module types that work this way
are the ones `libraries/modules.json` marks `fragment: true`: `header`, `footer`,
`signoff` and `shop your way`.

Most brands have one for none of them. `brands.json` names ten and the library
holds two sets, so the rest resolve **up**: brand, then **parent brand**, then a
`<name> default.js`, then the blank definition. The Nosh Project has no header of
its own and is built from Petbarn's, in Nosh's colours.

Note: *keyed by brand* is the only sense in which one of these is brand-specific.
The file still has to be told which brand it is rendering for by the record it is
handed, which is why `header petbarn.js` names Petbarn in its nav buttons and
reads nothing from the module's `brand`.

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

### Card

The rounded box in a module's foreground colour, on a `depth: 2` module. By
default the engine wraps the whole internal layout in one; a layout may declare
its own with `card()` instead, and anything outside it sits on the band. On a
`depth: 1` module a declared card has no fill. See ADR 0008.

### Slot

A named place in a module's internal layout — `top`, `bottom`, `left` — that
`component_positions` assigns components to. A slot can also be targeted with
settings, like a component: `bottom: { palette: "red" }`.

### Region

A slot with its own `palette` or `background`. It is drawn as a coloured band
by `region()`, and the components in it resolve their colours against its
palette instead of the module's. See ADR 0008.

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
teammates pick them up on their next build. A change to `main_external.js` or
`ui/` also needs a restart, which the app offers.

### Published version

The `version` in the stamp, `.published.json`, that each **publish** writes
beside the tree it published. A new one for every publish. A tree with no
`version`, either a checkout or one published before stamping, has no published
version, and nothing can match it.

While a publish is running, the stamp says `publishing` and still carries the
previous version.

### Local copy

The copy of the **external tree** that the app keeps on each Mac, in
`userData/external_cache`, together with the **published version** it was taken
from. The app builds from it whenever that version is the one published now,
because a build from the shared volume is far slower. A build after a newer
publish runs from the volume, and when it succeeds it refreshes the copy
([ADR 0010](docs/adr/0010-the-local-copy-runs-whenever-it-matches-the-published-version.md)).

Also called the *offline cache* when it is used because the volume can't be
reached, or because the published tree failed to load. It is the same folder,
used for a different reason. Only the offline case warns the user.

### Resolved state

The single set of property values a module or component ends up with, after every
**layer** has been applied and every **derived property** recomputed. What the
**HTML templates** read.

### Parent brand

The group a **brand** belongs to — Petbarn or Greencross Vets, the two keys of
`Parent Brands` in `libraries/brands.json`. Resolved onto every module and
component beside `brand`, and the second tier of all three brand-keyed lookups in
the engine: a colour, a palette file, and a **brand-keyed template**. A parent
brand is its own parent. See
[ADR 0007](docs/adr/0007-brand-keyed-lookups-cascade-to-the-parent-brand.md).

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

### Asset library

The image files the builder supplies itself, at `lib/libraries/assets/`. Part of
the **library**, and published with it. It holds the transition wobbles — one PNG
per background colour — alongside the brand logos, social icons, Shop Your Way
tiles and placeholders that appear in a module regardless of the campaign.

Distinguished from the campaign's `images/` folder, which holds artwork the
builder neither supplies nor touches, and from the **assets folder**, which is
where copies of these land.

### Assets folder

`assets/`, beside the built `.html` and the campaign's `images/`. Created by
every build, and filled with the **asset library** files that build's email
actually references — so a `src` reading `assets/x.png` is one the builder
supplied, and a `src` reading `images/x.png` is the campaign's own.

A build normally recopies all of them, because the library is authoritative
([ADR 0002](docs/adr/0002-the-repository-is-the-only-source-of-truth.md)).
*Ignore existing assets*, the UI toggle, is the one thing that stops it: with it
on a build copies only the files this folder does not have yet and leaves the
rest exactly as they are. It changes nothing else — the srcs, the **AEM id**s
and the log read the same either way.

Note: a designer's own working folder is often called *Design Assets*, and is
where the **brief** usually sits. It is unrelated to either of the two above,
and nothing reads it.

### AEM id

An asset's identity in Adobe Experience Manager, rendered on an `<img>` as
`data-medialibrary-id`. It is what makes the image an AEM asset rather than a
file at a path, and is independent of the `src` — a build supplies both.

`asset_ids` in `lib/libraries/modules.json` is the one table mapping a filename
to its id, keyed the same way the **asset library** is: by the name a `src` ends
in. `utils/assets.js` reads it at both moments an id is wanted — filling
`content.aem_id` for an image, and answering `transitionId()` for a wobble,
whose filename it derives from the colour.

Note: until 30/09/2026 there were three shapes of this. Seventeen ids were typed
into the five module definitions that draw a preset image, `transition_ids` held
the same kind of id for wobbles but keyed by background colour, and
`image-component.njk` carried two more inline. The first two are now rows of
`asset_ids`; the template still answers for an image the table has no row for,
which is campaign artwork and most of them.

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
