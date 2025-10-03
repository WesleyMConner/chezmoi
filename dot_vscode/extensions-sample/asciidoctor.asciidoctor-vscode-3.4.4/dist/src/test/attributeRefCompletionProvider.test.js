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
const vscode_1 = require("vscode");
const assert_1 = __importDefault(require("assert"));
const attributeReferenceProvider_1 = require("../features/attributeReferenceProvider");
const workspaceHelper_1 = require("./workspaceHelper");
const asciidocLoader_1 = require("../asciidocLoader");
const asciidoctorConfig_1 = require("../features/asciidoctorConfig");
const asciidoctorExtensions_1 = require("../features/asciidoctorExtensions");
const asciidoctorDiagnostic_1 = require("../features/asciidoctorDiagnostic");
const helper_1 = require("./helper");
const security_1 = require("../security");
function filterByLabel(label) {
    return (item) => {
        if (item.label) {
            return item.label.label === label;
        }
        return false;
    };
}
async function findCompletionItems(uri, position, filter) {
    const textDocument = await vscode.workspace.openTextDocument(uri);
    const asciidocLoader = new asciidocLoader_1.AsciidocLoader(new asciidoctorConfig_1.AsciidoctorConfig(), new asciidoctorExtensions_1.AsciidoctorExtensions(security_1.AsciidoctorExtensionsSecurityPolicyArbiter.activate(helper_1.extensionContext)), new asciidoctorDiagnostic_1.AsciidoctorDiagnostic('test'), helper_1.extensionContext);
    const completionsItems = await new attributeReferenceProvider_1.AttributeReferenceProvider(asciidocLoader).provideCompletionItems(textDocument, position);
    if (filter) {
        return completionsItems.filter(filter);
    }
    return completionsItems;
}
suite('Attribute ref CompletionsProvider', () => {
    let createdFiles = [];
    teardown(async () => {
        for (const createdFile of createdFiles) {
            await vscode.workspace.fs.delete(createdFile);
        }
        createdFiles = [];
    });
    test('Should return attribute key defined in same file', async () => {
        const fileToAutoComplete = await (0, workspaceHelper_1.createFile)(`:my-attribute-to-find-in-completion: dummy value
`, 'fileToAutoComplete-attributeRef-samefile.adoc');
        createdFiles.push(fileToAutoComplete);
        const items = await findCompletionItems(fileToAutoComplete, new vscode_1.Position(1, 0), filterByLabel('my-attribute-to-find-in-completion'));
        const completionItem = items[0];
        assert_1.default.deepStrictEqual(completionItem.label.description, 'dummy value');
        assert_1.default.deepStrictEqual(completionItem.insertText, '{my-attribute-to-find-in-completion}');
    });
    test('Should return attribute key defined in same file corresponding to its value', async () => {
        const fileToAutoComplete = await (0, workspaceHelper_1.createFile)(`:my-attribute-to-find-in-completion: dummy value
dumm`, 'fileToAutoComplete-attributeRef.adoc');
        createdFiles.push(fileToAutoComplete);
        const items = await findCompletionItems(fileToAutoComplete, new vscode_1.Position(1, 3), filterByLabel('my-attribute-to-find-in-completion'));
        const completionItem = items[0];
        assert_1.default.deepStrictEqual(completionItem.label.description, 'dummy value');
        assert_1.default.deepStrictEqual(completionItem.insertText, '{my-attribute-to-find-in-completion}');
    });
    test('Should return no completion when nothing corresponds', async () => {
        const fileToAutoComplete = await (0, workspaceHelper_1.createFile)(`:my-attribute-to-find-in-completion: dummy value
somethingVeryDifferent`, 'fileToAutoComplete-attributeRef-samefile-basedOnValue.adoc');
        createdFiles.push(fileToAutoComplete);
        const items = await findCompletionItems(fileToAutoComplete, new vscode_1.Position(1, 22));
        assert_1.default.notStrictEqual(items.length, 0, 'There are completion provided although none are expected.');
    });
    test('Should return an attribute defined in another file', async () => {
        const fileToAutoComplete = await (0, workspaceHelper_1.createFile)(`= test
include::file-referenced-with-an-attribute.adoc[]


    `, 'fileToAutoComplete-attributeRef-differentFile.adoc');
        createdFiles.push(fileToAutoComplete);
        const fileReferencedWithAnAttribute = await (0, workspaceHelper_1.createFile)(':my-attribute-to-find-in-completion: dummy value', 'file-referenced-with-an-attribute.adoc');
        createdFiles.push(fileReferencedWithAnAttribute);
        const items = await findCompletionItems(fileToAutoComplete, new vscode_1.Position(3, 0), filterByLabel('my-attribute-to-find-in-completion'));
        const completionItem = items[0];
        assert_1.default.deepStrictEqual(completionItem.label.description, 'dummy value');
        assert_1.default.deepStrictEqual(completionItem.insertText, '{my-attribute-to-find-in-completion}');
    });
    test('Should disable auto-completion on literal paragraph', async () => {
        const fileToAutoComplete = await (0, workspaceHelper_1.createFile)(`= test
:fn-type: pure

 function foo() {

The above function is {
    `, 'disable-autocompletion-literal-paragraph.adoc');
        createdFiles.push(fileToAutoComplete);
        let items = await findCompletionItems(fileToAutoComplete, new vscode_1.Position(3, 17));
        assert_1.default.deepStrictEqual(items.length, 0, 'should not provide attributes completion on literal paragraphs.');
        items = await findCompletionItems(fileToAutoComplete, new vscode_1.Position(5, 1));
        assert_1.default.deepStrictEqual(items.length > 0, true, 'should provide attribute completion on paragraphs.');
    });
    test('Should disable auto-completion on verbatim blocks', async () => {
        const fileToAutoComplete = await (0, workspaceHelper_1.createFile)(`= test
:app-version: 1.2.3

----
function foo() {
----

[listing]
function foo() {

....
function foo() {
  function bar() {
}
....

[literal]
function foo() {

[source,xml,subs=+attributes]
----
<dependency>
  <groupId>org.asciidoctor</groupId>
  <artifactId>asciidoctor-vscode</artifactId>
  <version>{</version>
</dependency>
----

Install version {
    `, 'disable-autocompletion-verbatim-blocks.adoc');
        createdFiles.push(fileToAutoComplete);
        let completionsItems = await findCompletionItems(fileToAutoComplete, new vscode_1.Position(4, 16));
        assert_1.default.deepStrictEqual(completionsItems.length, 0, 'should not provide attributes completion on source blocks.');
        completionsItems = await findCompletionItems(fileToAutoComplete, new vscode_1.Position(8, 16));
        assert_1.default.deepStrictEqual(completionsItems.length, 0, 'should not provide attributes completion on listing blocks.');
        completionsItems = await findCompletionItems(fileToAutoComplete, new vscode_1.Position(12, 18));
        assert_1.default.deepStrictEqual(completionsItems.length, 0, 'should not provide attributes completion on listing blocks (indented).');
        completionsItems = await findCompletionItems(fileToAutoComplete, new vscode_1.Position(17, 16));
        assert_1.default.deepStrictEqual(completionsItems.length, 0, 'should not provide attributes completion on literal blocks.');
        completionsItems = await findCompletionItems(fileToAutoComplete, new vscode_1.Position(24, 12));
        assert_1.default.deepStrictEqual(completionsItems.length > 0, true, 'should provide attribute completion verbatim blocks with attributes subs.');
        completionsItems = await findCompletionItems(fileToAutoComplete, new vscode_1.Position(28, 17));
        assert_1.default.deepStrictEqual(completionsItems.length > 0, true, 'should provide attribute completion on paragraphs.');
    });
    test('Should return an attribute defined in .asciidoctorconfig', async () => {
        const fileToAutoComplete = await (0, workspaceHelper_1.createFile)(`= test

{
    `, 'autocompletion-from-asciidoctorconfig.adoc');
        createdFiles.push(fileToAutoComplete);
        const asciidoctorConfigFile = await (0, workspaceHelper_1.createFile)(':attribute-defined-in-asciidoctorconfig: dummy value', '.asciidoctorconfig');
        createdFiles.push(asciidoctorConfigFile);
        const completionsItems = await findCompletionItems(fileToAutoComplete, new vscode_1.Position(3, 2), filterByLabel('attribute-defined-in-asciidoctorconfig'));
        const completionItem = completionsItems[0];
        assert_1.default.deepStrictEqual(completionItem.label.description, 'dummy value');
        assert_1.default.deepStrictEqual(completionItem.insertText, '{attribute-defined-in-asciidoctorconfig}');
    });
    test('Should return an attribute defined in the plugin configuration', async () => {
        try {
            const asciidocPreviewConfig = vscode.workspace.getConfiguration('asciidoc.preview', null);
            await asciidocPreviewConfig.update('asciidoctorAttributes', {
                'attribute-defined-in-config': 'dummy value',
            });
            const fileToAutoComplete = await (0, workspaceHelper_1.createFile)(`= test

{
    `, 'autocompletion-from-plugin-configuration.adoc');
            createdFiles.push(fileToAutoComplete);
            const completionsItems = await findCompletionItems(fileToAutoComplete, new vscode_1.Position(3, 2), filterByLabel('attribute-defined-in-config'));
            const completionItem = completionsItems[0];
            assert_1.default.deepStrictEqual(completionItem.label.description, 'dummy value');
            assert_1.default.deepStrictEqual(completionItem.insertText, '{attribute-defined-in-config}');
        }
        finally {
            await vscode.workspace.getConfiguration('asciidoc.preview', null).update('asciidoctorAttributes', undefined);
        }
    });
    test('Should return an attribute defined in another file (target contains an attribute reference)', async () => {
        try {
            const asciidocPreviewConfig = vscode.workspace.getConfiguration('asciidoc.preview', null);
            await asciidocPreviewConfig.update('asciidoctorAttributes', {
                'include-target': 'attributes',
            });
            const fileToAutoComplete = await (0, workspaceHelper_1.createFile)(`= test
include::autocompletion-{include-target}.adoc[]

{
    `, 'autocompletion-from-include-file-target-attrs.adoc');
            createdFiles.push(fileToAutoComplete);
            const fileReferencedWithAnAttribute = await (0, workspaceHelper_1.createFile)(':foo: bar', 'autocompletion-attributes.adoc');
            createdFiles.push(fileReferencedWithAnAttribute);
            const completionsItems = await findCompletionItems(fileToAutoComplete, new vscode_1.Position(4, 2), filterByLabel('foo'));
            const completionItem = completionsItems[0];
            assert_1.default.deepStrictEqual(completionItem.label.description, 'bar');
            assert_1.default.deepStrictEqual(completionItem.insertText, '{foo}');
        }
        finally {
            await vscode.workspace.getConfiguration('asciidoc.preview', null).update('asciidoctorAttributes', undefined);
        }
    });
});
//# sourceMappingURL=attributeRefCompletionProvider.test.js.map