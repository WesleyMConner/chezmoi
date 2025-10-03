"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.provideCompletionItems = exports.BibtexProvider = void 0;
const vscode = __importStar(require("vscode"));
const createContext_1 = require("./createContext");
const fs_1 = require("fs");
const findFiles_1 = require("../util/findFiles");
const bibtexParse = require('@orcid/bibtex-parse-js');
exports.BibtexProvider = {
    provideCompletionItems,
};
async function provideCompletionItems(document, position) {
    const context = (0, createContext_1.createContext)(document, position);
    return shouldProvide(context) ? provide(context) : Promise.resolve([]);
}
exports.provideCompletionItems = provideCompletionItems;
/**
 * Checks if we should provide any CompletionItems
 * @param context
 */
function shouldProvide(context) {
    const keyword = 'citenp:';
    // Check if cursor is after citenp:
    const occurence = context.textFullLine.indexOf(keyword, context.position.character - keyword.length);
    return occurence === context.position.character - keyword.length;
}
async function getCitationKeys() {
    const files = await (0, findFiles_1.findFiles)('*.bib');
    const filesContent = files.map((file) => (0, fs_1.readFileSync)(file.path).toString('utf-8'));
    const bibtexJson = filesContent.map((content) => bibtexParse.toJSON(content));
    const flatMap = (f, xs) => xs.reduce((r, x) => r.concat(f(x)), []);
    return flatMap((jsons) => jsons.map((entries) => entries.citationKey), bibtexJson);
}
/**
 * Provide Completion Items
 */
async function provide(context) {
    const { textFullLine, position } = context;
    const indexOfNextWhiteSpace = textFullLine.includes(' ', position.character)
        ? textFullLine.indexOf(' ', position.character)
        : textFullLine.length;
    //Find the text between citenp: and the next whitespace character
    const bibtexSearch = textFullLine.substring(textFullLine.lastIndexOf(':', position.character + 1) + 1, indexOfNextWhiteSpace);
    const citationKeys = await getCitationKeys();
    return citationKeys
        .filter((citationKeys) => citationKeys.match(bibtexSearch))
        .map((citationKey) => ({
        label: `[${citationKey}]`,
        kind: vscode.CompletionItemKind.Reference,
    }));
}
//# sourceMappingURL=bibtex.provider.js.map