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
- Review `.njk` html templates to determine ways to simplify and ensure styling defaults aren't scattered across multiple locations

**Review and simplify styling rules**

- Refactor styling rules to ensure precedence order is kept at all times.
- Review how styling rules are written to simplify conditions.
  - Develop a standardised way of writing conditions (and ideally serialised) to minimise javascript knowledge required to author rules

**Review Libraries**

- Review `colour library.json`, `button palettes.json`, `colour palettes/` for ways to consolidate and simplify colour libraries
- Review `modules.json` to see if it can be consolidated with the module template json files or if the two can be refactored.
