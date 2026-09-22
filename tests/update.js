/*
    What update() does with a key.

    update() is the single chokepoint every property value passes through --
    every default, every styling rule, every user setting -- so what it does
    with a key decides what precedence means. It spent its life as a closure
    inside applyModifications, unreachable from a test, and so it had never had
    one. Three of its faults had been shipping silently:

      - `heading/2:10` selected nothing, because the range was built by
        comparing two strings and "2" > "1"
      - `[heading/1,2]` looked for a component named "2", because the target
        list was split on commas before the indices were parsed
      - `background: null` was read as a component target, because
        `typeof null == "object"`

    Each is asserted below. They are silent faults: none of them threw, and none
    of them changed a golden file, which is why they survived.

    The fourth was not silent, and is the reason for the layers. update() used
    to assign the property, so the last writer won and the caller had one bit --
    `overwrite` -- to say otherwise. Precedence was therefore call order, and
    call order was boilerplate at the bottom of 34 rule files that had drifted
    apart. It writes onto a layer now, and resolves from the whole stack, so the
    order the layers arrive in does not matter. That is what the second half of
    this file is about.

        node tests/update.js
*/

const path = require("node:path");

const repo_root = path.resolve(__dirname, "..");
const { makeUpdate, LAYERS, layersOf, beginRuleExecution, endRuleExecution, formatIndices, splitTargetList } = require(path.join(repo_root, "external/src/main/processing/update.js"));

const LAYER_NAMES = Object.fromEntries(Object.entries(LAYERS).map(([name, layer]) => [layer, name]));

const results = [];

function check(name, fn) {
    try {
        fn();
        results.push({ name: name, ok: true });
    } catch (error) {
        results.push({ name: name, ok: false, reason: error.message });
    }
}

function is(actual, expected, what) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) throw new Error(`${what || "value"}: expected ${e}, got ${a}`);
}

/** Run something with console.warn captured, and hand back what it said. */
function quietly(fn) {
    const said = [];
    const real = console.warn;
    console.warn = (...args) => said.push(args.join(" "));
    try {
        fn();
    } finally {
        console.warn = real;
    }
    return said.join("\n");
}

// ----------------------------------------------------------------- fixtures

/*
    Twelve headings and three buttons. Twelve because the ranges that broke are
    the ones whose end has two digits: a module with three headings could never
    have shown the fault.
*/
function fixture() {
    const components = [];
    for (let i = 1; i <= 12; i++) components.push({ uuid: `H${i}`, name: "heading", tag: `h${i}`, user_settings: {} });
    for (let i = 1; i <= 3; i++) components.push({ uuid: `B${i}`, name: "button", tag: `b${i}`, user_settings: {} });

    const module_item = { uuid: "M1", name: "product tile", user_settings: {} };
    const write = makeUpdate(() => components);

    /** The tags of every component that came out with `key` set to `value`. */
    const written = (key, value) => components.filter((c) => c[key] === value).map((c) => c.tag);

    // Most of these cases are about which components a target names, not about
    // precedence, so they take a layer only when the layer is the point.
    const update = (target, object, layer) => write(target, object, layer || LAYERS.module_rule);

    return { module: module_item, components: components, update: update, write: write, written: written };
}

// ------------------------------------------------------------ index parsing

check("an index is one-based and comes back zero-based", () => {
    is(formatIndices("1"), [0]);
    is(formatIndices("2"), [1]);
});

check("a list of indices", () => {
    is(formatIndices("1,3"), [0, 2]);
    is(formatIndices("2,4,6"), [1, 3, 5]);
});

check("a single-digit range", () => {
    is(formatIndices("1:3"), [0, 1, 2]);
    is(formatIndices("2:4"), [1, 2, 3]);
});

check("a range whose end has two digits", () => {
    // The fault: `for (let i = "2"; i <= "10"; i++)` compares two strings on the
    // first pass, "2" > "1", and the loop ends before it starts.
    is(formatIndices("2:10"), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    is(formatIndices("3:12"), [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    is(formatIndices("5:20"), [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
});

// ------------------------------------------------------- target list parsing

check("a bare name is one target", () => {
    is(splitTargetList("heading"), ["heading"]);
    is(splitTargetList("heading/2"), ["heading/2"]);
});

check("a bracketed list is several targets", () => {
    is(splitTargetList("[heading, button]"), ["heading", "button"]);
    is(splitTargetList("[heading/1, button/2]"), ["heading/1", "button/2"]);
});

check("a comma inside an index list does not split the target", () => {
    // The fault: split(",") first turned "[heading/1,2]" into a target named
    // "heading/1" and a target named "2".
    is(splitTargetList("[heading/1,2]"), ["heading/1,2"]);
    is(splitTargetList("[heading/1,2, button]"), ["heading/1,2", "button"]);
    is(splitTargetList("[heading/1:3, button/2,4]"), ["heading/1:3", "button/2,4"]);
});

// ------------------------------------------------------------ selecting them

check("a range with a two-digit end selects the components it names", () => {
    const f = fixture();
    f.update(f.module, { "heading/2:10": { colour: "red" } });
    is(f.written("colour", "red"), ["h2", "h3", "h4", "h5", "h6", "h7", "h8", "h9", "h10"]);
});

check("a range past the end of the list selects what exists", () => {
    const f = fixture();
    f.update(f.module, { "heading/5:20": { colour: "red" } });
    is(f.written("colour", "red"), ["h5", "h6", "h7", "h8", "h9", "h10", "h11", "h12"]);
});

check("an index list inside a bracketed target", () => {
    const f = fixture();
    f.update(f.module, { "[heading/1,2]": { colour: "red" } });
    is(f.written("colour", "red"), ["h1", "h2"]);
});

check("a bracketed list of two names", () => {
    const f = fixture();
    f.update(f.module, { "[heading/1, button/2]": { colour: "red" } });
    is(f.written("colour", "red"), ["h1", "b2"]);
});

check("a single-digit range still works", () => {
    const f = fixture();
    f.update(f.module, { "heading/1:3": { colour: "red" } });
    is(f.written("colour", "red"), ["h1", "h2", "h3"]);
});

check("a comma-separated index list still works", () => {
    const f = fixture();
    f.update(f.module, { "heading/1,3": { colour: "red" } });
    is(f.written("colour", "red"), ["h1", "h3"]);
});

check("a bare name selects every component of that name", () => {
    const f = fixture();
    f.update(f.module, { heading: { colour: "red" } });
    is(f.written("colour", "red").length, 12);
});

check("`components` means every component whatever its name", () => {
    const f = fixture();
    f.update(f.module, { components: { colour: "red" } });
    is(f.written("colour", "red").length, 15);
});

check("`components/2` means the second component overall", () => {
    const f = fixture();
    f.update(f.module, { "components/2": { colour: "red" } });
    is(f.written("colour", "red"), ["h2"]);
});

check("a name no component has selects nothing and does not throw", () => {
    const f = fixture();
    f.update(f.module, { footnote: { colour: "red" } });
    is(f.written("colour", "red"), []);
});

// ------------------------------------------------------- the names that reach

/*
    A target key is a component name written by a person, and `modules.json`
    says a component answers to several. The brief's component column has always
    honoured that -- `cta`, `btn` and `button` all build a component called
    `button` -- and the target key did not, so `cta: { background: blue }` in a
    module's settings selected nothing at all and said nothing about it.

    These are written against the library rather than against a hard-coded list,
    so adding an alias to `modules.json` is the whole change.
*/

const component_library = require(path.join(repo_root, "external/lib/libraries/modules.json")).component;

/** Every spelling `modules.json` says reaches a component, as a target key. */
function spellingsOf(canonical) {
    return (component_library[canonical]["valid names"] || []).concat(canonical).map((s) => s.replace(/[ -]/g, "_"));
}

check("every spelling of `button` reaches the buttons", () => {
    spellingsOf("button").forEach((spelling) => {
        const f = fixture();
        f.update(f.module, { [spelling]: { colour: "red" } });
        is(f.written("colour", "red"), ["b1", "b2", "b3"], `target "${spelling}"`);
    });
});

check("every spelling of `heading` reaches the headings", () => {
    spellingsOf("heading").forEach((spelling) => {
        const f = fixture();
        f.update(f.module, { [spelling]: { colour: "red" } });
        is(f.written("colour", "red").length, 12, `target "${spelling}"`);
    });
});

check("`body copy` reaches the body copy", () => {
    // The one that started this: the alias a brief is most likely to write,
    // because `body copy` is what the component column of every brief says.
    const f = fixture();
    f.components.push({ uuid: "T1", name: "bodycopy", tag: "t1", user_settings: {} });
    f.update(f.module, { body_copy: { colour: "red" } });
    is(f.written("colour", "red"), ["t1"]);
});

check("an alias takes an index like any other target", () => {
    const f = fixture();
    f.update(f.module, { "cta/2": { colour: "red" } });
    is(f.written("colour", "red"), ["b2"]);
});

check("aliases work inside a bracketed list", () => {
    const f = fixture();
    f.update(f.module, { "[main_heading/1, cta/2]": { colour: "red" } });
    is(f.written("colour", "red"), ["h1", "b2"]);
});

check("no two components claim the same spelling", () => {
    /*
        A collision would resolve to whichever component the lookup was built
        from last, which is a property of key order in a JSON file -- so this
        fails the day someone adds an alias that is already taken, rather than
        the day a brief quietly targets the wrong component.
    */
    const claimed = {};
    Object.keys(component_library).forEach((canonical) => {
        spellingsOf(canonical).forEach((spelling) => {
            if (claimed[spelling] && claimed[spelling] !== canonical) throw new Error(`"${spelling}" is a valid name of both ${claimed[spelling]} and ${canonical}`);
            claimed[spelling] = canonical;
        });
    });
});

check("`components` is still the wildcard and is not a component", () => {
    // It is in no library, so it has to survive the lookup untranslated.
    const f = fixture();
    f.update(f.module, { components: { colour: "red" } });
    is(f.written("colour", "red").length, 15);
});

// -------------------------------------------------------------- plain values

check("null is a value, not a component target", () => {
    // The fault: `typeof null == "object"`, so `background: null` was read as a
    // target naming components called "background", of which there are none.
    const f = fixture();
    f.update(f.module, { background: null });
    is("background" in f.module, true, "background should have been written");
    is(f.module.background, null);
});

check("an array is a value, not a component target", () => {
    const f = fixture();
    f.update(f.module, { config: ["a", "b"] });
    is(f.module.config, ["a", "b"]);
});

// ------------------------------------------------------------------- layers

check("a write needs a layer", () => {
    // Silently picking one would be picking a precedence, which is the whole
    // question. Outside a rule execution the caller has to say.
    const f = fixture();
    let threw = false;
    try {
        f.write(f.module, { colour: "red" });
    } catch (error) {
        threw = /layer/.test(error.message);
    }
    is(threw, true, "should have thrown");
});

check("the higher layer wins", () => {
    const f = fixture();
    f.write(f.module, { colour: "red" }, LAYERS.component_default);
    f.write(f.module, { colour: "blue" }, LAYERS.module_user);
    is(f.module.colour, "blue");
});

check("the higher layer wins when the lower one is written second", () => {
    /*
        The bug the layers exist for. `article` writes `heading: { mode: "h6" }`
        after the component's own user settings have been applied, and used to
        win purely because it went last.
    */
    const f = fixture();
    f.write(f.module, { colour: "blue" }, LAYERS.module_user);
    f.write(f.module, { colour: "red" }, LAYERS.component_default);
    is(f.module.colour, "blue");
});

check("all six layers, in every order, resolve to the top one", () => {
    const order = [LAYERS.module_user, LAYERS.component_default, LAYERS.module_rule, LAYERS.component_user, LAYERS.module_default, LAYERS.component_rule];
    const f = fixture();
    order.forEach((layer) => f.write(f.module, { colour: `layer ${layer}` }, layer));
    is(f.module.colour, `layer ${LAYERS.module_user}`);
});

check("writing the same layer twice takes the second value", () => {
    // Within one layer there is no precedence to appeal to, so the later write
    // is the one that stands -- and the clobber detector is what says so aloud.
    const f = fixture();
    f.write(f.module, { colour: "red" }, LAYERS.module_rule);
    f.write(f.module, { colour: "green" }, LAYERS.module_rule);
    is(f.module.colour, "green");
});

check("the layer travels down into the components it targets", () => {
    const f = fixture();
    f.write(f.module, { heading: { colour: "red" } }, LAYERS.module_default);
    f.write(f.components[0], { colour: "blue" }, LAYERS.component_user);
    is(f.components[0].colour, "blue", "user setting should beat the module default");
    is(f.components[1].colour, "red", "the heading with no user setting keeps it");
});

check("provenance records the layer and where the write came from", () => {
    const f = fixture();
    f.write(f.module, { colour: "red" }, LAYERS.component_default);
    f.write(f.module, { colour: "blue" }, LAYERS.module_user);

    const stack = layersOf(f.module, "colour");
    is(
        stack.map((entry) => [entry.name, entry.value]),
        [
            ["component_default", "red"],
            ["module_user", "blue"]
        ]
    );
});

check("provenance stays out of the store", () => {
    const f = fixture();
    f.write(f.module, { colour: "red" }, LAYERS.module_rule);
    is(Object.keys(JSON.parse(JSON.stringify(f.module))).includes("__resolution"), false);
});

// ---------------------------------------------------- the layer a rule writes on

/*
    Layers 2 and 4 are the two a rule body lands on, and a rule body names no
    layer: it calls `update(current, {...})` and the caller that invoked it has
    already said which layer that is. So these are the only cases that go
    through the mechanism the library itself uses -- everything above passes a
    layer by hand, which no rule file ever does.

    They are also the only test of layer 2 against layer 4 that can exist right
    now. Not one component rule body in the library writes anything in `style()`
    -- `modes()` in heading.js and subheading.js is the whole of layer 2 today --
    so a brief cannot put the two in conflict, and a fixture rule file would have
    to be shipped inside the library to let it. The conflict is stated here
    instead.
*/

/** Run `write` the way `onePass` runs a rule body: inside a named execution. */
function asRule(layer, write) {
    beginRuleExecution(`fixture ${LAYER_NAMES[layer]}()`, layer);
    try {
        write();
    } finally {
        return endRuleExecution();
    }
}

check("a rule body's write lands on the layer its execution named", () => {
    const f = fixture();
    asRule(LAYERS.component_rule, () => f.write(f.module, { colour: "red" }));
    is(
        layersOf(f.module, "colour").map((entry) => entry.name),
        ["component_rule"]
    );
});

check("a module rule beats a component rule", () => {
    // The order onePass runs them in: components first, so the module rule
    // reads what they left.
    const f = fixture();
    asRule(LAYERS.component_rule, () => f.write(f.module, { colour: "red" }));
    asRule(LAYERS.module_rule, () => f.write(f.module, { colour: "blue" }));
    is(f.module.colour, "blue");
});

check("a module rule beats a component rule whichever ran first", () => {
    const f = fixture();
    asRule(LAYERS.module_rule, () => f.write(f.module, { colour: "blue" }));
    asRule(LAYERS.component_rule, () => f.write(f.module, { colour: "red" }));
    is(f.module.colour, "blue");
});

check("a user setting beats both rule layers", () => {
    const f = fixture();
    f.write(f.module, { colour: "brief" }, LAYERS.component_user);
    asRule(LAYERS.component_rule, () => f.write(f.module, { colour: "red" }));
    asRule(LAYERS.module_rule, () => f.write(f.module, { colour: "blue" }));
    is(f.module.colour, "brief");
});

check("a rule writing into its components writes on its own layer", () => {
    const f = fixture();
    asRule(LAYERS.module_rule, () => f.write(f.module, { heading: { colour: "red" } }));
    is(
        layersOf(f.components[0], "colour").map((entry) => entry.name),
        ["module_rule"],
        "the component-directed key is still the module rule's write"
    );
});

check("the layer does not outlive the rule execution", () => {
    /*
        A write that escapes its rule body -- a callback, a rule calling into
        another module's helper -- would otherwise land silently on whichever
        layer ran last, which is a precedence decision nobody made.
    */
    const f = fixture();
    asRule(LAYERS.component_rule, () => f.write(f.module, { colour: "red" }));

    let threw = false;
    try {
        f.write(f.module, { colour: "blue" });
    } catch (error) {
        threw = /layer/.test(error.message);
    }
    is(threw, true, "a write after endRuleExecution should have thrown");
    is(f.module.colour, "red", "and should not have changed anything");
});

check("an explicit layer wins over the ambient one", () => {
    // How the defaults and user settings get applied: onePass names their layer
    // outright, and none of that runs inside a rule execution.
    const f = fixture();
    asRule(LAYERS.component_rule, () => f.write(f.module, { colour: "red" }, LAYERS.module_user));
    is(
        layersOf(f.module, "colour").map((entry) => entry.name),
        ["module_user"]
    );
});

// ------------------------------------------------------------------ spacing

check("padding is normalised to four sides", () => {
    const f = fixture();
    f.update(f.module, { padding: "12px" });
    is(f.module.padding, "12px 12px 12px 12px");
});

check("a hole in padding is filled from the layer below", () => {
    /*
        It used to be filled from the `default_properties` of whichever rule
        file was doing the writing, which is the wrong entity as soon as a
        module writes padding into a component: the component got the module's
        sides. `_` means what it reads as meaning now.
    */
    const f = fixture();
    f.write(f.module, { padding: "8px 16px 8px 16px" }, LAYERS.module_default);
    f.write(f.module, { padding: "_ _ 24px" }, LAYERS.module_user);
    is(f.module.padding, "8px 16px 24px 16px");
});

check("a hole fills from the resolved value, not from the bottom layer", () => {
    const f = fixture();
    f.write(f.module, { padding: "0px" }, LAYERS.component_default);
    f.write(f.module, { padding: "8px 16px 8px 16px" }, LAYERS.module_default);
    f.write(f.module, { padding: "_ _ 24px _" }, LAYERS.module_user);
    is(f.module.padding, "8px 16px 24px 16px");
});

check("a hole with nothing under it resolves to 0px, and says so", () => {
    const f = fixture();
    const said = quietly(() => f.write(f.module, { padding: "12px _ _ _" }, LAYERS.module_rule));
    is(f.module.padding, "12px 0px 0px 0px");
    is(/no lower layer set padding/.test(said), true, `warning: got ${JSON.stringify(said)}`);
});

check("a partial user setting is filled in place, so the store shows what was used", () => {
    const f = fixture();
    f.write(f.module, { padding: "0px 0px 4px" }, LAYERS.component_default);
    f.module.user_settings.padding = "12px _ _ _";
    f.write(f.module, f.module.user_settings, LAYERS.module_user);
    is(f.module.padding, "12px 0px 4px 0px");
    is(f.module.user_settings.padding, "12px 0px 4px 0px");
});

// ------------------------------------------------------------------- report

console.log(`\nChecking ${results.length} cases\n`);
results.forEach((result) => {
    console.log(`  ${result.ok ? "ok  " : "FAIL"}  ${result.name}`);
    if (!result.ok) console.log(`        ${result.reason}`);
});

const failures = results.filter((result) => !result.ok);
console.log(`\n${"=".repeat(72)}\n${results.length - failures.length}/${results.length} passing`);
process.exit(failures.length ? 1 : 0);
