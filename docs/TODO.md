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

**Review and simplify styling rules**

- Refactor styling rules to ensure precedence order is kept at all times.
- Review how styling rules are written to simplify conditions.
  - Develop a standardised way of writing conditions (and ideally serialised) to minimise javascript knowledge required to author rules

**Review Libraries**

- Review `colour library.json`, `button palettes.json`, `colour palettes/` for ways to consolidate and simplify colour libraries
- Review `modules.json` to see if it can be consolidated with the module template json files or if the two can be refactored.
