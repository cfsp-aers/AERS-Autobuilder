const { load } = require("../../../src/main/utils/load.js");
const { app_dir } = require("../../../src/main/constants.js");
const { columns, col, region, setComponents } = load(app_dir, "main/systems/layout.js");

`~~~~~~~~~~~ PRODUCT BANNER ~~~~~~~~~~~`;

const default_properties = {
  // ~~ module data ~~
  depth: 2,
  max_siblings: 1,

  // ~~ palette ~~
  palette: "promo",
  background: "light grey",

  // ~~ spacing ~~
  vertical_align: "top",
  block_padding: "8px 0px 0px",
  padding: "8px 16px",
  container_padding: "0px",

  // ~~ border ~~
  border_radius: "16px",

  // ~~ slot settings ~~
  // The offer sits on a red band across the right column. See ADR 0008.
  bottom: { palette: "bright red" },

  // ~~ component settings ~~
  bodycopy: {
    vertical_align: "center",
    padding: "0px 24px 12px",
    custom_class: "offer-description"
  },
  heading: {
    padding: "0px 16px 6px",
    font_size: "15px",
    line_height: "15px",
    font_weight: "bold",
    custom_class: "offer-badge"
  },
  subheading: {
    font_size: "22px",
    line_height: "22px",
    padding: "0px 16px",
    custom_class: "offer-main"
  },
  "subheading/2": {
    font_weight: "300",
    font_size: "16px",
    line_height: "18px",
    padding: "2px 24px 0px",
    custom_class: "offer-secondary"
  },
  components: {
    align: "center",
    text_align: "center"
  },
  image: {
    border_radius: "16px"
  },
  button: {
    palette: "yellow/black",
    padding: "16px 0px 0px",
    inner_padding: "0px 40px",
    width: "60%",
    align: "center",
    height: "40px",
    mso_height: "30pt"
  }
};

const component_positions = {
  left: ["image"],
  top: ["bodycopy"],
  bottom: ["heading", "subheading", "terms"],
  below: ["button"]
};

/*
    Unlike promo tile, the button sits inside the card, so the card is
    structureEDM's default wrapper rather than one declared here. The red
    `bottom` region runs to the card's right edge, so the right column has no
    side padding of its own; the white top and the button add their own.
*/
const internal_layout = (current, content) =>
  columns({ }, [
    col({ mobile_stack: false, padding: "0px", width: "50%", vertical_align: "middle" }, setComponents("left", content)),
    col({ mobile_stack: false, padding: "16px 0px", width: "50%", vertical_align: "middle" }, [
      region(current, content, "top", { column: { padding: "0px" } }),
      region(current, content, "bottom", { column: { padding: "8px 0px", vertical_align: "middle" } }),
      ...setComponents("below", content)
    ])
  ]);

function modes() {}

function modify(childrenOf) {
  // ------------- BEGIN RULES ------------- //
  // -------------- END RULES -------------- //
}

function style(childrenOf) {
  // ------------- BEGIN RULES ------------- //
    if (current.brand == "petbarn cw") {
    update(current, {
      background: "black"
    })
  }
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
