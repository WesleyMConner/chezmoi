"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAntoraDocumentContext = exports.getAttributes = exports.getAntoraConfig = exports.antoraConfigFileExists = exports.findAntoraConfigFile = void 0;
const antoraContext_1 = require("./antoraContext");
async function findAntoraConfigFile(_) {
    return undefined;
}
exports.findAntoraConfigFile = findAntoraConfigFile;
async function antoraConfigFileExists(_) {
    return false;
}
exports.antoraConfigFileExists = antoraConfigFileExists;
async function getAntoraConfig(textDocumentUri) {
    return new antoraContext_1.AntoraConfig(textDocumentUri, {});
}
exports.getAntoraConfig = getAntoraConfig;
async function getAttributes(_) {
    return {};
}
exports.getAttributes = getAttributes;
async function getAntoraDocumentContext(_, __) {
    return undefined;
}
exports.getAntoraDocumentContext = getAntoraDocumentContext;
//# sourceMappingURL=antoraDocumentBrowserShim.js.map