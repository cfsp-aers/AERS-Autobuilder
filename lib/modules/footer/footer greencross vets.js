const _ = require("lodash");
const { load } = require("../../../src/main/utils/load.js");
const { app_dir, user_files } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");
const { setComponents } = load(app_dir, "main/systems/setComponents.js");
//
//

`~~~~~~~~~~~ MODULE NAME ~~~~~~~~~~~`;

const default_properties = {
    // ~~ module data ~~
    depth: 1,
    max_siblings: 1,

    // ~~ palette ~~
    palette: "dark",

    // ~~ spacing ~~
    vertical_align: "top",
    padding: "0px",
    container_padding: "0px",
    block_padding: "0px",
    group_padding: "0px",

    // ~~ component settings ~~
    components: {
        padding: "0px 16px 16px"
    }
};

const component_positions = {
    all: ["image", "badge", "heading", "subheading", "bodycopy", "button", "terms"]
};

const internal_layout = (current, content) => {
    return {
        block: "gridContainer",
        transition: current.transition,
        transition_id: current.transition_id,
        children: current.transactional
            ? [{ block: "gridRow", children: [{ block: "gridCol", padding: "16px 32px 32px", children: [{ entity_type: "component", colour: "white", font_size: "12px", line_height: "14px", content: `transactional footer` }] }] }]
            : [
                  {
                      block: "gridRow",
                      children: [
                          {
                              block: "gridCol",
                              padding: "8px 0px 16px",
                              children: [
                                  {
                                      block: "gridContainer",
                                      innerLayout: "single_row",
                                      children: [
                                          {
                                              block: "gridCol",
                                              children: [
                                                  {
                                                      entity_type: "component",
                                                      type: "image",
                                                      width: "180px",
                                                      border_radius: "0px",
                                                      content: { aem_id: "urn:aaid:aem:b3c3b85a-967c-4906-a798-aae821debaac", src: "images/logo_GreencrossVets_HalfColour.png", href: "https://www.greencrossvets.com.au" }
                                                  }
                                              ]
                                          }
                                      ]
                                  }
                              ]
                          }
                      ]
                  },
                  {
                      block: "gridRow",
                      children: [
                          {
                              block: "gridCol",
                              padding: "0px 32px 32px",
                              children: [
                                  {
                                      block: "gridContainer",
                                      innerLayout: "single_row",
                                      children: [
                                          {
                                              block: "gridCol",
                                              children: [
                                                  {
                                                      entity_type: "component",
                                                      type: "button",
                                                      brand: "greencross vets",
                                                      background: "#001939",
                                                      font_size: "12px",
                                                      line_height: "14px",
                                                      content: { text: "BOOK NOW", href: "https://www.greencrossvets.com.au/book-online" }
                                                  }
                                              ]
                                          },
                                          {
                                              block: "gridCol",
                                              children: [
                                                  {
                                                      entity_type: "component",
                                                      type: "button",
                                                      brand: "greencross vets",
                                                      background: "#001939",
                                                      font_size: "12px",
                                                      line_height: "14px",
                                                      force_mso_colour: true,
                                                      content: { text: "SERVICES", href: "https://www.greencrossvets.com.au/services" }
                                                  }
                                              ]
                                          },
                                          {
                                              block: "gridCol",
                                              children: [
                                                  {
                                                      entity_type: "component",
                                                      type: "button",
                                                      brand: "greencross vets",
                                                      background: "#001939",
                                                      font_size: "12px",
                                                      line_height: "14px",
                                                      force_mso_colour: true,
                                                      content: { text: "CONTACT US", href: "https://www.greencrossvets.com.au/contact" }
                                                  }
                                              ]
                                          },
                                          {
                                              block: "gridCol",
                                              children: [
                                                  {
                                                      entity_type: "component",
                                                      type: "button",
                                                      brand: "greencross vets",
                                                      background: "#001939",
                                                      font_size: "12px",
                                                      line_height: "14px",
                                                      force_mso_colour: true,
                                                      content: { text: "ABOUT US", href: "https://www.greencrossvets.com.au/about-greencross-vets" }
                                                  }
                                              ]
                                          }
                                      ]
                                  }
                              ]
                          }
                      ]
                  },
                  {
                      block: "gridRow",
                      children: [
                          {
                              block: "gridCol",
                              padding: "0px 32px 0px",
                              children: setComponents("all", content)
                          }
                      ]
                  },
                  {
                      block: "gridRow",
                      children: [
                          {
                              block: "gridCol",
                              padding: "0px 32px 32px",
                              children: [
                                  current.hpp
                                      ? {
                                            entity_type: "component",
                                            colour: "white",
                                            font_size: "12px",
                                            line_height: "14px",
                                            padding: "0px 0px 16px",
                                            content: `*Healthy Pets Plus Benefits must not be abused, including in ways that are not for the benefit of the pet covered by the membership. Benefits offered subject to availability. Savings based on prices for non-Healthy Pets Plus members and cannot be used in conjunction with any other offer or discount unless stated otherwise. See <a href="https://www.greencrossvets.com.au/healthy-pets-plus/terms-and-conditions-v2/" style="font-weight:normal;color:#FFFFFF;font-size:12px;line-height:14px;">HERE.</a> for Healthy Pets Plus T&Cs. `
                                        }
                                      : {},
                                  {
                                      entity_type: "component",
                                      colour: "white",
                                      font_size: "12px",
                                      line_height: "14px",
                                      content: `<p><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;">Make sure emails from Greencross Vets make it to your inbox. Add greencrossvets@edm.greencrossvets.com.au to your address book.</span></p> <p><br></p> <p><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;">Can't see the images? <a class="arc-link" data-nl-type="mirrorPage" data-tracking-type="MIRROR_PAGE" style="text-decoration:underline;color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;" href id="acr-link-52530229">View online.</a></span></p><p><br></p><p><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;">Please refer to our <a class="arc-link" data-nl-type="externalLink" style="text-decoration:underline;color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;" href="https://www.greencrossvets.com.au/privacy-policy/" id="acr-link-34318281">PRIVACY POLICY</a> if you are not sure why you received this email or if you have a question about privacy. To protect your privacy, we recommend that you do not forward or otherwise distribute this email.</span></p> <p><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;"><br/>This email was sent to you by Greencross Pty Ltd.</span><br/><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;">Greencross Vets Support Office, Quarter One, Level 2, 1 Epping Road, North Ryde NSW 2113.</span></p> <p><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;">P: 1300 836 036 E: info@greencrossvet.com.au</span></p><br/><p><span style="color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;">Click <a class="arc-link" data-nl-type="unsubscription" id="acr-link-15090631" style="text-decoration:underline;color:rgb(255, 255, 255); font-size: 12px; line-height: 14px;" href="https://t1.edm.greencrossvets.com.au/lp/unsubscribe" data-tracking-type="OPT_OUT">HERE</a> to unsubscribe from marketing communications, including vaccination reminders via email. </span></p>`
                                  }
                              ]
                          }
                      ]
                  },
                  {
                      block: "gridRow",
                      children: [
                          {
                              block: "gridCol",
                              padding: "0px 32px 32px",
                              children: [
                                  {
                                      block: "gridContainer",
                                      innerLayout: "single_row",
                                      children: [
                                          { block: "gridCol" },
                                          {
                                              block: "gridCol",
                                              children: [
                                                  {
                                                      block: "gridContainer",
                                                      innerLayout: "single_row",
                                                      children: [
                                                          {
                                                              block: "gridCol",
                                                              padding: "8px",
                                                              mobile_stack: false,
                                                              children: [{ entity_type: "component", type: "image", width: "32px", content: { src: "images/gxv-fb.png", href: "https://www.facebook.com/GreencrossVets/", aem_id: "urn:aaid:aem:042f6065-6098-4967-89ee-670c3b8bd540" } }]
                                                          },
                                                          {
                                                              block: "gridCol",
                                                              padding: "8px",
                                                              mobile_stack: false,
                                                              children: [{ entity_type: "component", type: "image", width: "32px", content: { src: "images/gxv-in.png", href: "https://www.instagram.com/greencrossvets/", aem_id: "urn:aaid:aem:fd8c01bf-5189-4bac-938f-519889eec1fd" } }]
                                                          },
                                                          {
                                                              block: "gridCol",
                                                              padding: "8px",
                                                              mobile_stack: false,
                                                              children: [{ entity_type: "component", type: "image", width: "32px", content: { src: "images/gxv-yt.png", href: "https://www.youtube.com/user/Greenxvets", aem_id: "urn:aaid:aem:c9f3614c-7e5b-4969-b219-32797bf75ac0" } }]
                                                          }
                                                      ]
                                                  }
                                              ]
                                          },
                                          { block: "gridCol" }
                                      ]
                                  }
                              ]
                          }
                      ]
                  }
              ]
    };
};

function modes() {}

function modify(childrenOf) {
    // ------------- BEGIN RULES ------------- //
    // -------------- END RULES -------------- //
}

function style(childrenOf) {
    // ------------- BEGIN RULES -------------
    // ------------- END RULES -------------
}

//
// IGNORE BELOW
// --------------------------------------------------------------------------------

let current, prev, next, module_at, child_at, childOf;
let update;

function setupRules(the, apply) {
    [current, prev, next, module_at, child_at, childOf] = [the.current_item, the.previous_item, the.next_item, the.module_at, the.child_at, the.childOf];
    [update] = [apply.update];

    update(current, default_properties);
    update(current, current.user_settings);
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
