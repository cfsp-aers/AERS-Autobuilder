# TODO

**General To Do**

- ~~General code cleanup and removal of dead code~~ — done for `external/src/`,
  which is now at a fixed point: no unused export, unreferenced function, unused
  import or write-only variable left in the engine. 280 lines gone, 122/122 still
  passing. Two things were deliberately left, because deleting them loses
  information nothing else records:
  - `structureEDM.js:148` and `:273`, two disabled conditions inside live
    predicates. They say a condition was tried and turned off; turning that into
    prose needs the reason, which is not in the code.
  - ~~The dead `config` key at `formatObjects.js:21`.~~ **Done**, in its own
    commit as planned. It was at `systems/formatObjects.js:20`, and it was the
    only mention of the property in any code -- every other `config` in the
    engine is `build_config` or `user_config`, a different name. 954 keys went,
    exactly as predicted, across 36 expected files: 3848 deletions against 32
    insertions, and all 32 insertions are the engine hash in the two
    `inputs.json` manifests. `email.html` did not move in any of the nine cases,
    which is what says the key was never rendered. Two lines of the design notes
    at `main.js:316` and `:327` still name it; they are aspirational prose about
    a pipeline that was never built, so they were left alone.
  - `external/lib/` is now swept too: the dead `config/` library deleted, 82
    dead imports gone, the stale component template rewritten to match the nine
    real component files, and 23 files' section banners corrected to name the
    file they sit in. 217 lines gone, 122/122 still passing. Three things were
    found and deliberately left, because each is a decision rather than a
    cleanup:
    - ~~`module_at`, `child_at` and `childOf` are wired into all 24 module rule
      files and read by none, and two of the three could not work if they
      were~~ — fixed in `stylingSystem.js`: the key is `child_at` now, not
      `childAt`, and `module_at` returns the module it looks up. All three
      resolve. Still read by no rule file, so no test covers them; they are
      there for the styling-rules refactor.
    - `basic/banner flipped.js` and `footer/footer default.js` are
      unreachable. No `valid names` entry in `modules.json` maps to
      `banner flipped` and nothing renames a module to it; `footer default`
      needs a brand of "default" and `setBrand` always returns a real brand.
      Both read as finished work that was never wired up.
    - `modules.json` names four things with no file: `basic/content block`,
      `default/content banner`, `default/heading` and `component/icon`. Each
      silently falls back to the default rules. Part of **Review Libraries**.
  - Not yet swept: `app/`, `external/ui/` and `external/main_external.js`.
- **Property registry.** What properties exist, and how they are handled
  throughout processing.
  - ~~Step 1: the vocabulary, with a test and no behaviour change.~~ **Done,
    23/09/2026.** `libraries/properties.json` lists all 82 properties -- 73 on
    an entity, 4 inside `content`, 2 in a text segment, 3 in a segment's
    `properties` -- with its kind, value shape, who sets it, which node kinds
    were observed carrying it, and its brief aliases. Nothing reads it yet.
    `tests/properties.js` is what makes it worth having: 11 invariants holding
    the rule files, the templates and the recorded artifacts to it, in both
    directions. Each one confirmed load-bearing by mutation.

    It runs off `tests/golden/expected` and `tests/layouts/expected` rather
    than building anything, so it is the cheapest suite in the repo.

    What writing it turned up, none of it findable without a list to check
    against:
    - `formatObjects.formatProperties` named 42 keys, the component rule files
      31, the templates 39, and the artifacts carried 65. Only 20 were known to
      all four.
    - **`vertical_align` renders for no component, ever.** All nine component
      rule files declare it and 362 of 369 components carry it. The only
      template that reads it is `gridCol.njk`, and no column gets it from a
      component. Same shape as the `text_align`-on-buttons question above, and
      probably the same cause.
    - **`id` and `layout` are read by three templates and set by nothing.**
      `image-component.njk:2`, `text-component.njk:6` and `container.njk:1`
      each render one into a `name` attribute, so 335 elements across the nine
      golden cases ship `name=""`. Deleting the reads is byte-neutral -- the
      attribute is already empty -- but it is a change, so it is recorded here
      rather than made.
    - **`parent_uuid`, `ignore` and `border_colour` are declared by
      `formatObjects` and assigned by nothing.** They are always null and
      `cleanUp()` strips them, which is why they appear in no artifact.
      `ignore` is still read, by `main.njk:200` and `applyModifications`; the
      other two are dead.
    - **`content` is two shapes under one name.** A plain string on a module or
      a text component -- the copy itself -- and an object on an image or a
      button.
    - **`group_padding` is the one spacing property nothing normalises.** Its
      `formatSpacingToString` call is commented out at `formatObjects.js:40`.
  - Step 2: **validate brief settings against it.** `formatUserInput` parses
    any key a designer types and `setup.js:146` spreads it in unfiltered, so
    `paddng: 8px` becomes a real property that nothing reads, with no error and
    nothing in the output to say why the instruction did nothing. Confirmed by
    running it. This is the step with a person on the other end of it.
  - Step 3: **`applies_to` becomes enforced, and structural nodes get
    defaults.** That is what unblocks the nine live fallbacks in the layout
    templates below.
  - Step 4: **`formatObjects` reads the registry** instead of its hand-written
    42-key literal, and the `value` shapes become the coercions.
- Review palette application logic and determine opportunities to refactor for simplicity
- Review `.njk` html templates to determine ways to simplify and ensure styling
  defaults aren't scattered across multiple locations
  - ~~The component templates.~~ **Done, 23/09/2026**, for
    `image-component.njk` and `text-component.njk`. A layout-declared component
    -- the logo in a header, the legal line in a footer -- never went through
    `setBasicProperties`, so it never got `default_properties` and the templates
    were answering for it. `systems/layout.js` fills from the component rule
    files now; the values moved into `image.js`, `bodycopy.js`, `lockup.js`,
    `heading.js`, `subheading.js` and `terms.js`; and 14 fallbacks were deleted
    once they were proven dead. Step 4 of `property-resolution-plan.md` has the
    detail.

    Proven, not assumed: every fallback value in both files was replaced with a
    unique sentinel, all nine cases built, and the rendered HTML searched for
    each. Worth repeating for the remaining templates -- it found a gap reading
    the files could not, and it is the difference between deleting a fallback
    and deleting a fallback you can show nothing reaches.
  - ~~`button-component.njk`.~~ **Done, 23/09/2026.** Fourteen defaults, held
    as `{%-if element.x %}...{% else %}<value>{% endif-%}` pairs rather than as
    `or "..."`, which is why the first sweep missed them. `button.js` gained
    `colour` and `font_style`; the other twelve it already declared. 47 lines to
    27, all nine cases byte-identical, every mso and VML token intact. The
    remaining `{% if %}`s are logic, not defaults, and the file's header says
    which is which.
    - The file must not end in a newline -- it is included once per button, so
      one puts a blank line after every button in the output.
    - `text_align` is set on all 78 buttons, 11 of them `"left"`, and the
      template reads `align` for the outer position and then hardcodes
      `text-align: center` in three inner places. Those 11 render centred. It
      is either a dead property on buttons or a bug; worth deciding, and
      deliberately not decided here because it moves output.
  - **The layout templates, measured but not swept**: `structure.njk`,
    `container.njk`, `gridContainer.njk`, `transition-component.njk` and
    `placeholder-component.njk`. All 14 fallbacks sentinelled, all nine cases
    built, output searched. **Five are dead and can go now**: `background` and
    `padding` twice each in `container.njk`, and `background` in
    `placeholder-component.njk`. Container nodes always carry both, so
    `{{ element.background or element.background or "transparent" }}` on lines
    1 and 5 -- the term is doubled, which is its own small bug -- reduces to
    `{{ element.background }}`.

    **Nine are load-bearing**, and unlike the component templates they cannot
    be moved yet. `gridContainer.njk`'s `background` and `padding` fire 256 and
    258 times; `structure.njk`'s fire 13 times each; `transition`'s 15; and
    `container.njk`'s `border_radius` fires on every one of the 22 containers.
    These nodes have no rule file to default from. The sharpest case is the
    node `structureEDM.js:236` builds --
    `{ name: "structure", structure: "structure", uuid }`, three keys -- which
    takes every styling value it renders with from the template. Step 3 of the
    property registry is what gives them a home.

    `container.njk` is reachable, contrary to what was written here before:
    `external/src/database/email_json.json` is a stale build and has no
    `block: "container"`, but a real build has 22.
  - **Three fallbacks are load-bearing because `component/icon.js` does not
    exist.** `align`, `background` and `max_width` in `image-component.njk`
    fire 7 times, all on `icon` components in the layout case. `modules.json`
    names `component/icon`, the loader finds no file and falls back to
    `component/default.js`, whose `default_properties` is `{}`. This is one of
    the four names-with-no-file already listed under **Review Libraries**, and
    it is what one of them costs.
  - **Two more are load-bearing because `background` defaults to `null`.**
    `element.background or "transparent"` fires 183 times on each of two lines
    in `text-component.njk`. Every text definition declares `background`, but
    declares it `null`, which is falsy. Making it `"transparent"` would feed
    `properties/palette.js` -- which has one `!= "transparent"` test, currently
    reachable only by buttons -- so it wants deciding on its own rather than as
    part of a template sweep.
  - `text-component.njk:4` reads `{{ element.margin or element.padding }}` -- it
    uses margin as the td's padding. The `or "0px"` tail is gone, but the oddity
    is not: where both keys were set the same value used to be applied twice,
    outer and inner, and nine nodes tightened by 16px when `margin` started
    resolving. Still worth a decision on its own.

**Assets**

- ~~The asset library is wired up.~~ **Done, 30/09/2026.** `lib/libraries/assets/`
  held the transition wobbles and nothing copied them anywhere, so a campaign
  either had the right PNG dragged into its `images/` folder by hand or shipped
  with a hole in it. A build now creates `assets/` beside the .html and copies
  in every library file that build's email actually references, pointing those
  srcs at `assets/` instead. `utils/assets.js`; glossary entries in CONTEXT.md.
  - Transitions are named in the data now, not in `transition-component.njk`.
    The wobble was the one image in the email whose filename did not exist until
    rendering, so it could not be looked up; `structureEDM` calls
    `nameTransitions()` on the tree it returns and the template reads
    `element.transition_src`. Byte-neutral: all nine golden cases render
    identically apart from the one real change below.
  - Only nodes with a `block` are named, which is main.njk's own condition for
    drawing a wobble. A module node carries a `transition` as well and never
    draws it — naming those copied a file the email did not ask for, which was
    caught by `demo-greencross` copying an asset its .html never references.
- ~~The library covers almost none of the colours in use.~~ **Filled in,
  30/09/2026**, and the baselines re-accepted against it. 68 files: 44 wobbles,
  plus the brand logos, social icons, Shop Your Way delivery tiles and the
  placeholders -- which reaches the images a module definition declares inline,
  not just transitions. Across the nine golden cases 117 of the 139 srcs now
  come from `assets/`; the 22 left on `images/` are campaign artwork, which is
  the split this is meant to produce. Every file copied is referenced by the
  email that copied it, in all nine cases.
  - ~~Two wobbles are still missing: `001839` and `008C59`.~~ **Resolved
    30/09/2026** by the colour library edit finishing -- neither value appears
    in `colour library.json` any more, so neither wobble is wanted. Coverage is
    now complete in both directions: no golden case logs `NOT IN LIBRARY`, and
    no baseline has a `src="images/wobble-..."` left, so every transition the
    nine cases draw comes from `assets/`.
  - `image-component.njk` still carries
    `{{ element.content.src or "images/banner_placeholder.png" }}`, which is the
    one src in the system that bypasses the copy pass -- it is invented at
    render time, after the walk. The library now holds
    `banner_placeholder.png`, so if that fallback ever fires it points at an
    `images/` file nothing copied. It fires in none of the nine cases, so this
    is latent rather than broken; the fix is the same as for the other
    template defaults, which is to give it a home in `image.js`. Doing that
    would also pick up an AEM id for free, once `banner_placeholder.png` has a
    row -- see below.
- ~~AEM ids are hardcoded in the module definitions.~~ **Done, 30/09/2026.**
  `asset_ids` in `lib/libraries/modules.json` is now the one table mapping a
  filename to its `data-medialibrary-id`, keyed the way the asset library is
  keyed -- by the name a `src` ends in. 53 rows. `utils/assets.js` reads it at
  both moments an id is wanted, in the same walk that copies the files, because
  it is the same lookup on the same key.
  - It replaced three shapes of the same fact. Seventeen urns were typed into
    the five module definitions that draw a preset image, which meant a designer
    adding an asset had to find the right definition and edit JavaScript.
    `transition_ids` held the same kind of id for wobbles, but keyed by
    background colour, so the one image the app supplies most often was the one
    looked up differently from all the rest. `transitionId()` is now the
    colour-keyed door into the filename-keyed table and there is no second
    table.
  - Proven byte-neutral, which was the point of doing it in two steps. Adding
    the table and re-keying `transition_ids` changed nothing at all (9/9 golden
    `match`). Then deleting the seventeen hardcoded urns left every `email.html`
    byte-identical in all nine cases -- so the table reproduces all seventeen
    exactly -- with the only diffs being `aem_id`'s key position in
    `email_json.json` (identical parsed content, the suite's `formatting`
    verdict) and its removal from the five layout snapshots, which is correct:
    an id is no longer a property of a definition.
  - `logo_GreencrossVets_HalfColour.png`'s urn was recovered from git history
    rather than lost. The Greencross footer logo was swapped for
    `GreencrossVets_FooterLogo.png` while this was being written, which would
    have taken the retired file's id with it -- the file is still in the asset
    library, so the row is worth keeping. A sweep of all 674 commits found no
    other filename that has ever carried an urn and does not have a row now.
  - **15 of the 68 library files still have no row**, so they render the generic
    urn from `image-component.njk`. Nine are the newest wobbles (`002E5B`,
    `2E2E2E`, `574545`, `967B4F`, `B3A180`, `C9A562`, `CABAA3`, `EBAB26`,
    `F6F3F0`) and six are named assets (`GXV-WhiteGreenLogo-Horizontal.png`,
    `ImageBanner_Placeholder.png`, `SPECIALS.png`, `lockup_RepeatDelivery.png`,
    and the two placeholders). Every build's log lists the ones that build
    actually used under `NO AEM ID`, so this stays visible without a test.
  - **`banner_placeholder.png` is the one row that can be filled from the
    repository**, and deliberately was not. `image-component.njk` carries
    `urn:aaid:aem:9a3ebc1b-...` behind `{%-if element.content ==
    "banner_placeholder"-%}`, a condition that compares an object to a string
    and so never fires -- which is why the twelve placeholder images in the
    recorded output render the generic urn instead. Adding the row would give
    them the real one. Left out because, unlike the seventeen, that urn has
    never appeared in rendered output, so nothing here confirms it still names
    that asset in AEM; a wrong `data-medialibrary-id` is worse than a generic
    one. One line to add once someone checks AEM, and the dead template branch
    can go with it.

- **`asset_location` is not built.** The other half of the original request: a
  per-campaign folder, named on a brief row, searched before the library so a
  designer can point one module or one email at their own art. The source list
  in `resolveAssets()` is where a second source slots in. Two things to decide
  first, both found while reading for it:
  - It wants a brief *column*, not a Settings key. `setup.js` `correctSpelling()`
    lowercases the whole settings cell, so `- Design Assets` arrives as
    `- design assets` — which macOS's case-insensitive default hides and a
    case-sensitive volume does not. `parseToObject` also splits on `,` and `;`
    and reads `:` as the key separator, so paths containing any of those break.
  - Inheritance should follow `brand` (`main.js:145-162`): a component takes its
    module's value where unset, a module takes the first module's. That gives
    "set it once on the header row, override per module" without a new
    mechanism, and deliberately stays outside ADR 0005's layers, which are for
    values rules compete over.
- Images declared inside a module definition carry a literal
  `src: "images/logo_GreencrossVets_HalfColour.png"` and never pass through
  `formatRichText`. They are covered by the copy pass, since it walks the
  finished tree rather than the brief — but they would not be covered by
  anything that read the brief instead. Worth remembering if `asset_location`
  ever tempts a brief-side implementation.

**Review and simplify styling rules**

- Refactor styling rules to ensure precedence order is kept at all times.
- Review how styling rules are written to simplify conditions.
  - Develop a standardised way of writing conditions (and ideally serialised) to minimise javascript knowledge required to author rules

**Review Libraries**

- Review `colour library.json`, `button palettes.json`, `colour palettes/` for ways to consolidate and simplify colour libraries
- Review `modules.json` to see if it can be consolidated with the module template json files or if the two can be refactored.
