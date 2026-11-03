# TODO

**General To Do**

- [x] Handle rows with `content` but not `component` by either having them match the previous component or by defaulting to `body copy`.
- [x] Ignore dynamic content values that don't have include a `/` (?)
- [ ] Flag text components with leading or trailing line breaks.
- [x] Collapse duplicate headers
- [ ] Open recent projects
- [ ] Open HTML in browser
- [ ] Explore possibility of using Sharepoint link for brief/excel doc

- [ ] Validate user input to prevent mistyped or non-existent properties being applied to items
- [ ] Review palette application logic and determine opportunities to refactor for simplicity
- [ ] Review `.njk` html templates to remove unecessary default fallbacks

**User Interface**

- [ ] Allow user to close "Preview" panel
- [ ] Tidy up / tighten interface

**Review and simplify styling rules**

- Refactor styling rules to ensure precedence order is kept at all times.
- Review how styling rules are written to simplify conditions.
  - Develop a standardised way of writing conditions (and ideally serialised) to minimise javascript knowledge required to author rules

**Review Libraries**

- Review `colour library.json`, `button palettes.json`, `colour palettes/` for ways to consolidate and simplify colour libraries
- Review `modules.json` to see if it can be consolidated with the module template json files or if the two can be refactored.
