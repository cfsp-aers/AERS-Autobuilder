const _ = require("lodash");
const path = require("node:path");
const { load } = require("../utils/load.js");
const { app_dir, user_files } = require("../constants.js");

const { updateSpacing } = load(app_dir, "main/properties/spacing.js");

/*
    `update` is the single chokepoint every property value passes through. Every
    default, every styling rule and every user setting is written by a call to
    it, so what it does with a key decides what precedence means.

    It writes onto a layer, never straight onto the property. The resolved value
    is recomputed from the whole stack after every write, so the order the
    layers happen to be written in stops mattering -- which is the bug this
    replaces. A module's default_properties used to be applied after the
    component's user settings and with `overwrite` defaulting to true, so
    `article`'s `heading: { mode: "h6" }` silently overwrote a brief that had
    asked for `h1`.

    See docs/adr/0005-property-resolution-is-layered.md for what the layers are.
    Tests are in tests/update.js and tests/precedence.js.
*/

// ------------------------------------------------------------------- layers

/** Lowest to highest. The number is the precedence; the name is for reports. */
const LAYERS = {
    component_default: 1,
    component_rule: 2,
    module_default: 3,
    module_rule: 4,
    component_user: 5,
    module_user: 6
};

const LAYER_NAMES = _.invert(LAYERS);

/*
    Where the resolved value came from. Non-enumerable on purpose: the stores
    are written with JSON.stringify and the modules are walked with _.forIn, so
    provenance stays out of both without anyone having to remember to strip it.
*/
const RESOLUTION = "__resolution";

function resolutionOf(target) {
    if (!Object.prototype.hasOwnProperty.call(target, RESOLUTION)) {
        Object.defineProperty(target, RESOLUTION, { value: {}, enumerable: false, writable: true, configurable: true });
    }
    return target[RESOLUTION];
}

/**
    Move an item's layers onto the object that replaces it.

    `updateItems` rebuilds every module from scratch once a loop, and the three
    passes are three separate runs over the same modules. Resolution is the
    state of the item, not of the pass: drop it between passes and `modes`,
    whose rule bodies are almost all empty, resolves every module back down to
    its defaults and throws away what `style` decided.
*/
function carryLayers(from, to) {
    if (Object.prototype.hasOwnProperty.call(from, RESOLUTION)) {
        Object.defineProperty(to, RESOLUTION, { value: from[RESOLUTION], enumerable: false, writable: true, configurable: true });
    }
    return to;
}

/** Every layer written to one property of one item, lowest first. */
function layersOf(target, key) {
    const stack = resolutionOf(target)[key] || {};
    return Object.keys(stack)
        .map(Number)
        .sort((a, b) => a - b)
        .map((layer) => Object.assign({ layer: layer, name: LAYER_NAMES[layer] }, stack[layer]));
}

// ------------------------------------------------- self-clobber detection

/*
    A rule that writes the same property twice in one execution has a dead
    branch. Whatever the conditions above it said, the last write is the one
    that survives, so the earlier one is unreachable and the rule does not do
    what it reads as doing. `hero standard.js` had four of these and every hero
    in the library had been rendering the wrong palette because of it.

    This is not the same thing as a property being written by several layers:
    a default, then a styling rule, then a user setting is precedence working
    correctly. The scope here is deliberately one call of one rule body, which
    is why it is opened and closed around `rules[func]()` and nothing else.

    ADR 0005 records why this detector, rather than "the same rule ran twice".
*/

let active_log = null;
let active_layer = null;

/** Where the write came from: the first stack frame outside this file. */
function callSite() {
    // The default of 10 frames does not reach the rule file when update()
    // recursed into a component: each level costs two frames plus lodash's.
    const previous_limit = Error.stackTraceLimit;
    Error.stackTraceLimit = 40;
    const stack = (new Error().stack || "").split("\n").slice(2);
    Error.stackTraceLimit = previous_limit;

    // _.forIn sits between this file and the rule that called it, and the
    // native `Array.forEach` frames of a recursion into components carry no
    // file at all.
    const frame =
        stack.find((line) => {
            if (line.includes("update.js") || line.includes("node_modules")) return false;
            return /\.js:\d+:\d+\)?\s*$/.test(line);
        }) || "";

    // Module paths contain spaces ("hero standard.js"), so the file part is
    // everything up to the line number that is not a bracket.
    const match = frame.match(/\(?([^()]+\.js):(\d+):\d+\)?\s*$/);
    if (!match) return "unknown";

    const file = match[1].trim().replace(/^at\s+/, "");
    const shown = file.includes("modules/") ? file.slice(file.indexOf("modules/") + "modules/".length) : path.basename(file);
    return `${shown}:${match[2]}`;
}

/**
    Start collecting the writes of one rule body, and say which layer those
    writes land on.

    A rule body calls `update(current, {...})` with no layer of its own. Asking
    every rule author to name their layer would be asking them to get precedence
    right by hand, which is the thing this file exists to stop; the caller that
    invoked the rule is the one that knows, so it says so here.
*/
function beginRuleExecution(label, layer) {
    active_log = { label: label, writes: new Map() };
    active_layer = layer || null;
}

/** Stop collecting, and return the properties that were written twice over. */
function endRuleExecution() {
    const log = active_log;
    active_log = null;
    active_layer = null;
    if (!log) return [];

    const clobbers = [];
    log.writes.forEach((history, id) => {
        if (_.uniqBy(history, (write) => JSON.stringify(write.value)).length > 1) {
            const [target, property] = id.split(" ~ ");
            clobbers.push({ label: log.label, target: target, property: property, writes: history });
        }
    });
    return clobbers;
}

// ------------------------------------------------------------ target parsing

/**
    Turn the index part of a target key into zero-based positions.

    `"2"` -> [1]        the second component of that name
    `"1,3"` -> [0, 2]   a list
    `"1:3"` -> [0, 1, 2] an inclusive range

    Briefs and rules both count from 1, which is why every result is shifted.
*/
function formatIndices(indice_string) {
    let result = [];
    if (indice_string.includes(",")) {
        result = indice_string.split(",");
    } else if (indice_string.includes(":")) {
        // Parsed as numbers: `for (let i = "2"; i <= "10"; i++)` compares two
        // strings on the first pass, and "2" > "1", so `2:10` selected nothing.
        const start = _.toInteger(indice_string.split(":")[0]);
        const end = _.toInteger(indice_string.split(":")[1]);
        for (let i = start; i <= end; i++) {
            result.push(i);
        }
    } else {
        result = [indice_string];
    }
    result = result.map((i) => _.toInteger(i) - 1);
    return result;
}

/**
    Split a target key into the individual targets it names.

    `"heading"`          -> ["heading"]
    `"heading/2"`        -> ["heading/2"]
    `"[heading, button]"`-> ["heading", "button"]
    `"[heading/1,2]"`    -> ["heading/1,2"]

    The last one is why this cannot be a plain `split(",")`: a comma separates
    two targets in a list, but it also separates two indices of one target, and
    the two are only told apart by what follows. A fragment that is nothing but
    digits continues the target before it.
*/
function splitTargetList(key) {
    if (!key.includes("[")) return [key];

    const targets = [];
    _.trim(key, "[ ]")
        .split(",")
        .forEach((raw) => {
            const piece = raw.trim();
            if (/^\d+(:\d+)?$/.test(piece) && targets.length) targets[targets.length - 1] += `,${piece}`;
            else targets.push(piece);
        });
    return targets;
}

/*
    Every spelling of a component, mapped to the one name the store holds.

    `modules.json` gives each component a canonical name and a list of `valid
    names` beside it, and the brief's component column accepts any of them: a
    row saying `cta`, `btn` or `button` all build a component whose `name` is
    `button`. A target key had no such courtesy. It was compared straight
    against `name`, so a module aiming a setting at `cta` aimed it at nothing --
    and at nothing silently, because a target that selects no component is a
    legitimate thing to write. The brief read as correct and rendered as though
    the line were not there.

    That is every alias, not one: `body copy`, `description`, `logo`, `img`,
    `t&cs`, `main heading` and the rest all missed. Only the canonical spelling
    ever worked, and nothing said which one that was.

    The keys are underscored because that is the shape a target arrives in --
    the settings parser turns every space and hyphen in a key into an underscore
    before update() sees it, so `body copy: { colour: yellow }` reaches here as
    `body_copy`. Read once at require time, as setup.js reads the same file.

    Asserted in tests/update.js, including that no two components claim the same
    spelling; a collision here would resolve to whichever `_.forIn` reached last.
*/
const CANONICAL_NAMES = {};
_.forIn(load(user_files, "libraries/modules.json").component, (entry, canonical) => {
    (entry["valid names"] || []).concat(canonical).forEach((spelling) => {
        CANONICAL_NAMES[spelling.replace(/[ -]/g, "_")] = canonical;
    });
});

/** The components a target key selects, out of one module's component list. */
function selectComponents(components, target) {
    const has_index = target.includes("/");
    const named_as = has_index ? target.split("/")[0] : target;
    const i_list = has_index ? formatIndices(target.split("/")[1]) : ["all"];

    // `components` is the wildcard and is in no library, so it falls through
    // unchanged and is matched below.
    const component_name = CANONICAL_NAMES[named_as] || named_as;

    const named = _.filter(components, (c) => c.name == component_name || component_name == "components") || [];

    return named.filter((c, index) => i_list.indexOf(index) >= 0 || i_list[0] == "all");
}

// ------------------------------------------------------------------ spacing

/** A key whose value is four sides, so `_` in it means "leave that side". */
function isSpacingKey(key) {
    return key.includes("padding");
}

/** Something `formatSpacingToArray` can actually take apart. */
function isSpacingValue(value) {
    return _.isString(value) || _.isArray(value) || _.isFinite(value);
}

const unfilled_holes = new Set();

/*
    `_` means "whatever this side already resolved to". It used to be filled
    from the `default_properties` of whichever rule file was doing the writing,
    which is the wrong entity as soon as a module writes padding into one of its
    components: a heading asking for `12px _ _ _` got the module's side padding
    rather than its own. Filling from the resolved value below makes the hole
    mean what it reads as meaning, and needs no `default_properties` at all.
*/
function fillSpacing(raw, below, key, source) {
    if (!isSpacingValue(raw)) return raw;

    const has_hole = _.toString(raw).includes("_");
    if (isSpacingValue(below) || !has_hole) return updateSpacing(isSpacingValue(below) ? below : "0px", raw);

    // A hole with nothing underneath it. `0px` is the only honest answer, but
    // it is far more often a mistake in the rule than an intention.
    const signature = `${source} ${key} ${raw}`;
    if (!unfilled_holes.has(signature)) {
        unfilled_holes.add(signature);
        console.warn(`${source} sets ${key} to "${raw}", but no lower layer set ${key}. The blanks resolve to 0px.`);
    }
    return updateSpacing("0px", raw);
}

// ------------------------------------------------------------------- writing

/**
    Recompute one property from its whole layer stack.

    It walks upwards rather than taking the top entry, because a partial
    spacing value has to see what it is filling from.
*/
function resolve(target, key) {
    let value;
    layersOf(target, key).forEach((entry) => {
        value = isSpacingKey(key) ? fillSpacing(entry.value, value, key, entry.source) : entry.value;
    });
    target[key] = value;
    return value;
}

function record(target, key, layer, value, source) {
    const store = resolutionOf(target);
    store[key] = store[key] || {};
    store[key][layer] = { value: value, source: source };
    return resolve(target, key);
}

/**
    Build the `update` a rule file is handed as `apply.update`.

    @param {(uuid: string) => object[]} components_of  the components of a module
*/
function makeUpdate(components_of) {
    return function update(target_module, object, layer) {
        const at = layer || active_layer;
        if (!at) throw new Error("update() was called with no layer, and outside a rule execution. See LAYERS in processing/update.js.");

        _.forIn(object, (value, key) => {
            if (_.isPlainObject(value)) {
                // An object for a value names components to write into, and
                // recurses. The layer travels down with it: a module's
                // `heading: { mode: "h6" }` is still the module's default.
                splitTargetList(key).forEach((target) => {
                    selectComponents(components_of(target_module.uuid), target).forEach((c) => update(c, value, at));
                });
                return;
            }

            const source = active_log ? callSite() : LAYER_NAMES[at].replace(/_/g, " ");
            record(target_module, key, at, value, source);

            // The brief's own copy of a partial spacing value is filled in too,
            // so that what the store shows is what the module got.
            if (isSpacingKey(key) && object === target_module.user_settings) target_module.user_settings[key] = target_module[key];

            if (active_log) {
                const id = `${target_module.name || target_module.uuid} ~ ${key}`;
                const history = active_log.writes.get(id) || [];
                history.push({ value: target_module[key], site: source });
                active_log.writes.set(id, history);
            }
        });
    };
}

module.exports = {
    makeUpdate: makeUpdate,
    LAYERS: LAYERS,
    layersOf: layersOf,
    carryLayers: carryLayers,
    beginRuleExecution: beginRuleExecution,
    endRuleExecution: endRuleExecution,
    formatIndices: formatIndices,
    splitTargetList: splitTargetList
};
