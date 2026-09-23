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
- Explore creating a property registry to dictate what properties exist and how they are handled throughout processing
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
  - Still to do: `button-component.njk`, which is the larger half and was
    undercounted by the `or "..."` search -- it writes its defaults as
    `{%-if element.x %}...{% else %}<default>{% endif-%}` pairs, hardcoding
    `#FFFFFF`, `16px`, `line-height: 16px`, `border-radius: 0px`, `height: auto`,
    `width: auto`, `mso height: 40px` and `padding: 0px` that way. `button.js`
    declares all but `colour`. Also unswept: `structure.njk`, `container.njk`,
    `gridContainer.njk`, `transition-component.njk` and
    `placeholder-component.njk` -- but those render layout nodes, which come
    from the constructors in `layout.js` and have no rule file to default from.
    A different problem, and the one the property registry would answer.
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
