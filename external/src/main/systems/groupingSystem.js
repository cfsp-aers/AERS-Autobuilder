const _ = require("lodash");

const { load } = require("../../../src/main/utils/load.js");
const { app_dir, user_files } = require("../../../src/main/constants.js");
const aers = load(app_dir, "main/utils/aers utilities.js");

function setGroupingData(arr) {
    const groups = arr.reduce((acc, item, index) => {
        const child_index = _.findIndex(arr, (m) => m.uuid == item.uuid);
        const child = arr[child_index];
        const prev = arr[index - 1] ? arr[index - 1] : arr[index];
        const grouped_item = {
            group: child.name,
            uuid: child.uuid,
            children: [{ name: item.name, uuid: item.uuid, max_siblings: item.max_siblings }]
        };
        // conditions for grouping
        if (index == 0 || item.name != prev.name || item.dynamicContent != prev.dynamicContent) acc.push(grouped_item);
        else _.last(acc).children.push({ name: item.name, uuid: item.uuid, max_siblings: item.max_siblings });
        return acc;
    }, []);

    let count_array = [];
    groups.forEach((group) => {
        let total = group.children.length;
        group.children.forEach((item, index) => {
            switch (true) {
                case total === 0:
                    break;
                case total <= item.max_siblings:
                    for (let i = 1; i <= total; i++) count_array.push(`${i}/${total}`);
                    //count_array.push(total)
                    total -= total;
                    break;
                case total >= item.max_siblings * 2:
                    for (let i = 1; i <= item.max_siblings; i++) count_array.push(`${i}/${item.max_siblings}`);
                    //count_array.push(item.max_siblings);
                    total -= item.max_siblings;
                    break;
                case total > item.max_siblings && total < item.max_siblings * 2:
                    for (let i = 1; i <= Math.round(total / 2); i++) count_array.push(`${i}/${Math.round(total / 2)}`);
                    //count_array.push(Math.round(total / 2));
                    total -= Math.round(total / 2);
                    break;
                default:
                    break;
            }
        });
    });
    arr.map((m, i) => {
        m.row_index = _.toInteger(count_array[i].split("/")[0]);
        m.group_size = _.toInteger(count_array[i].split("/")[1]);
    });
}

module.exports = {
    setGroupingData: setGroupingData
};
