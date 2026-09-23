`~~~~~~~~~~~ IMAGE ~~~~~~~~~~~`;

/*
    The five keys below `padding` were the image template's opinion until
    23/09/2026, carried as `{{ element.align or "center" }}` and its three
    siblings. They are the same values, moved to the file that is supposed to
    hold them, so a rule or a brief can now override what only a template could
    answer before.

    Each is layer 1, the lowest, so nothing that already sets these loses: the
    images that take a 12px or 64px radius from a rule keep it, and the nine
    that are aligned left stay left. It fills only where nothing spoke at all --
    which is where the template used to.
*/
const default_properties = {
    // ~~ palette ~~
    background: "transparent",
    // ~~ spacing ~~
    vertical_align: "middle",
    padding: "0px",
    align: "center",
    // ~~ border ~~
    border_radius: "24px",
    // ~~ size ~~
    width: "100%",
    max_width: "100%"
    // ~~ other ~~
};

function modes() {}

function modify(parent) {
    // ------------- BEGIN RULES ------------- //
    // -------------- END RULES -------------- //
}

function style(parent) {
    // ------------- BEGIN RULES ------------- //
    // -------------- END RULES -------------- //
}

let current, prev, next;
let update;

function setupRules(the, apply) {
    [current, prev, next] = [the.current_item, the.previous_item, the.next_item];
    [update] = [apply.update];
}

module.exports = {
    modify: modify,
    style: style,
    default_properties: default_properties,
    modes: modes,
    setupRules: setupRules
};
