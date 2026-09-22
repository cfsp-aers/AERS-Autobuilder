# Property resolution — implementation plan

Delivery plan for [ADR 0005](docs/adr/0005-property-resolution-is-layered.md).
Written 01/09/2026.

## Status

**Done.** Every step except the blocked half of step 4, which is not this plan's
to finish — see below.

`npm test` is green at 122: 9 golden, 23 layout, 46 update, 9 precedence, 20
palette, 15 brief-error. `tests/precedence.js` joined `npm test` when phase 3
landed; it asserts ADR 0005's table on a built brief and passes 9/9.
`tests/palette.js` joined it when `settingsOf()` landed — see `setPalettes`
below. `tests/update.js` grew seven cases when component aliases became
targetable — see *the names that reach a component*, below.

Every phase converges with a loop to spare — identity in 2 rounds of 4, `style`
in 2 loops of 4, `modes` in 2 of 2 — and neither detector says anything on any
of the nine golden cases.

Three things turned up that this plan did not anticipate, recorded against their
steps below. **Step 4 is blocked**, on a premise that does not hold. The **step 8
detector has a false-positive class** worth knowing before anyone reads its
output as a defect list. And **resolution had to survive the per-loop clone**,
which step 12 did not foresee and which is the one place the design needed
changing rather than implementing.

Baseline when the plan was written: `npm test` green — 9 golden, 23 layout, 10
brief-error cases.

## The ordering constraint

ADR 0003 established the rule this plan inherits: do not rewrite until you can
tell whether the rewrite preserved behaviour. But this work is not a
behaviour-preserving refactor. Four of the bugs in the handoff are *recorded as
expected* in the golden files, so a green test run is not evidence of correctness
here — it is evidence the bugs are still present.

So the discipline is inverted from phase 3's. Rather than snapshot first and diff
after, write the assertions that say what *should* happen, watch them fail, and
make them pass. Golden files stay as the regression net for everything not under
discussion, and get re-accepted deliberately at named points.

## Phase 0 — independent fixes ✅

None of these depend on the resolver. Each is small, each has a confirmed defect
behind it, and doing them first shortens the diff that the rewrite has to be read
against.

1. ~~**`font-style: bold` → `normal`** in `components/button-component.njk:42`,
   and delete the `font-weight: 18px` branch on line 41.~~ **Done.** 70 lines
   across all nine cases, every one of them only that flip. `font-weight: 18px`
   never appeared in any golden output, confirming that branch was unreachable.
   *Re-accepted.*

2. ~~**Spacing functions accept numbers as pixels.**~~ **Done.** One clause in
   `spacing.js:6` — `_.isFinite` alongside the string and array tests. Fixed
   there rather than in the brief parser, which should not have to know which
   properties are spacing. Changed nothing that already built.

3. ~~**Add the two crash cases to `tests/brief-errors.js`.**~~ **Done.** Five
   cases, 10 → 15. Verified against the unfixed `spacing.js`: three fail with the
   original `updated_spacing.map is not a function` and the two regression guards
   pass either way.

4. **Template fallbacks — partly done, and the rest is blocked.**

   Deleted, each provably unreachable *and* a design opinion rather than a
   CSS-neutral value: `font_size or "16px"` (twice), `colour or "#000000"`, the
   badge's `inner_padding or "4px"` (twice), and `transition_id`'s hardcoded
   Adobe id. No golden output changed.

   **The premise that fails** is that the component carrying a fallback has
   `default_properties` to move the opinion into. Re-counted on the current 184
   text components rather than the 148 this plan was written against:
   `font_size`, `line_height` and `colour` are indeed never absent — but
   **`font`, `font_weight` and `padding` are absent on 36, 33 and 27 of them.**
   The claim of 0 was wrong for three of the six.

   The 36 are the same 36 every time, and they have no `type`, no `name` and no
   `uuid`. They are hand-written literals emitted by `component({...})` in
   `systems/layout.js` — which is `Object.assign({ entity_type: "component" },
   options)` and nothing else. They never pass through `setBasicProperties`, so
   they never get `default_properties` at all. 65 of the 107 image nodes and 13
   of the 13 `structure` nodes are the same kind of node.

   So every remaining fallback this step names — `border_radius or "24px"`,
   `align or "center"`, `background or "#FFFFFE"`, the button's `3px solid`
   borders — is load-bearing for those literals. Moving the value into
   `default_properties` would duplicate it, not relocate it.

   The real fix is that a layout-declared component should get its defaults from
   somewhere. That is a change to the layout constructors, not to the templates,
   and it is a separate piece of work from this one.

## Phase 1 — extract and test `update()` ✅

`update()` is the single chokepoint every property value passes through and it had
never had a test. It was a closure inside `applyModifications`, so it could not be
reached from one without standing up a database first.

5. ~~**Extract `update` and `formatIndices`** into their own module, exported.~~
   **Done.** `processing/update.js`. `applyModifications.js` went 131 → 73 lines:
   it passes `components_of` and `default_properties` in rather than closing over
   the database. Golden stayed green.

6. ~~**`tests/update.js`** — unit tests, house style, no framework.~~ **Done.**
   24 cases, in `npm test`. Covers the three faults below, and the cases that
   already worked so the rewrite could not quietly lose them: `1:3`, `1,3`,
   `[a, b]`, `components/2`, bare names, `components` meaning all, `lock`,
   `overwrite`, and spacing normalisation.

7. ~~**Fix the three.**~~ **Done**, exactly as specified — indices parsed as
   numbers, the index list parsed before splitting on `,`, and `_.isPlainObject`
   in place of `typeof value == "object"`. Verified by reverting all three
   against the finished test file: **7 of the 24 cases fail without them and the
   other 17 pass either way.** None of the three changed any golden output — they
   were silent faults, which is exactly how they survived.

## Phase 2 — the self-clobber detector ✅

8. ~~**Record every write** inside one rule execution.~~ **Done.**
   `beginRuleExecution` / `endRuleExecution` in `update.js`, opened around
   `rules[func]()` and nothing else. `setupRules` is excluded on purpose:
   defaults-then-user-settings is precedence working, not a clobber. The warning
   names the file and line of every write to the property.

   **Known false positive.** A rule that writes a general target and then a
   narrower one — `[heading, …]: { padding }` at line 51 of `hero standard.js`
   and `components/1: { padding }` at line 60 — is flagged, and that idiom is
   deliberate. One instance in the library today.

9. ~~**Run it.**~~ **Done.** Across all nine golden cases it names exactly one
   file — `hero standard.js` — with four properties: `palette` (lines 51/65/75),
   `padding` (51/54/65/75), the image's `border_radius` (65/75), and the false
   positive above. No other module in the library has one.

   `hide_transition` was predicted and is correctly *not* flagged: both writes set
   `true`, so there is no dead branch, only a redundant write.

10. ~~**Fix `hero standard.js`.**~~ **Done.** Six cases changed, as predicted, and
    the diff is what it should be. Image-only heroes finally get the
    `0px 0px 24px 24px` bottom corners the conditional at line 64 always intended.
    Heroes with content get `palette: primary` — `#FEC326` rather than `#FFFFFF` —
    and the `16px 0px 0px 0px` top padding from their own `default_properties`,
    and their transition graphic is no longer suppressed. *Re-accepted.*

## Phase 3 — the resolver ✅

The substance.

11. ~~**`tests/precedence.js`** — written first, failing.~~ **Done.** 9 cases.
    Written against ADR 0005 rather than against the engine, so it opened at 5/9
    and closed at 9/9 when steps 12–17 landed. It is in `npm test` now.

    It builds four `article` modules — `article` because its
    `default_properties` aim `heading: { mode: "h6" }` at its components, against
    heading.js's own `h2` — and reads what a mode *means* out of heading.js by
    running it, so redesigning the type scale does not fail this test.

    It reproduced ADR 0005's table on live data. ❌ is what the engine did when
    the test was written; everything is ✅ now:

    | case | brief says | `mode` | `font_size` | `line_height` | class |
    |---|---|---|---|---|---|
    | `defaults` | — | h6 ✅ | 24px ✅ | 26px ✅ | medium ✅ |
    | `component-user` | component `mode: h1` | **h6** ❌ | 54px | 56px | x-large |
    | `module-user` | module `h3` + component `h1` | h3 ✅ | **54px** ❌ | 56px | x-large |
    | `explicit-size` | component `font size: 60px` | h6 | 60px ✅ | **26px** ❌ | **medium** ❌ |

    Layer 3 over layer 1, and layer 6 over layer 5, already worked. What failed
    was every case where `modes` ran at the wrong moment: a record whose `mode`
    field and `font_size` field describe different headings, and 60px type set on
    26px leading.

    Layers 2 and 4 are not in conflict in this brief and cannot be. Not one
    component rule body in the library writes anything in `style()` — `modes()`
    in `heading.js` and `subheading.js` is the whole of layer 2 today — so no
    brief can put the two against each other, and a fixture rule would have to
    ship inside the library to let one.

    They are asserted in `tests/update.js` instead, through
    `beginRuleExecution` — the mechanism that assigns those two layers, and the
    one every earlier layer case bypassed by naming its layer outright, which no
    rule file ever does. Seven cases: which layer a rule body's write lands on,
    a module rule over a component rule in both orders, both losing to a user
    setting, a component-directed key staying on the writing rule's layer, an
    explicit layer beating the ambient one, and a write escaping its rule body
    throwing rather than landing on whichever layer ran last. Confirmed
    load-bearing by mutation: swapping the two layer numbers fails exactly the
    two ordering cases and nothing else — including "all six layers, in every
    order", which passes straight through it because it names the layers
    symbolically and never asks which of the two is higher.

12. ~~**Provenance in `update()`.**~~ **Done**, and it is the whole mechanism
    rather than a report on it. A write no longer assigns the property: it
    records `{ value, source }` under its layer on a non-enumerable
    `__resolution`, and the property is recomputed from the stack. Non-enumerable
    means `JSON.stringify` and `_.forIn` skip it, so nothing has to remember to
    strip it — asserted by a test rather than assumed.

    **What this plan missed.** `updateItems` rebuilds every module from a
    `_.cloneDeep` once a loop, and the clone drops a non-enumerable. Resolution
    is the state of the *item*, not of the pass, and the three passes are three
    separate runs over the same modules: drop the layers between them and
    `modes`, whose module rule bodies are almost all empty, resolves every module
    back down to its `default_properties` and throws away what `style` decided.
    Every hero in the library came back wrong until `carryLayers` handed the
    stack across the clone. Worth knowing, because it is invisible in a single
    pass and only appears where one pass writes a key that a later pass does not.

13. ~~**Layers replace the `overwrite` flag.**~~ **Done**, by deleting the call
    sites rather than rewriting them. `setupRules` in all 34 rule files ended
    with the same two lines, and they had drifted: module files wrote their
    defaults with `overwrite` on, component files with it off, `banner.js` passed
    an explicit `true` and `hero standard.js` an explicit `false`. Nobody chose
    that. `setupRules` binds now, and `applyModifications` — which is the only
    thing that knows which layer is which — does the writing.

    A rule body still calls `update(current, {...})` with no layer, because
    asking rule authors to name their own layer is asking them to get precedence
    right by hand. The caller sets it for the duration of the rule, through the
    same `beginRuleExecution` the detector already used. A write with no layer
    and no rule execution throws.

14. ~~**`_` becomes a hole.**~~ **Done.** It fills from the resolved value below
    it, which needs no `default_properties` at all; unfilled resolves to `0px`
    and warns. Changed the `layout` golden case exactly as predicted — one
    heading, `12px 32px 0px 32px` → `12px 0px 4px 0px` — and one more the plan
    did not predict: a hero's heading, `16px 32px 0px 32px` → `16px 32px 8px
    32px`, where the 8px is the hero's own `[heading, …]: { padding: "0px 32px
    8px" }` and the 0px was the hero module's side padding leaking into its
    child. *Re-accepted.*

15. ~~**Delete `lock` and `locked_settings`.**~~ **Done** — the mechanism, the
    call site, the `!current.user_settings.depth` guard, and the
    `...object.locked_settings` spread in `setup.js`. `icon.js` collapsed to what
    the plan said it would. Confirmed redundant: every icon's `depth` is 1 before
    and after.

16. ~~**Identity phase.**~~ **Done.** `applyIdentity` loops grouping and
    `modify` together until no module changes its name, position or `ignore`.
    This was worse than the plan described: `group_size` is not carried across a
    loop by `formatProperties`, so under `setGroupingData`-once-then-`modify`-
    twice, the rule that reads it could only ever fire on the first pass.

17. ~~**`modes` becomes a derivation.**~~ **Done.** The preset now sets
    `font_size` only; leading is derived from whatever `font_size` *resolved* to,
    which is what makes an explicit size drag it along. A size the scale already
    knows keeps the leading it was designed with, so this changed nothing for a
    heading using its mode — no golden case moved.

    The invented ratio is 1.1 rounded up to an even number, in
    `properties/typography.js`, and it fires only for a size no preset produced.
    `tests/precedence.js` reads it back out of the engine rather than pinning it,
    so redesigning the scale changes one file.

    **One deviation from the ADR, deliberately.** The ADR says a derivation is
    not a layer. It is implemented *as* a layer — the rule layer, 2 — because
    that gives exactly the semantics the ADR asks for: a derived value loses to
    anything a human wrote, at either user layer. A separate phase would have to
    re-implement that comparison.

18. ~~**Convergence detector.**~~ **Done.** Each phase snapshots every resolved
    property before and after a loop, stops as soon as nothing moved, and reports
    what is still moving — with the layer and file behind each write — if it runs
    out of loops. Caps went from `2/2/1` to `4/4/2`; nothing needs them, and now
    we can say so rather than assume it.

    It reports only properties that were already set and then changed again. A
    first pass moves every property off nothing, which is not one rule fighting
    another, and reporting it buries the real thing.

## What is deliberately not in this plan

- **Phase-boundary enforcement.** Deferred by decision, not oversight. Nothing
  stops a `modify` rule writing `padding`.
- **Defaults for layout-declared components.** Surfaced by step 4 above. It is
  the reason step 4 cannot finish, and it is its own piece of work.
- **Renaming `m.template`.** ✅ Closed, and decided the other way: the glossary
  moved, not the code. CONTEXT.md had retired the name in favour of *module
  definition*, which would have meant renaming one writer and six reads across
  three engine files — cheap — and then rewriting the property in the persisted
  stores, which is **954 keys across 36 expected files**, every golden case.
  (The figure recorded here before was 319. That was `entity_store` alone;
  `email_json` adds 316, `component_store` 234 and `module_store` 85.)

  The reason for the change of direction is that the collision was never
  two-way. Three things in this system are called templates: the module
  definition file, the `.njk` render templates, and the two Excel brief layouts
  that `brief_format.js` normalises. The engine spells only the first one
  `template` in code; the second is already `lib/html templates/` on disk, and
  the third is only ever discussed in prose. So the cheapest place to put the
  qualifier was never the one the code had to carry. CONTEXT.md now gives the
  bare word to the module template and qualifies the other two as **HTML
  template** and **brief template**.

  Worth saying that the rename would have been safe: `email.html` holds zero
  occurrences, so all nine rendered emails are byte-identical either way. It was
  never risk that argued against it, only that 954 keys of diff buy nothing a
  three-line glossary edit does not.
- **The names that reach a component.** ✅ Found while reading `setPalettes`,
  fixed on its own. `modules.json` gives every component a canonical name and a
  list of `valid names` beside it, and the brief's component column has always
  honoured both: a row saying `cta`, `btn` or `button` builds a component whose
  `name` is `button`. A *target key* had no such courtesy — `selectComponents`
  compared it straight against `name` — so a module aiming a setting at `cta`
  aimed it at nothing.

  It failed silently, which is the worst part. A target that selects no
  component is a legitimate thing to write, so there was nothing to warn about;
  the brief read as correct and rendered as though the line were absent. And it
  was every alias, not one: `body copy`, `description`, `logo`, `img`, `t&cs`,
  `main heading` and the rest all missed, while only the canonical spelling
  worked and nothing said which one that was.

  `selectComponents` now resolves the name through the same table `setup.js`
  uses. Doing it there rather than in the settings parser means every form gets
  it for free — `cta`, `cta/2` and `[main heading/1, cta/2]` all resolve —
  because that function is the one place a target string becomes components.

  **No golden file moved**, and no rule file changed: every target key in the
  library was already canonical. The suite had no coverage of alias targeting at
  all, which is exactly how this survived. `tests/update.js` covers it in seven
  cases, five of which read their spellings out of `modules.json` rather than
  from a list, so adding an alias to the library is the whole change. A sixth
  asserts no two components claim the same spelling — a collision would resolve
  to whichever key `_.forIn` reached last, which is a property of key order in a
  JSON file.

- **`setPalettes`.** Still marked `NEEDS WORK` in `main.js:187`. Examined after
  the plan closed, because it is the one thing still writing properties after
  resolution has settled. It does not go through `update()` at all, so it has no
  layer, no provenance and no clobber detection, and it decided precedence for
  itself by reading each item's own `user_settings`.

  That last part was a live inversion, and is fixed. A module setting aimed at a
  component — `button: { background: blue }` — never lands in the component's
  bag; `update()` delivers it as layer 6, the highest layer there is. Reading
  the bag made it invisible, so it lost to a button palette nobody asked for
  while the same words in the button's own settings won: layer 6 losing to
  layer 5, in one place. `settingsOf()` in `properties/palette.js` now reads the
  layer stack instead, and `tests/palette.js` pins all three shapes of it
  (`background`, `colour`, and the `x/y` palette pair) against a text control
  that always worked. **No golden file moved** — no brief in the suite had ever
  used a module-directed palette setting on a button, which is why nothing
  caught it.

  **The inheritance half is now scoped, and that was a second live bug.**
  `setPalettes` copies palette, background and colour from the module before
  when the two share a name, and that copy was scoped to the name *alone*. A row
  is a run of same-named modules, so the copy did not stop at the row — it ran
  the length of the whole run. Tint one pair of product tiles and every pair
  after it was tinted too, with no way to write "and now stop": only a module of
  another name ended it.

  The `layout` golden case had been recording it as expected. Module `[3]` is a
  `text block` with *no settings at all* and palette `light`, which is white, and
  it rendered on a yellow band — inherited from module `[2]`, which had itself
  taken yellow from the hero above it. The record contradicted itself: palette
  `light`, background `#FEC326`.

  It is scoped to the row now (`row_index > 1 && m.name == prev.name`). Two
  modules side by side sit on one full-width band and cannot disagree about its
  colour — a fact about the layout, not a preference — and a row is exactly the
  set that shares one. The scope was not invented for this: a second block below
  said `if (m.row_index > 1)` and copied the palette again, and could never fire
  on anything the broader copy above had not already taken. It was dead in every
  build. Its condition was the correct one, written by someone who had seen this
  and then shadowed. That block is gone and its condition is what survives.

  `tests/palette.js` pins it from both sides — widen the scope and the two leak
  cases fail, remove it and the row splits down the middle — plus a control that
  the tint reaches its own row at all. **One golden re-accept: `layout`**, one
  module's background and the transition band that derives from it.

  **A palette name where a colour goes.** ✅ Found by ablating the rest of the
  function once the row scope was fixed. `setPalettes` ended with

  ```js
  if (m.depth == 1 && m.user_settings) {
      if (m.user_settings.palette) m.background = m.palette;
      else if (m.user_settings.colour) m.background = m.colour;
  }
  ```

  and the first branch is a category error: it puts a palette's **name** into a
  colour field. `setPalette` has already resolved that palette to its background
  one line earlier, at `item.background ??= ... active_palette.background`, so
  the line overwrote a correct hex with a word — and the word travelled. It came
  out of the build as `background-color: dark`, which no email client renders,
  so the module showed no background at all.

  It hid behind a coincidence in the library. `yellow`, `white` and `black` name
  a palette *and* a colour, so `replaceColours` resolved them at the end of the
  build anyway — and those are the ones the golden briefs use. The palettes that
  are only palettes are exactly the six a brief is told to write:

  | palette | before | after |
  |---|---|---|
  | `primary`, `secondary`, `light`, `neutral`, `dark`, `promo` | `background-color: dark` — dropped by every client | the palette's own background, as hex |
  | `yellow`, `white`, `black`, `red`, `light grey`, `light yellow` | correct, by accident | correct |

  The `colour` branch was right and stays — a colour named on a module is the
  band it sits on — so the fix is one branch, not the block. **No golden
  re-accept**, which is the point: nine cases were green on a bug that broke
  half the documented palette vocabulary.

  `tests/palette.js` now builds a third brief with one module per palette name,
  read out of the brand's palette file rather than listed, so a new palette is
  covered the day it is added. Restore the old line and it names the six.

  **Anchors, and why the suite had none.** Every button case in
  `tests/palette.js` was a comparison — "these two routes must agree" — and a
  comparison is satisfied by both routes reaching nothing. Deleting the branch
  of `setButtonColours` that reads the free-form `green/white` pair left all
  five button cases green: the pair stopped working from the component's bag and
  from the module's at the same moment, so the two went on agreeing, at
  `#000000`, which is neither colour either brief named. Each instruction is now
  also anchored against a `told-nothing` control. ✅

  **Dead writes removed, all four proved dead by construction and by ablation.**
  ✅ No golden file moved.

  | write | why it could not matter |
  |---|---|
  | the second `item.palette = user.palette ? ... : parent.palette` | textually the first one again; `getPalette` between them takes three strings and mutates nothing |
  | `item.background = user.background ? ... : item.background` (component) | the same assignment ran at the top of the function |
  | the same line again on the depth-2 arm | ditto — the arm was an assignment to itself standing in for the absence of a rule |
  | `return { ...button, ...result }` | `setPalettes` calls `setPalette` inside `forEach((c) => { c = setPalette(c, ...) })`, so the return lands on the loop variable |

  That last one retires a standing warning in the file. The comment said the
  spread and the outline/underline branch were in competition and that nothing
  was safe to tidy until someone decided which was meant to win. Neither was,
  and neither could be — the spread was unobservable from anywhere in the
  program. What survives of `result` is the one value the borders read, and it
  is named `matched` after the `match/background` token it resolves.

  **Live but untested, now covered.** Two blocks passed every ablation because
  nothing exercised them — the same shape as `outline`. The free-form
  `green/white` button pair, and a brand in front of a slash
  (`palette: greencross vets/light`) rebranding the button inside it, which is
  worth `#001939` against `#000000`. Both asserted now.

  **What is left, and why the plan's premise for it does not hold.** This entry
  used to say the derivation half is "the same shape as `mode` → `font_size`"
  and so belongs in a derivation pass written through `update()`. It is not the
  same shape, and that matters.

  `mode` → `font_size` composes with layers because it writes a **different
  key**: `mode` is what the brief said, `font_size` is what that means, and both
  can sit in the record at once. Palette derivation narrows the **same key**, in
  place and in stages — `palette` goes `"primary"` → `"black/white"`, and
  `background` goes unset → `"black"` → `"#000000"`, that last step in
  `replaceColours` at the very end of `main.js`. Every one of the sixteen writes
  in `setPalette` overwrites the key it just read.

  A layer stack cannot express that. Resolution recomputes a key from its whole
  stack after every write, so a derived value written onto the same key either
  loses to the brief (and nothing derives) or beats it (and the stack no longer
  records what was asked). This is why `settingsOf()` exists at all: it is a
  hand-rolled stand-in for the precedence the layer system would otherwise
  provide, and it cannot be deleted until the shape changes.

  **The keys are split.** ✅ `palette` is what was asked for; `resolved_palette`
  is what the derivation made of it.

  The move that makes this work is smaller than the plan imagined. It is not
  that palette becomes layer-native — it is that **a key with one writer has no
  precedence question to answer**. `palette` is written by `update()` and by
  nothing else, so it keeps its six layers, its provenance and its clobber
  detection. `resolved_palette` is written by `setPalette` and by nothing else,
  so it needs no layers at all. The conflict the layer system could not express
  stopped being a conflict.

  What moved, across all nine golden cases:

  | | count | what it is |
  |---|---|---|
  | added | 445 `.resolved_palette` | the answer, in its own key |
  | changed | 60 `.palette` | buttons: `"black/white"` → `"primary"`, the question they actually asked |
  | removed | 226 `.palette` | text components no longer carry a palette they never asked for — it was their parent's, and it is in `resolved_palette` now |
  | **`email.html`** | **0** | **not one rendered email changed, in any case** |

  That last row is the whole justification for the re-accept: it is a change to
  what the record *says*, not to what the builder *makes*. `primary` is the
  witness — it is not a button palette at all but a question put to the colour
  palette the button stands on ("whichever button you call primary"), so the two
  keys are guaranteed to disagree and a build that collapsed them could not pass
  both assertions in `tests/palette.js`.

  Four mutations bracket it, each failing exactly one check: derivation writing
  `palette` again, the row copy writing `m.palette` again, the seed dropping its
  `??=` so a row's decision is overwritten, and the two keys collapsed outright.

  **`settingsOf()` does not go, and the plan was wrong to say it would.** That
  was my prediction, and splitting the keys disproved it. It fixed the half of
  the problem `settingsOf()` was covering for — derivation no longer overwrites
  the question — but not the other half. A module aiming
  `button: { palette: green/white }` at its button writes into the *module's*
  bag; `update()` delivers it to the button as layer 6, and the button's own bag
  never sees it. No amount of key hygiene lets a function that reads bags find
  that. Drop `palette` from its key list and `module-user-palette` fails alone.

  What would retire it is the same split applied to `background` and `colour`,
  which are still narrowed in place — a palette's background *name*, then the
  hex `replaceColours` turns it into. That is the genuinely expensive half: those
  two keys are what all 23 template reads read, so it moves every rendered email,
  where splitting `palette` moved none. Not started, and not obviously worth it —
  the case for it is provenance on colour, not correctness, and this session
  found both colour bugs without it.

  Smaller things found while reading it:
  - `match/parent` was written by `component/button.js` on layer 2 and **never
    read by the engine**. ✅ Removed. The behaviour it names is real, but
    `setButtonColours` already does it two lines further on by assigning the
    parent palette's background for exactly the two modes that carried the
    token. Verified inert rather than assumed: all three button modes render
    identically without it, and no golden file moved (`layout` has an
    `underline` button; `outline` is in no golden case, so it was checked
    against a generated brief). It is out rather than in because `button.js` is
    the file other component definitions get copied from, and a token that reads
    as supported travels.
  - `match/background` is resolved for buttons only, so `component/lockup.js`
    writing it in the same two modes resolved to nothing. ✅ Gone, and not by a
    design decision: the `modes()` body was left behind from an earlier version
    of the template and has been deleted. There was no unbuilt intent to finish
    — a lockup has no border to decide, which is why nothing ever read the
    token. `component/lockup.js` now has the same empty `modes() {}` as every
    other component that does not use presets, and `match/background` lives in
    exactly two places: `component/button.js`, which writes it, and
    `setButtonColours`, which resolves it.

## Golden re-accepts, in order

Each deliberate, each its own commit so the diff is reviewable:

| Step | Case(s) | What changes | |
|---|---|---|---|
| 1 | all with a button | `font-style: bold` → `normal` | ✅ done |
| 10 | six with a `hero standard` | real palette, padding, image radius | ✅ done |
| 14–15 | `layout`, `styling`, both `brand` | `_` fills from resolved state; `locked_settings` gone; a button's brief padding stops being discarded | ✅ done |
| — | `layout` | palette inheritance stops at the row, so a bare `text block` renders its own white rather than a hero's yellow | ✅ done |
