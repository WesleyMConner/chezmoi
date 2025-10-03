"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAreaTypeItems = getAreaTypeItems;
const path = require("path");
const paths_1 = require("./paths");
const utils_1 = require("./utils");
let enumsPath = path.join(paths_1.generatedDir, 'enums.json');
async function getAreaTypeItems() {
    return getGeneratedEnumData('areaTypeItems');
}
async function getGeneratedEnumData(identifier) {
    let text = await (0, utils_1.readTextFile)(enumsPath);
    let data = JSON.parse(text);
    return data[identifier];
}
//# sourceMappingURL=data_loader.js.map