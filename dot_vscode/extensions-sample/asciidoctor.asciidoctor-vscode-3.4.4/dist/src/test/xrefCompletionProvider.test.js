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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
const vscode = __importStar(require("vscode"));
const assert_1 = __importDefault(require("assert"));
const xref_provider_1 = require("../providers/xref.provider");
const vscode_1 = require("vscode");
const workspace_1 = require("../util/workspace");
let workspaceUri;
suite('Xref CompletionsProvider', () => {
    let createdFiles = [];
    setup(() => {
        workspaceUri = (0, workspace_1.getDefaultWorkspaceFolderUri)();
    });
    teardown(async () => {
        for (const createdFile of createdFiles) {
            await vscode.workspace.fs.delete(createdFile);
        }
        createdFiles = [];
    });
    test('Should return other ids from old style double-brackets as completion after "xref:"', async () => {
        const fileToAutoComplete = vscode.Uri.joinPath(workspaceUri, 'fileToAutoComplete.adoc');
        await vscode.workspace.fs.writeFile(fileToAutoComplete, Buffer.from('xref:'));
        createdFiles.push(fileToAutoComplete);
        const fileThatShouldAppearInAutoComplete = vscode.Uri.joinPath(workspaceUri, 'fileToAppearInAutoComplete.adoc');
        await vscode.workspace.fs.writeFile(fileThatShouldAppearInAutoComplete, Buffer.from('[[anOldStyleID]]'));
        createdFiles.push(fileThatShouldAppearInAutoComplete);
        const file = await vscode.workspace.openTextDocument(fileToAutoComplete);
        const completionsItems = await xref_provider_1.xrefProvider.provideCompletionItems(file, new vscode_1.Position(0, 5));
        const filteredCompletionItems = completionsItems.filter((completionItem) => completionItem.label === 'fileToAppearInAutoComplete.adoc#anOldStyleID[]');
        assert_1.default.deepStrictEqual(filteredCompletionItems[0], new vscode.CompletionItem('fileToAppearInAutoComplete.adoc#anOldStyleID[]', vscode.CompletionItemKind.Reference));
    });
    test('Should return ids declared using the shorthand syntax as completion after "xref:"', async () => {
        const fileToAutoComplete = vscode.Uri.joinPath(workspaceUri, 'fileToAutoComplete.adoc');
        await vscode.workspace.fs.writeFile(fileToAutoComplete, Buffer.from('xref:'));
        createdFiles.push(fileToAutoComplete);
        const fileThatShouldAppearInAutoComplete = vscode.Uri.joinPath(workspaceUri, 'fileToAppearInAutoComplete.adoc');
        await vscode.workspace.fs.writeFile(fileThatShouldAppearInAutoComplete, Buffer.from('[#aShortHandID]'));
        createdFiles.push(fileThatShouldAppearInAutoComplete);
        const file = await vscode.workspace.openTextDocument(fileToAutoComplete);
        const completionsItems = await xref_provider_1.xrefProvider.provideCompletionItems(file, new vscode_1.Position(0, 5));
        const filteredCompletionItems = completionsItems.filter((completionItem) => completionItem.label === 'fileToAppearInAutoComplete.adoc#aShortHandID[]');
        assert_1.default.deepStrictEqual(filteredCompletionItems[0], new vscode.CompletionItem('fileToAppearInAutoComplete.adoc#aShortHandID[]', vscode.CompletionItemKind.Reference));
    });
    test('Should return ids declared using the longhand syntax as completion after "xref:" from other document', async () => {
        const fileToAutoComplete = vscode.Uri.joinPath(workspaceUri, 'fileToAutoComplete.adoc');
        await vscode.workspace.fs.writeFile(fileToAutoComplete, Buffer.from('xref:'));
        createdFiles.push(fileToAutoComplete);
        const fileThatShouldAppearInAutoComplete = vscode.Uri.joinPath(workspaceUri, 'fileToAppearInAutoComplete.adoc');
        await vscode.workspace.fs.writeFile(fileThatShouldAppearInAutoComplete, Buffer.from('[id=longHandID]'));
        createdFiles.push(fileThatShouldAppearInAutoComplete);
        const file = await vscode.workspace.openTextDocument(fileToAutoComplete);
        const completionsItems = await xref_provider_1.xrefProvider.provideCompletionItems(file, new vscode_1.Position(0, 5));
        const filteredCompletionItems = completionsItems.filter((completionItem) => completionItem.label === 'fileToAppearInAutoComplete.adoc#longHandID[]');
        assert_1.default.deepStrictEqual(filteredCompletionItems[0], new vscode.CompletionItem('fileToAppearInAutoComplete.adoc#longHandID[]', vscode.CompletionItemKind.Reference));
    });
    test('Should return ids declared using the longhand syntax as completion after "xref:" from same document', async () => {
        const fileToAutoComplete = vscode.Uri.joinPath(workspaceUri, 'fileToAutoCompleteFromSameFile.adoc');
        await vscode.workspace.fs.writeFile(fileToAutoComplete, Buffer.from(`[id=longHandID]

xref:`));
        createdFiles.push(fileToAutoComplete);
        const file = await vscode.workspace.openTextDocument(fileToAutoComplete);
        const completionsItems = await xref_provider_1.xrefProvider.provideCompletionItems(file, new vscode_1.Position(2, 5));
        const filteredCompletionItems = completionsItems.filter((completionItem) => completionItem.label === 'longHandID[]');
        assert_1.default.deepStrictEqual(filteredCompletionItems[0], new vscode.CompletionItem('longHandID[]', vscode.CompletionItemKind.Reference));
    });
    test('Should return id for inlined anchor', async () => {
        const fileToAutoComplete = vscode.Uri.joinPath(workspaceUri, 'fileToTestXrefAutoComplete.adoc');
        await vscode.workspace.fs.writeFile(fileToAutoComplete, Buffer.from(`* [id=anInlinedAnchor]demo

xref:`));
        createdFiles.push(fileToAutoComplete);
        const file = await vscode.workspace.openTextDocument(fileToAutoComplete);
        const completionsItems = await xref_provider_1.xrefProvider.provideCompletionItems(file, new vscode_1.Position(2, 5));
        const filteredCompletionItems = completionsItems.filter((completionItem) => completionItem.label === 'anInlinedAnchor[]');
        assert_1.default.deepStrictEqual(filteredCompletionItems[0], new vscode.CompletionItem('anInlinedAnchor[]', vscode.CompletionItemKind.Reference));
    });
    test('Should return id for element in same document after <<', async () => {
        const fileToAutoComplete = vscode.Uri.joinPath(workspaceUri, 'fileToTestXrefAliasAutoComplete.adoc');
        await vscode.workspace.fs.writeFile(fileToAutoComplete, Buffer.from(`[#anIDFromSameFile]

<<`));
        createdFiles.push(fileToAutoComplete);
        const fileThatShouldntAppearInAutoComplete = vscode.Uri.joinPath(workspaceUri, 'fileToNotAppearInAutoComplete.adoc');
        await vscode.workspace.fs.writeFile(fileThatShouldntAppearInAutoComplete, Buffer.from('[#shouldNotAppear]'));
        createdFiles.push(fileThatShouldntAppearInAutoComplete);
        const file = await vscode.workspace.openTextDocument(fileToAutoComplete);
        const completionsItems = await xref_provider_1.xrefProvider.provideCompletionItems(file, new vscode_1.Position(2, 2));
        const filteredCompletionItems = completionsItems.filter((completionItem) => completionItem.label === 'anIDFromSameFile');
        assert_1.default.deepStrictEqual(filteredCompletionItems[0], {
            kind: vscode.CompletionItemKind.Reference,
            label: 'anIDFromSameFile',
            insertText: 'anIDFromSameFile>>',
        });
        assert_1.default.strictEqual(completionsItems.filter((completionItem) => completionItem.label === 'shouldNotAppear').length, 0);
    });
});
//# sourceMappingURL=xrefCompletionProvider.test.js.map