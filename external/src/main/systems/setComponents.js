const _ = require("lodash");

function setComponents(position, content) {
    const children = content[position] ? content[position] : [];

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
                block: "gridContainer",
                innerLayout: "single_row",
                position: component.position || "top",
                children: [
                    {
                        block: "gridCol",
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
