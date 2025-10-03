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
exports.provideCompletionItems = exports.xrefProvider = void 0;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const createContext_1 = require("./createContext");
const findFiles_1 = require("../util/findFiles");
exports.xrefProvider = {
    provideCompletionItems,
};
async function provideCompletionItems(document, position) {
    const context = (0, createContext_1.createContext)(document, position);
    if (shouldProvide(context, 'xref:')) {
        return provideCrossRef(context);
    }
    else if (shouldProvide(context, '<<')) {
        return provideInternalRef(context);
    }
    else {
        return Promise.resolve([]);
    }
}
exports.provideCompletionItems = provideCompletionItems;
/**
 * Checks if we should provide any CompletionItems
 * @param context
 */
function shouldProvide(context, keyword) {
    const occurence = context.textFullLine.indexOf(keyword, context.position.character - keyword.length);
    return occurence === context.position.character - keyword.length;
}
async function getIdsFromFile(file) {
    const data = await vscode.workspace.fs.readFile(file);
    const content = Buffer.from(data).toString('utf8');
    const labelsFromLegacyBlock = await getLabelsFromLegacyBlock(content);
    const labelsFromShorthandNotation = await getLabelsFromShorthandNotation(content);
    const labelsFromLonghandNotation = await getLabelsFromLonghandNotation(content);
    return labelsFromLegacyBlock.concat(labelsFromShorthandNotation, labelsFromLonghandNotation);
}
async function getLabelsFromLonghandNotation(content) {
    const regex = /\[id=(\w+)\]/g;
    const matched = content.match(regex);
    if (matched) {
        return matched.map((result) => result.replace('[id=', '').replace(']', ''));
    }
    return [];
}
async function getLabelsFromShorthandNotation(content) {
    const regex = /\[#(\w+)\]/g;
    const matched = content.match(regex);
    if (matched) {
        return matched.map((result) => result.replace('[#', '').replace(']', ''));
    }
    return [];
}
async function getLabelsFromLegacyBlock(content) {
    const regex = /\[\[(\w+)\]\]/g;
    const matched = content.match(regex);
    if (matched) {
        return matched.map((result) => result.replace('[[', '').replace(']]', ''));
    }
    return [];
}
/**
 * Provide Completion Items
 */
async function provideCrossRef(context) {
    const { textFullLine, position } = context;
    const indexOfNextWhiteSpace = textFullLine.includes(' ', position.character)
        ? textFullLine.indexOf(' ', position.character)
        : textFullLine.length;
    //Find the text between citenp: and the next whitespace character
    const search = textFullLine.substring(textFullLine.lastIndexOf(':', position.character + 1) + 1, indexOfNextWhiteSpace);
    const completionItems = [];
    const workspacesAdocFiles = await (0, findFiles_1.findFiles)('**/*.adoc');
    for (const adocFile of workspacesAdocFiles) {
        const labels = await getIdsFromFile(adocFile);
        for (const label of labels) {
            if (label.match(search)) {
                if (adocFile.fsPath === context.document.uri.fsPath) {
                    completionItems.push(new vscode.CompletionItem(label + '[]', vscode.CompletionItemKind.Reference));
                }
                else {
                    completionItems.push(new vscode.CompletionItem(path.relative(path.dirname(context.document.uri.fsPath), adocFile.fsPath) + '#' + label + '[]', vscode.CompletionItemKind.Reference));
                }
            }
        }
    }
    return completionItems;
}
async function provideInternalRef(context) {
    const { textFullLine, position, document } = context;
    const indexOfNextWhiteSpace = textFullLine.includes(' ', position.character)
        ? textFullLine.indexOf(' ', position.character)
        : textFullLine.length;
    const search = textFullLine.substring(textFullLine.lastIndexOf('<', position.character + 1) + 1, indexOfNextWhiteSpace);
    const internalRefLabels = await getIdsFromFile(document.uri);
    return internalRefLabels
        .filter((label) => label.match(search))
        .map((label) => ({
        label: `${label}`,
        kind: vscode.CompletionItemKind.Reference,
        insertText: `${label}>>`,
    }));
}
//# sourceMappingURL=xref.provider.js.map