const { load } = require("../../../src/main/utils/load.js");
const { app_dir } = require("../../../src/main/constants.js");
const { container, stack, card, region, nothing, setComponents } = load(app_dir, "main/systems/layout.js");

`~~~~~~~~~~~ PRODUCT TILE ~~~~~~~~~~~`;

const default_properties = {
  // ~~ module data ~~
  depth: 2,
  max_siblings: 2,

  width: "100%",

  // ~~ palette ~~
  palette: "promo",
  background: "light grey",

  // ~~ spacing ~~
  vertical_align: "top",
  stack_cols_on_mobile: false,
  block_padding: "8px 12px 0px",
  padding: "4px",
  container_padding: "0px",

  // ~~ border ~~
  border_radius: "16px",

  // ~~ slot settings ~~
  // The offer sits on a red band at the foot of the card. See ADR 0008.
  bottom: { height: "84px", width: "100%", palette: "bright red" },

  // ~~ component settings ~~
  bodycopy: {
    height: "36px",
    vertical_align: "center",
    padding: "0px 16px 12px",
    custom_class: "offer-description",
    max_width: "244px"
  },
  heading: {
    padding: "0px 8px 6px",
    font_size: "15px",
    line_height: "15px",
    font_weight: "bold",
    custom_class: "offer-badge"
  },
  subheading: {
    font_size: "22px",
    line_height: "22px",
    padding: "0px 8px",
    max_width: "260px",
    custom_class: "offer-main"
  },
  "subheading/2": {
    font_weight: "300",
    font_size: "16px",
    line_height: "18px",
    padding: "2px 12px 0px",
    max_width: "252px",
    custom_class: "offer-secondary"
  },
  components: {
    width: "auto",
    align: "center",
    text_align: "center"
  },
  image: {
    border_radius: "16px"
  },
  button: {
    palette: "yellow/black",
    inner_padding: "0px 40px",
    width: "60%",
    align: "center",
    height: "40px",
    mso_height: "30pt"
  }
};

const component_positions = {
  top: ["image", "bodycopy"],
  bottom: ["heading", "subheading", "terms"],
  below: ["button"]
};

/*
    The card is drawn here rather than by structureEDM, so the button can sit
    below it on the band. Inside it, the white top and the red `bottom` region;
    the region rounds its own lower corners, since overflow cannot clip them in
    Outlook.
*/
const internal_layout = (current, content) => {
  const radius = current.border_radius || "24px";
  const below = setComponents("below", content);

  return container({}, [
    stack({}, [
      card({}, [
        region(current, content, "top", { column: { padding: "0px", width: "100%", } }),
        region(current, content, "bottom", {
          container: { border_radius: `0px 0px ${radius} ${radius}`, custom_class: "promo-tile-offer-grid", width: "100%", },
          column: { padding: "0px", vertical_align: "middle", height: "84px", custom_class: "promo-tile-offer", width: "100%", }
        })
      ])
    ]),
    below.length ? stack({ padding: "16px 0px 0px" }, below) : nothing()
  ]);
};

function modes() {}

function modify(childrenOf) {
  // ------------- BEGIN RULES ------------- //
    

  // -------------- END RULES -------------- //
}

function style(childrenOf) {
  // ------------- BEGIN RULES ------------- //

  if (current.brand == "petbarn cw") {
    update(current, {
      background: "black",
      "button" : {
        "palette" : "white/black"
      }
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
