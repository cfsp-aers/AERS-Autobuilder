const _ = require("lodash");
const fs = require("fs");
const path = require("node:path");

const { load } = require("../utils/load.js");

const { app_dir, user_files } = require("../constants.js");

const aers = load(app_dir, "main/utils/aers utilities.js");

function setComponents(position, content) {
    const children = _.filter(content, (c) => c.position == position || position == "all");

    const result = children.reduce((acc, component, index) => {
        // SET BUTTON GROUPS
        //

        if (component.type == "button") {
            if (component.row_index > 1) {
                _.last(acc).children.push({
                    block: "gridCol",
                    padding: component.padding,
                    children: [component]
                });
            } else {
                acc.push({
                    block: "gridContainer",
                    innerLayout: "single_row",
                    position: component.position || "bottom",
                    children: [
                        {
                            block: "gridCol",
                            padding: component.padding,
                            children: [component]
                        }
                    ]
                });
            }
        } else if (component.type == "image") {
            acc.push({
                group: "single image",
                layout: "gridContainer",
                innerLayout: "single_row",
                position: component.position || "top",
                children: [
                    {
                        layout: "gridCol",
                        margin: "0px",
                        padding: component.padding,
                        children: [component]
                    }
                ]
            });
        } else {
            acc.push(component);
        }
        return acc;
    }, []);

    return result;
}

module.exports = {
    setComponents: setComponents
};
