# 7. Brand-keyed lookups cascade to the parent brand

Date: 2026-10-01

## Status

Accepted

## Context

`libraries/brands.json` holds two tables. `Brand Names` maps every spelling a
brief might use onto one canonical brand; `Parent Brands` maps each of those onto
the group it belongs to. Ten brands sit under two parents — Petbarn and Greencross
Vets — and `properties/brand.js` resolves both onto every module and component as
`brand` and `parent_brand`.

Three things in the engine are then looked up by brand:

- a colour, in `utils/style utilities.js`
- a palette file, in `properties/palette.js`
- a **module template**, in `systems/formatObjects.js`

The first two already cascaded: brand, then parent brand, then default. The
comment in `getPalette` states the reasoning — *most brands have no palettes file
of their own, so a missing file is the ordinary case and not an error*.

Template resolution did not. `fragment: true` in `libraries/modules.json` marks a
module type that has one definition per brand, and the brand is appended to the
file name: `header/header petbarn.js`. Four types carry it — `header`, `footer`,
`signoff`, `shop your way` — and the library holds definitions for two brands.

So eight of the ten brands asked for a file that is not there. Three places loaded
the file, each guarding with `fs.existsSync` and each falling back on its own to
`default/default.js` — a blank definition: single column, light palette, no logo,
no navigation. A Nosh Project email rendered nothing that identified it as a
Petbarn brand, and nothing anywhere said so. The brief was correct, the build
succeeded, and the output was wrong.

The silence is the part that made it survive. A designer had no way to tell a
module type the library has no definition for from one it does.

Writing a definition per sub-brand was considered and rejected. Eight brands times
four types is 32 files that would be copies of two, and the reason The Nosh Project
has no header is that it does not want a different one — it wants Petbarn's, with
its own colours, which is what the palette and colour cascades already give it.

## Decision

Template resolution cascades, in `properties/template.js`:

1. `<category>/<name> <brand>.js`
2. `<category>/<name> <parent_brand>.js`
3. `<category>/<name> default.js`
4. `<category>/<name>.js`
5. `default/default.js`, or `component/default.js` for a component

Tier 4 is the whole list for a type that is not `fragment`, which is how a
non-brand-keyed module resolves today and stays unchanged. Tier 3 is what
`footer/footer default.js` was written for; it had been in the library since the
beta and had never been loaded, because it needs a brand of `default` and
`setBrand` only ever returns a real one.

**The cascade is one function, and it decides the value of `template` rather than
being applied where the file is loaded.** `template` therefore names the
definition that ran, not the one the brand would name if every brand had one.
That matters beyond tidiness: ADR 0006 charges each snapshot difference to the
file named in `template` and hashes that file to decide whether a change accounts
for it, and it had been hashing paths that did not exist.

The three load sites lose their `existsSync` guards and their separate fallbacks,
because the resolver returns a path that exists.

A fallback is reported, once per sheet, from `main.js` — naming the file used and
the file to add. It is a report and not an error: for a sub-brand it is the
ordinary case, which is exactly why it was invisible.

`setBrand`'s hard-coded default becomes lower case, and `greencross vets` is added
to its own `Parent Brands` list. It was missing, so the parent lookup for a
Greencross Vets module matched nothing and fell through to that default: every
Greencross Vets module in the engine carried `parent_brand: "Petbarn"`, which then
missed the lower-case colour library on the way back out. Harmless while the
parent brand only chose a palette file that the brand's own file shadowed, and
load-bearing the moment it chooses a module definition.

## Consequences

A sub-brand email is built from its parent's structure and its own colours. The
two cascades compose: a Nosh Project header is `header/header petbarn.js` rendered
in `#FFBF3F`, Nosh's yellow, where Petbarn's is `#FEC326`.

Giving a brand its own header is adding one file. Nothing registers it and nothing
needs editing — the tier above the parent's is already being looked for.

No rendered email changed when this landed. The three Greencross cases moved on
`parent_brand`, and the `layout` case moved on `template`, where a component named
`icon` had been recording `component/icon.js` — one of the four names in
`modules.json` with no file — while loading `component/default.js`. Both are the
stores recording what the engine actually did. `email.html` was byte-identical in
all nine cases that had a baseline; `sub-brand` is the tenth and is new.

`signoff` and `shop your way` have Petbarn definitions and no Greencross Vets
ones, so a Greencross Vets brief using either still reaches `default/default.js`.
The cascade cannot invent a design, and the Shop Your Way tiles in the asset
library are Petbarn's artwork. `tests/template.js` names those two in `KNOWN_GAPS`
and asserts that they are the only ones, so closing them is a library decision
that the suite is already watching for.

Resolution is not memoised. `load()` hands out a fresh instance of every engine
file, so a cache would be several caches; worse, the library is edited while the
app runs, and a cache would mean a header added for a brand did not take effect
until the next launch. A build asks about some thousands of items and the common
case is one `existsSync`.
