/*
    Entity identifiers.

    These are build-local handles: they exist to link a component back to its
    parent module and to look an entity up while the tree is being assembled.
    Nothing outside a single build ever refers to them, so they do not need to
    be globally unique -- only unique within one rendered email.

    They used to be `Math.random().toString(36).slice(4).toUpperCase()`, which
    made every build of the same brief produce different output. That ruled out
    diffing two builds against each other, which is exactly what golden-file
    tests do. A counter per entity type gives the same uniqueness guarantee and
    reads better in the data files: M0003 is the third module.

    `reset()` is called once per brief sheet so that a sheet produces the same
    identifiers whether it is built alone or after five other sheets.
*/

const counters = {};

const PREFIXES = {
    module: "M",
    component: "C"
};

function nextUuid(entity_type) {
    const prefix = PREFIXES[entity_type] || "X";
    counters[prefix] = (counters[prefix] || 0) + 1;
    return `${prefix}${String(counters[prefix]).padStart(4, "0")}`;
}

function resetUuids() {
    Object.keys(counters).forEach((key) => delete counters[key]);
}

module.exports = {
    nextUuid: nextUuid,
    resetUuids: resetUuids
};
