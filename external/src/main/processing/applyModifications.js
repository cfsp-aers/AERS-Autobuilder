const _ = require("lodash");
const fs = require("fs");
const path = require("node:path");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir, user_files } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const util = load(app_dir, "main/utils/style utilities.js");

const { formatProperties } = load(app_dir, "main/systems/formatObjects.js");

const { setGroupingData } = load(app_dir, "main/systems/groupingSystem.js");
const { moduleTargets, componentTargets } = load(app_dir, "main/systems/stylingSystem.js");
const { makeUpdate, LAYERS, layersOf, carryLayers, beginRuleExecution, endRuleExecution } = load(app_dir, "main/processing/update.js");

/*
    Apply every layer of ADR 0005 to every module, until nothing moves.

    The order inside a pass is "read high, write low": every layer a rule might
    want to read is already on the item by the time the rule runs, and the rule
    writes only its own layer. The two are separable now because `update`
    records the layer rather than assigning the property, so a default written
    after a user setting no longer overwrites it -- which is what it used to do,
    and is why `article`'s `heading: { mode: "h6" }` beat a brief asking for
    `h1`, and why a button whose brief asked for `32px 6px` rendered `12px 16px`.

    Which layer a value lands on is decided here rather than in the rule files.
    It used to be two lines of boilerplate at the bottom of all 34 of them,
    which is how the module files came to write their defaults with `overwrite`
    on and the component files with it off. Nobody chose that; it was a copy
    that drifted, and every module in the library inherited the drift.
*/
function applyModifications(db, func, max_loops) {
    let loops = 0;
    let before = snapshot(db);

    while (loops < max_loops) {
        onePass(db, func);
        loops += 1;

        const after = snapshot(db);
        const moving = moved(before, after);
        if (!moving.length) break;
        before = after;

        if (loops >= max_loops) reportUnsettled(db, func, max_loops, moving);
    }
    aers.log(`${func} settled in ${loops} loops`);
}

/** One visit to every module, applying every layer once. */
function onePass(db, func) {
    db.ms.forEach((m, i) => {
        m.user_settings ??= {};

        let rules = load(user_files, `modules/default/default.js`);
        if (fs.existsSync(path.resolve(path.join(user_files, `modules/${m.template}`)))) rules = load(user_files, `modules/${m.template}`);

        const module_targets = moduleTargets(db, i);

        // update() reaches the components of whichever module it is writing
        // to; it no longer needs the database itself.
        const components_of = (uuid) => db.cs[uuid];
        const sf = { update: makeUpdate(components_of) };

        const components = (db.cs[m.uuid] || []).map((c, c_i) => {
            let component_rules = load(user_files, `modules/component/default.js`);
            if (fs.existsSync(path.resolve(path.join(user_files, `modules/${c.template}`)))) component_rules = load(user_files, `modules/${c.template}`);
            return { c: c, targets: componentTargets(db, c_i, m), rules: component_rules, sf: { update: makeUpdate(components_of) } };
        });

        // Layers 1 and 5 -- what the component says about itself.
        components.forEach((entry) => {
            if (entry.rules.setupRules) entry.rules.setupRules(entry.targets, entry.sf);
            entry.sf.update(entry.c, entry.rules.default_properties, LAYERS.component_default);
            entry.sf.update(entry.c, entry.c.user_settings, LAYERS.component_user);
        });

        // Layers 3 and 6 -- what the module says, including the keys it aims
        // at its own components.
        if (rules.setupRules) rules.setupRules(module_targets, sf);
        sf.update(m, rules.default_properties, LAYERS.module_default);
        sf.update(m, m.user_settings, LAYERS.module_user);

        // Layer 2 -- component rules, reading everything above.
        components.forEach((entry) => {
            if (entry.rules.setupRules) entry.rules.setupRules(entry.targets, entry.sf);
            beginRuleExecution(`${entry.c.template} ${func}()`, LAYERS.component_rule);
            entry.rules[func](m);
            reportClobbers(endRuleExecution());
        });

        // Layer 4 -- module rules.
        if (rules.setupRules) rules.setupRules(module_targets, sf);
        beginRuleExecution(`${m.template} ${func}()`, LAYERS.module_rule);
        rules[func](db.cs);
        reportClobbers(endRuleExecution());

        rules = null;
    });
    db.ms = updateItems(db.ms);
}

/*
    What a module is, before what it looks like.

    `modify` can rename a module -- an `icon` on its own becomes an `icon block`
    -- and the new name changes which rule file it loads, which
    `default_properties` it has, and how many siblings it groups with. So
    grouping and `modify` are not two steps but one loop, and it has to settle
    before any property is worth resolving.

    It used to be `setGroupingData` once and then `modify` twice, which meant
    the second `modify` ran against grouping computed for the names the first
    one had already changed.
*/
function applyIdentity(db, max_loops) {
    let loops = 0;
    let before = identity(db);

    while (loops < max_loops) {
        setGroupingData(db.ms);
        onePass(db, "modify");
        loops += 1;

        const after = identity(db);
        if (_.isEqual(before, after)) break;
        before = after;

        if (loops >= max_loops) {
            console.warn(`Module names had not settled after ${max_loops} rounds of grouping and modify().\n` + `    A modify() rule is renaming a module into a name whose own rules rename it back.\n` + `    ${after.join("\n    ")}`);
        }
    }
    aers.log(`identity settled in ${loops} rounds`);
}

// -------------------------------------------------------------- convergence

/*
    `max_loops` was a number with no check behind it: two passes, and whatever
    the second one left was the answer. A rule pair that never agrees looked
    exactly like a rule pair that agreed on the first pass. This says which it
    was, and stops as soon as it can.
*/

/** Every resolved property of every module and component, keyed by uuid. */
function snapshot(db) {
    const state = {};
    const add = (item) => {
        const values = {};
        _.forIn(item, (value, key) => {
            if (key != "user_settings") values[key] = JSON.stringify(value);
        });
        state[item.uuid] = values;
    };
    db.ms.forEach(add);
    _.forIn(db.cs, (list) => list.forEach(add));
    return state;
}

/** The properties whose value differs between two snapshots. */
function moved(before, after) {
    const changes = [];
    _.forIn(after, (values, uuid) => {
        const was = before[uuid] || {};
        _.forIn(values, (value, key) => {
            if (was[key] !== value) changes.push({ uuid: uuid, key: key, from: was[key], to: value });
        });
    });
    return changes;
}

/** What a module is: which rules it runs, where it sits, whether it exists. */
function identity(db) {
    // `group_size` does not survive `formatProperties`, so it is always absent
    // by the time this is compared. The other three are what pick the rules.
    return db.ms.map((m) => `${m.uuid} ${m.name} ${m.row_index} ${m.ignore ? "ignored" : "kept"}`);
}

function reportUnsettled(db, func, max_loops, moving) {
    const items = {};
    db.ms.forEach((m) => (items[m.uuid] = m));
    _.forIn(db.cs, (list) => list.forEach((c) => (items[c.uuid] = c)));

    // A first pass moves every property off nothing, which is not one rule
    // fighting another. Only a property that was already set and then changed
    // again says the passes disagree.
    const contested = moving.filter((change) => change.from !== undefined);
    if (!contested.length) return;

    const lines = contested.slice(0, 12).map((change) => {
        const item = items[change.uuid];
        const sources = item ? layersOf(item, change.key).map((entry) => `${entry.source} (${entry.name})`) : [];
        return `        ${item && item.name ? item.name : change.uuid}.${change.key}  ${change.from} -> ${change.to}\n` + `            written by ${sources.join(", ") || "unknown"}`;
    });

    console.warn(`\n${func}() had not settled after ${max_loops} loops. Still moving:\n${lines.join("\n")}` + (contested.length > lines.length ? `\n        ...and ${contested.length - lines.length} more` : ""));
}

/*
    Every module is visited on every loop, so the same dead branch is found
    several times per build. It is worth saying once.
*/
const reported = new Set();

function reportClobbers(clobbers) {
    clobbers.forEach((clobber) => {
        const signature = `${clobber.label}|${clobber.target}|${clobber.property}`;
        if (reported.has(signature)) return;
        reported.add(signature);

        const history = clobber.writes.map((write) => `        ${write.site}  ->  ${JSON.stringify(write.value)}`).join("\n");
        console.warn(`\n${clobber.label} writes ${clobber.target}.${clobber.property} more than once.\n` + `    Only the last of these has any effect; the others are dead.\n${history}`);
    });
}

function updateItems(arr) {
    // The rebuilt module is a different object, so its layers have to be handed
    // across or the next pass resolves it back down to its defaults.
    return arr.map((m) => carryLayers(m, util.cleanUp(formatProperties(_.cloneDeep(m)), { empty: true })));
}

module.exports = {
    applyModifications: applyModifications,
    applyIdentity: applyIdentity
};
