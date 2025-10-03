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
const assert = __importStar(require("assert"));
require("mocha");
const vscode = __importStar(require("vscode"));
const documentLinkProvider_1 = __importDefault(require("../features/documentLinkProvider"));
const inMemoryDocument_1 = require("./inMemoryDocument");
const asciidocLoader_1 = require("../asciidocLoader");
const asciidoctorIncludeItems_1 = require("../features/asciidoctorIncludeItems");
const asciidoctorConfig_1 = require("../features/asciidoctorConfig");
const asciidoctorExtensions_1 = require("../features/asciidoctorExtensions");
const asciidoctorDiagnostic_1 = require("../features/asciidoctorDiagnostic");
const helper_1 = require("./helper");
const security_1 = require("../security");
const noopToken = new class {
    constructor() {
        this._onCancellationRequestedEmitter = new vscode.EventEmitter();
        this.onCancellationRequested = this._onCancellationRequestedEmitter.event;
    }
    get isCancellationRequested() { return false; }
}();
async function getLinksForFile(fileContents, testFileName) {
    const doc = new inMemoryDocument_1.InMemoryDocument(testFileName || vscode.Uri.file('test.adoc'), fileContents);
    const provider = new documentLinkProvider_1.default(new asciidocLoader_1.AsciidocIncludeItemsLoader(new asciidoctorIncludeItems_1.AsciidoctorIncludeItems(), new asciidoctorConfig_1.AsciidoctorConfig(), new asciidoctorExtensions_1.AsciidoctorExtensions(security_1.AsciidoctorExtensionsSecurityPolicyArbiter.activate(helper_1.extensionContext)), new asciidoctorDiagnostic_1.AsciidoctorDiagnostic('test'), helper_1.extensionContext));
    return provider.provideDocumentLinks(doc, noopToken);
}
function assertRangeEqual(expected, actual) {
    assert.strictEqual(expected.start.line, actual.start.line);
    assert.strictEqual(expected.start.character, actual.start.character);
    assert.strictEqual(expected.end.line, actual.end.line);
    assert.strictEqual(expected.end.character, actual.end.character);
}
suite('asciidoc.DocumentLinkProvider', async () => {
    test('Should not return anything for empty document', async () => {
        const links = await getLinksForFile('');
        assert.strictEqual(links.length, 0);
    });
    test('Should not return anything for simple document without include', async () => {
        const links = await getLinksForFile(`= a

b

c`);
        assert.strictEqual(links.length, 0);
    });
    test('Should detect basic include', async () => {
        const links = await getLinksForFile(`a

include::b.adoc[]

c`);
        assert.strictEqual(links.length, 1);
        const [link] = links;
        assertRangeEqual(link.range, new vscode.Range(2, 9, 2, 15));
    });
    test('Should detect basic workspace include', async () => {
        {
            const links = await getLinksForFile(`a

include::./b.adoc[]

c`);
            assert.strictEqual(links.length, 1);
            const [link] = links;
            assertRangeEqual(link.range, new vscode.Range(2, 9, 2, 17));
        }
        {
            const links = await getLinksForFile(`a

[source,ruby]
----
include::core.rb[tag=parse]
----

b
`);
            assert.strictEqual(links.length, 1);
            const [link] = links;
            assertRangeEqual(link.range, new vscode.Range(4, 9, 4, 16));
        }
    });
    test('Should detect inline anchor using [[idname]] syntax and xref', async () => {
        const links = await getLinksForFile(`= Title

[[first-section]]
== Section Title

Paragraph.

== Second Section Title

See xref:test.adoc#first-section[]
`);
        assert.strictEqual(links.length, 1);
        const [link] = links;
        assert.strictEqual(link.target.scheme, 'command');
        assert.deepStrictEqual(link.target.path, '_asciidoc.openDocumentLink');
        assert.strictEqual(link.target.query, JSON.stringify({
            path: 'test.adoc',
            fragment: 'L3',
        }));
        assertRangeEqual(link.range, new vscode.Range(9, 9, 9, 32));
    });
    test('Should detect xref and inline anchor using [[idname]] syntax', async () => {
        const links = await getLinksForFile(`= Title

[[first-section]]
== Section Title

Paragraph.
See xref:test.adoc#second-section[]

[[second-section]]
== Second Section Title

`);
        assert.strictEqual(links.length, 1);
        const [link] = links;
        assert.strictEqual(link.target.scheme, 'command');
        assert.deepStrictEqual(link.target.path, '_asciidoc.openDocumentLink');
        assert.strictEqual(link.target.query, JSON.stringify({
            path: 'test.adoc',
            fragment: 'L9',
        }));
        assertRangeEqual(link.range, new vscode.Range(6, 9, 6, 33));
    });
    test('Should detect inline URL', async () => {
        const links = await getLinksForFile(`= Title

You can refer to a URL such as https://github.com/asciidoctor/asciidoctor-vscode/, and continue the sentence or the paragraph.

`);
        assert.strictEqual(links.length, 1);
        const [link] = links;
        assert.deepStrictEqual(link.target.toString(), 'https://github.com/asciidoctor/asciidoctor-vscode/');
        assertRangeEqual(link.range, new vscode.Range(2, 31, 2, 81));
    });
    test('Should detect inline URL within square brackets', async () => {
        const links = await getLinksForFile(`= Title

Filters are created as RPN filters (Reverse Polish notation [https://wikipedia.org/wiki/Reverse_Polish_notation]) with the following syntax...

`);
        assert.strictEqual(links.length, 1);
        const [link] = links;
        assert.deepStrictEqual(link.target.toString(), 'https://wikipedia.org/wiki/Reverse_Polish_notation');
        assertRangeEqual(link.range, new vscode.Range(2, 61, 2, 111));
    });
    test('Should detect inline URL within angle brackets', async () => {
        const links = await getLinksForFile(`= Title

Asciidoctor.js is published as a npm package at <https://www.npmjs.com/package/@asciidoctor/core>.

`);
        assert.strictEqual(links.length, 1);
        const [link] = links;
        assert.deepStrictEqual(link.target.toString(true), 'https://www.npmjs.com/package/@asciidoctor/core');
        assertRangeEqual(link.range, new vscode.Range(2, 49, 2, 96));
    });
});
//# sourceMappingURL=documentLinkProvider.test.js.map