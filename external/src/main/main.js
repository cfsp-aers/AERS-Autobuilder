const XLSX = require("xlsx");
const _ = require("lodash");
const fs = require("fs");
const path = require("node:path");

const { load } = require("./utils/load.js");
const { resetUuids } = require("./utils/uuid.js");
// Required directly, not through load(): both hold state that must be shared
// with everything this build loads, and load() hands out fresh instances.
const { configure } = require("./build_config.js");

const { app_dir, user_files } = load(__dirname, "constants.js");

/**
 * Build the selected sheets of a brief into .html files.
 *
 * @param {object} config see build_config.js for the fields
 * @returns {{success: boolean, files: object, message: string}}
 */
function buildEmails(config) {
    /*
        First, before anything else is loaded. aers utilities and everything
        underneath it read the configuration at call time, so it has to be set
        before the first of those calls -- which is aers.startLog(), below.
    */
    const { briefLocation, briefParentFolder, outputLocation, selectedSheets, databaseLocation, aersFilesLocation } = configure(config);

    const aers = load(app_dir, "main/utils/aers utilities.js");
    const util = load(app_dir, "main/utils/style utilities.js");

    // REMOVE
    // ---

    // PROCESSING
    const { applyModifications } = load(app_dir, "main/processing/applyModifications.js");
    const { structureEDM } = load(app_dir, "main/processing/structureEDM.js");

    // SYSTEMS
    const { setupContent, setBasicProperties, setupDataBase } = load(app_dir, "main/processing/setup.js");
    const { formatProperties } = load(app_dir, "main/systems/formatObjects.js");
    const { setGroupingData } = load(app_dir, "main/systems/groupingSystem.js");
    const { formatRichText, insertRichText } = load(app_dir, "main/systems/richTextSystem.js");

    // PROPERTIES
    const { setPalettes } = load(app_dir, "main/properties/palette.js");
    const { setBrand } = load(app_dir, "main/properties/brand.js");

    // UTILITIES
    const { renderEmail } = load(app_dir, "main/utils/renderEmail.js");

    // CREATE DATA DIRECTORY
    const edm_data_location = path.resolve(path.join(aersFilesLocation, "email data"));
    fs.mkdirSync(edm_data_location, { recursive: true });
    // Per-user scratch, in userData under ADR 0001. Absent on a first build.
    fs.mkdirSync(databaseLocation, { recursive: true });

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

    aers.log(`~~~~~ DATA_FILES: ~~~~~~~~~~`, `APP_DIR | -> ${app_dir}\n---`, `AERS_FILES_LOCATION | -> ${aersFilesLocation}\n---`, `BRIEF_PARENT_FOLDER | -> ${briefParentFolder}\n---`, `BRIEF_LOCATION | -> ${briefLocation}\n---`, `OUTPUT_LOCATION | -> ${outputLocation}\n---`, `SELECTED_SHEETS | -> [ ${selectedSheets} ]`, `~~~~~~~~~~~~~~~`);

    let wb = XLSX.readFile(briefLocation);

    let offer_library;
    if (wb.Sheets["Offer Library"]) {
        // Not caught: a brief that has an Offer Library the engine cannot read is
        // a brief whose offers will all silently miss. Better to stop here, where
        // the message can say which sheet, than at the first lookup.
        offer_library = aers.sheet_to_objects(wb.Sheets["Offer Library"], "offerAlias", `the Offer Library sheet of ${path.basename(briefLocation)}`);
        aers.writeData("offer_library.json", offer_library, false, databaseLocation);
    } else {
        console.warn("no offer library sheet found");
    }
    //

    let generatedFiles = {};

    selectedSheets.forEach((brief) => {
        // Each sheet numbers its entities from scratch, so a sheet produces the
        // same output whether it is built alone or after five others.
        resetUuids();

        let data = {
            module_array: [],
            component_array: [],
            user_settings: {},
            output: {}
        };

        // Generate email data object from brief
        const BRIEF_JSON = {
            name: brief,
            created: Date(),
            success: null,
            content: aers.sheet_to_objects(wb.Sheets[brief], "moduleType", `the "${brief}" sheet`)
        };

        /*
            What the "show file data" window compares. The beta declared these
            two fields on the result and never assigned either, so the window
            showed {} against {}. They are the two ends of the build: the brief
            as it was read, and the modules that came out of it.
        */
        result.original_data[brief] = BRIEF_JSON.content;

        // Freeze original eDM content so it can't be modified
        const edm_content = setupContent(BRIEF_JSON.content, offer_library, `the "${brief}" sheet`);

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
            util.cleanUp(setBasicProperties(m), {
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

        aers.writeData("module_store.json", db.ms, false, databaseLocation);

        result.new_data[brief] = db.ms;

        const module_array = structureEDM(db.ms, db.cs);

        // Replace colour values with those from colour_library

        aers.writeData(
            "entity_store.json",
            db.ms.map((m) => {
                m.children = db.cs[m.uuid];
                return m;
            }),
            false,
            databaseLocation
        );
        aers.writeData("component_store.json", db.cs, false, databaseLocation);

        //const formatted_output = formatData(); //structureEDM(formatData());

        // Write data files
        aers.writeData("email_json.json", module_array, false, databaseLocation);

        data.output = Object.freeze(module_array);

        const finalised_data = {
            name: brief,
            created: Date(),
            content: Object.freeze(data.output)
        };

        try {
            let renderedEmail = renderEmail(outputLocation, finalised_data);
            generatedFiles[brief] = {
                fileName: `${brief}.html`,
                filePath: path.join(outputLocation, `${brief}.html`)
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
