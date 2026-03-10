const XLSX = require("xlsx");
const _ = require("lodash");
const fs = require("fs");
const path = require("node:path");
const clone = require("git-clone");

const { load } = require("./utils/load.js");

const { app_dir, user_files, database, AERS_FILES_LOCATION, BRIEF_PARENT_FOLDER, BRIEF_LOCATION, OUTPUT_LOCATION, SELECTED_SHEETS, aers_library_location } = load(__dirname, "constants.js");

function buildEmails() {
    const aers = load(app_dir, "main/utils/aers utilities.js");
    const util = load(app_dir, "main/utils/style utilities.js");

    // REMOVE
    // ---

    // PROCESSING
    const { applyModifications } = load(app_dir, "main/processing/applyModifications.js");
    const { structureEDM } = load(app_dir, "main/processing/structureEDM.js");

    // SYSTEMS
    const setup = load(app_dir, "main/processing/setup.js");
    const { formatProperties } = load(app_dir, "main/systems/formatObjects.js");
    const { setGroupingData } = load(app_dir, "main/systems/groupingSystem.js");
    const { formatRichText, insertRichText } = load(app_dir, "main/systems/richTextSystem.js");

    // PROPERTIES
    const { setPalettes } = load(app_dir, "main/properties/palette.js");
    const { setBrand } = load(app_dir, "main/properties/brand.js");

    // UTILITIES
    const { renderEmail } = load(app_dir, "main/utils/renderEmail.js");

    // CREATE DATA DIRECTORY
    const edm_data_location = path.resolve(path.join(AERS_FILES_LOCATION, "email data"));
    fs.mkdirSync(edm_data_location, { recursive: true });

    aers.startLog();

    console.log(`Start main ...`);
    aers.log(`\nStart main ...\n`);

    let result = {
        success: false,
        files: [],
        original_data: {},
        new_data: {},
        message: ""
    };

    aers.log(`~~~~~ DATA_FILES: ~~~~~~~~~~`, `APP_DIR | -> ${app_dir}\n---`, `AERS_FILES_LOCATION | -> ${AERS_FILES_LOCATION}\n---`, `BRIEF_PARENT_FOLDER | -> ${BRIEF_PARENT_FOLDER}\n---`, `BRIEF_LOCATION | -> ${BRIEF_LOCATION}\n---`, `OUTPUT_LOCATION | -> ${OUTPUT_LOCATION}\n---`, `SELECTED_SHEETS | -> [ ${SELECTED_SHEETS} ]`, `~~~~~~~~~~~~~~~`);

    let wb = XLSX.readFile(BRIEF_LOCATION);

    let offer_library;
    try {
        const raw_offers = wb.Sheets["Offer Library"];
        aers.delete_row(raw_offers, 2);
        offer_library = XLSX.utils.sheet_to_json(raw_offers, { raw: false }).map((item) => {
            let prepared_item = {};
            _.forIn(item, (value, key) => {
                if (!_.isEmpty(value)) prepared_item[_.camelCase(key.split("\n")[0])] = value;
            });
            return prepared_item;
        });

        aers.writeData("offer_library.json", offer_library, false, database);
    } catch (e) {
        console.warn("no offer library sheet found");
    }
    //

    let generatedFiles = {};

    SELECTED_SHEETS.forEach((brief) => {
        let data = {
            module_array: [],
            component_array: [],
            user_settings: {},
            output: {}
        };

        // CREATE MAIN EMAIL OBJECT

        const EMAIL_OBJECT = {
            name: brief,
            date_created: Date(),
            header_data: {
                brand: ""
            }
        };

        // Generate email data object from brief
        let ws = wb.Sheets[brief];
        aers.delete_row(ws, 1);

        const INITIALISED_DATA = XLSX.utils.sheet_to_json(ws, { raw: false }).map((item, index) => {
            let prepared_item = {};
            _.forIn(item, (value, key) => {
                if (!_.isEmpty(value)) prepared_item[_.camelCase(key.split("\n")[0])] = value;
            });

            // ~~ initialise header data
            if (index == 0) EMAIL_OBJECT.header_data.brand = prepared_item.brand.toLowerCase();

            return setup.excel(prepared_item);
        });

        // # TO DO

        // step 1: process the excel sheet to create an array of simple objects

        // step 2: get all the content for the email
        //   -> if content refers to offer library, get components from offer library
        //   -> if module has preset content, get preset content from module.template file
        //       -- what data is required for the preset content?

        const total_content = INITIALISED_DATA.reduce((acc, item, index) => {
            switch (true) {
                // if button group, separate and push both buttons
                case item.component == "button" && item.content?.includes("\n"):
                    item.content.split("\n").forEach((btn, i) => {
                        acc.push({ ...item, btn_indx: i + 1, content: btn });
                    });
                    break;
                // if offer, push offer items
                case setup_offer_library[item.content] != undefined:
                    acc.push(item);
                    setup_offer_library[item.content].forEach((offer_component) => {
                        const offer_item = setup.excel(offer_component);
                        offer_item.brand = item.brand;
                        acc.push(offer_item);
                    });
                    break;
                default:
                    acc.push(item);
                    break;
            }
            // check if module has presets and if so, apply preset content
            if (item.module) {
                try {
                    const { preset_content } = load(user_files, item.template);

                    const preset = _.find(preset_content, (x) => {
                        const [property, target] = x.condition.toLowerCase().split("/");
                        return target == item.original[property].toLowerCase();
                    });
                    console.log(preset);

                    preset.content.forEach((content_item) => {
                        const preset_item = setup.excel(content_item);
                        preset_item.brand = item.brand;
                        acc.push(preset_item);
                    });
                } catch (e) {
                    console.log(`no preset content for ${item.module}`);
                }
            }
            return acc;
        }, []);

        /*

        // Generate email data object from brief
        let ws = wb.Sheets[brief];
        aers.delete_row(ws, 1);

        const BRIEF_JSON = {
            name: brief,
            created: Date(),
            success: null,
            content: XLSX.utils.sheet_to_json(ws, { raw: false }).map((item) => {
                let prepared_item = {};
                _.forIn(item, (value, key) => {
                    if (!_.isEmpty(value)) prepared_item[_.camelCase(key.split("\n")[0])] = value;
                });
                return prepared_item;
            })
        };

        */
        // Freeze original eDM content so it can't be modified
        const edm_content = setup.setupContent(BRIEF_JSON.content, offer_library);

        // Add offerdetails and extra buttons / any components to EDM_CONTENT before setting basic properties
        // ~~~~ Number of modules / components and order should be locked ~~~~

        //aers.log(edm_content);

        const setup_content = edm_content.map((object) => formatProperties(object)); //setBasicProperties(object));

        //aers.log(setup_content);

        let db = {
            ms: [],
            cs: {},
            user_settings: []
        };
        let r_i = 0;
        setup_content.forEach((object, index) => {
            const item = util.cleanUp(object, {
                empty: true,
                remove: ["offerDetails", "moduleType", "component", "settings", "styling"],
                keep: ["user_settings"]
            });
            if (item.settings) console.log(item);
            const parent_id = _.findLast(setup_content, (m) => m.entity_type == "module", index).uuid;
            switch (item.entity_type) {
                case "module":
                    db.ms.push(item);
                    break;
                case "component":
                    db.cs[parent_id] ? db.cs[parent_id].push(item) : (db.cs[parent_id] = [item]);
            }
        });

        // Set brands for modules / components

        db.ms.forEach((m) => {
            if (m.brand) m.brand = m.brand.toLowerCase();
            else m.brand = db.ms[0].brand.toLowerCase();

            if (db.cs[m.uuid])
                db.cs[m.uuid].forEach((c) => {
                    if (c.brand) c.brand = c.brand.toLowerCase();
                    else c.brand = m.brand;

                    c.brand = setBrand(c.brand, m.brand);
                    c.parent_brand = setBrand(c.brand, m.brand, "parent");
                });
            m.brand = setBrand(m.brand, db.ms[0].brand);
            m.parent_brand = setBrand(m.brand, db.ms[0].brand, "parent");
        });

        setGroupingData(db.ms);

        // db.ms = db.ms.map((m) => util.cleanUp(formatProperties(m), { empty: true }));
        // db.ms = db.ms.map((m) => util.cleanUp(setBasicProperties(m), { empty: true }));

        applyModifications(db, "modify", 2);

        //db.ms = db.ms.map((m) => util.cleanUp(formatProperties(m), { empty: true }));
        // db.ms = db.ms.map((m) => util.cleanUp(setBasicProperties(m), { empty: true }));

        applyModifications(db, "style", 2);

        applyModifications(db, "modes", 1);

        setPalettes(db); // NEEDS WORK

        //finaliseData();

        db.ms = db.ms.map((m) =>
            util.cleanUp(setup.setBasicProperties(m), {
                empty: true
            })
        );
        _.forIn(db.cs, (value, key) => {
            db.cs[key] = value.map((c) => util.cleanUp(formatProperties(c), { empty: true }));
        });

        _.forIn(db.cs, (value, key) => {
            db.cs[key] = value.map((c) => {
                return formatRichText(c, `${c.content}`);
            });
        });

        // Replace colour values with those from colour_library
        db.ms = db.ms.map((m) => util.replaceColours(m, m));
        _.forIn(db.cs, (value, key) => {
            value.map((c) => (c = util.replaceColours(c, c)));
        });

        _.forIn(db.cs, (value, key) => {
            db.cs[key] = value.map((c) => insertRichText(c, `${c.content}`));
        });

        aers.writeData("module_store.json", db.ms, false, database);

        const module_array = structureEDM(db.ms, db.cs);

        // Replace colour values with those from colour_library

        aers.writeData(
            "entity_store.json",
            db.ms.map((m) => {
                m.children = db.cs[m.uuid];
                return m;
            }),
            false,
            database
        );
        aers.writeData("component_store.json", db.cs, false, database);

        //const formatted_output = formatData(); //structureEDM(formatData());

        // Write data files
        aers.writeData("email_json.json", module_array, false, database);

        data.output = Object.freeze(module_array);

        const finalised_data = {
            name: brief,
            created: Date(),
            content: Object.freeze(data.output)
        };

        try {
            let renderedEmail = renderEmail(OUTPUT_LOCATION, finalised_data);
            generatedFiles[brief] = {
                fileName: `${brief}.html`,
                filePath: path.join(OUTPUT_LOCATION, `${brief}.html`)
                //fileContent: renderedEmail
            };

            fs.writeFileSync(generatedFiles[brief].filePath, renderedEmail, { encoding: "utf8" });

            result.success = true;
            result.message = "successfully generated files";
            result.files = generatedFiles;
        } catch (e) {
            console.log(e.message);
        }

        aers.writeData(`${brief}.json`, module_array, false, edm_data_location);

        db = null;
    });

    console.log(`... End main`);
    aers.log(`\n... End main`);
    return result;
}

//throw new Error("Something went wrong!");

/*


        # How does someone add a new module?
        -> Add module to modules.json
        -> add module template file to relevant folder
            -> Default properties identical to styling functions
            -> default component positions
            -> internal layout (shorthand?)
            -> styling rules


        # Database
        - ms -> array of modules in order
        - cs -> object with components inside arrays with key being parent module
        

        # style utilities
        -> Must be applicable at (nearly) any point
        -> Should be loadable by (nearly) every file
            - keywords
                -> "match/X" -> matches value of X object
                -> "default" -> default value for module / component
            - setProperty(property, new_property / keyword)
                -> sets specific property e.g.
                    - setProperty(template, "abc.js")
                    - setProperty(template, "match/X")
            - format(property)
                -> calls format function for specified property
                -> format(padding)
            - setGroupings
                -> Group modules and update row_index for modules
                -> requires : max_siblings, name, access to previous/next module


        # STEPS
        
        1. Format data into standard object
            -> Needs to be able to be reapplied at any time

        2. Set properties from modules.json library
            -> Needs to be able to be reapplied at any time
                - name : set by moduleType input
                - type : set by name
                - max_siblings : #
                - depth : #
                - template : "name.js" -> used to configure specific module settings
                - config : used to configure module
        ~~~ LOCK PROPERTIES ~~~

        ~~~~~~~~~~~~~~~~~~~~~~~
        3. Configure modules from config file
            -> What does this do?
        ~~~ LOCK PROPERTIES ~~~
            - name
            - type
            - max_siblings
            - template
            - config
        ~~~~~~~~~~~~~~~~~~~~~~~

        // Config will need to be reapplied when module data changes
            - If modules.json data gets reapplied, reconfigure module
            - If a property from modules.json gets changed, may need to reconfigure

        4. Set module groupings
            - Group modules and set row_index to determine multi-column modules
            - If necessary, change module data and reconfigure to balance modules


        5. Style modules from template
            -> What properties can be changed here?
        ~~~ LOCK PROPERTIES ~~~
            - mode
            - brand
            - parent_brand
            - palette           -> Could be key word or colour
            - background        -> Could be key word or colour or hex
            - colour            -> Could be key word or colour or hex
            - margin            -> Needs to be formatted to and from array
            - padding           -> Needs to be formatted to and from array
            - container_padding -> Needs to be formatted to and from array
            - block_padding     -> Needs to be formatted to and from array
            - group_padding     -> Needs to be formatted to and from array
            - other styling properties (?)
        ~~~~~~~~~~~~~~~~~~~~~~~

        

        # TO DO

        - transitions between modules
        - also add empty divider or placeholder if module is dynamic on/off


        - optimise to speed up

        - image downloader
        - dynamic content blocks / grouping

        - emails -> output doc that is used to generate html
        - emails_override -> if this exists, use it in place of the generated json file (allows users to edit json directly)
        
        */

module.exports = {
    buildEmails: buildEmails
};
