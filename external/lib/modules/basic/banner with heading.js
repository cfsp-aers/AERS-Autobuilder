const { load } = require("../../../src/main/utils/load.js");
const { app_dir } = require("../../../src/main/constants.js");
const { container, columns, stack, col, two_columns, nothing, setComponents } = load(app_dir, "main/systems/layout.js");

`~~~~~~~~~~~ BANNER WITH HEADING ~~~~~~~~~~~`;

const default_properties = {
  // ~~ module data ~~
  depth: 2,
  max_siblings: 1,

  // ~~ palette ~~
  palette: "primary",
  colour: "primary",
  background: "white",

  // ~~ spacing ~~
  vertical_align: "top",
  block_padding: "0px 16px",
  padding: "8px 16px",
  container_padding: "0px",

  // ~~ border ~~
  border_radius: "24px",

  // ~~ component settings ~~
  components: {
    align: "left",
    text_align: "left"
  },

  heading: { mode: "h6", align: "center", text_align: "center" },
  subheading: { mode: "h7" },

  image: {
    border_radius: "24px"
  },
  badge: {
    padding: "0px 0px 8px"
  },
  button: {
    padding: "12px 0px 0px",
    width: "100%"
  }
};

/*
    The banner's slots, with the heading lifted out of the left column.

    `banner.js` puts the heading at the top of `left`, where it shares the
    column's width with the image beside it. Here it gets a full-width row of
    its own above both columns, so `top` takes it and `left` carries what is
    left of the text stack.
*/
const component_positions = {
  top: ["heading"],
  left: ["lockup", "badge", "subheading", "bodycopy", "button", "terms"],
  right: ["image"]
};

/*
    Two full-width rows, each holding one nested grid: the heading across the
    top, then `banner.js`'s two columns underneath.

    The heading row is a grid of its own rather than components dropped straight
    into the row's column, so that both rows sit at the same depth and take
    their padding in the same place -- on the columns of the inner grid, not on
    the outer row.

    The left column opens at 12px rather than `banner.js`'s 16px because the
    heading row above it already closes the gap; 12px is the spacing the rest of
    the text stack uses (`components/2`).

    A brief that names this module and gives it no heading drops the row rather
    than keeping it: structureEDM deletes a slot that filtered to nothing, so the
    row would otherwise render as an empty cell carrying the 16px above it.
*/
const internal_layout = (current, content) => {
  const heading = setComponents("top", content);

  return container({}, [
    heading.length ? stack({}, [columns({ }, [col({ padding: "8px 16px" }, heading)])]) : nothing(),
    stack({}, [
      two_columns(content, {
        left: { padding: "12px 16px 24px", width: "50%" },
        right: { padding: "0px", width: "50%" }
      })
    ])
  ]);
};

function modes() {}

function modify(childrenOf) {
  // ------------- BEGIN RULES ------------- //
  // -------------- END RULES -------------- //
}

function style(childrenOf) {
  // ------------- BEGIN RULES ------------- //
  // -------------- END RULES -------------- //
}

//
// IGNORE BELOW
// --------------------------------------------------------------------------------

let current, prev, next, module_at, child_at, childOf;
let update;

function setupRules(the, apply) {
  [current, prev, next, module_at, child_at, childOf] = [the.current_item, the.previous_item, the.next_item, the.module_at, the.child_at, the.childOf];
  [update] = [apply.update];
}

module.exports = {
  modify: modify,
  style: style,
  default_properties: default_properties,
  internal_layout: internal_layout,
  component_positions: component_positions,
  modes: modes,
  setupRules: setupRules
};
