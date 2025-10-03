"use strict";
/*---------------------------------------------------------------------------------------------
  *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
require("mocha");
const tableOfContentsProvider_1 = require("../tableOfContentsProvider");
const inMemoryDocument_1 = require("./inMemoryDocument");
const workspaceHelper_1 = require("./workspaceHelper");
const asciidocLoader_1 = require("../asciidocLoader");
const asciidoctorConfig_1 = require("../features/asciidoctorConfig");
const asciidoctorExtensions_1 = require("../features/asciidoctorExtensions");
const helper_1 = require("./helper");
const security_1 = require("../security");
const asciidoctorDiagnostic_1 = require("../features/asciidoctorDiagnostic");
suite('asciidoc.TableOfContentsProvider', () => {
    let createdFiles = [];
    teardown(async () => {
        for (const createdFile of createdFiles) {
            await vscode.workspace.fs.delete(createdFile);
        }
        createdFiles = [];
    });
    test('Lookup should not return anything for empty document', async () => {
        const doc = new inMemoryDocument_1.InMemoryDocument(vscode.Uri.file('test.adoc'), '');
        const provider = new tableOfContentsProvider_1.TableOfContentsProvider(doc, new asciidocLoader_1.AsciidocLoader(new asciidoctorConfig_1.AsciidoctorConfig(), new asciidoctorExtensions_1.AsciidoctorExtensions(security_1.AsciidoctorExtensionsSecurityPolicyArbiter.activate(helper_1.extensionContext)), new asciidoctorDiagnostic_1.AsciidoctorDiagnostic('test'), helper_1.extensionContext));
        assert.strictEqual(await provider.lookup(''), undefined);
        assert.strictEqual(await provider.lookup('foo'), undefined);
    });
    test('Lookup should not return anything for document with no headers', async () => {
        const doc = new inMemoryDocument_1.InMemoryDocument(vscode.Uri.file('test.adoc'), 'a *b*\nc');
        const provider = new tableOfContentsProvider_1.TableOfContentsProvider(doc, new asciidocLoader_1.AsciidocLoader(new asciidoctorConfig_1.AsciidoctorConfig(), new asciidoctorExtensions_1.AsciidoctorExtensions(security_1.AsciidoctorExtensionsSecurityPolicyArbiter.activate(helper_1.extensionContext)), new asciidoctorDiagnostic_1.AsciidoctorDiagnostic('test'), helper_1.extensionContext));
        assert.strictEqual(await provider.lookup(''), undefined);
        assert.strictEqual(await provider.lookup('foo'), undefined);
        assert.strictEqual(await provider.lookup('a'), undefined);
        assert.strictEqual(await provider.lookup('b'), undefined);
    });
    test('Should include the document title in the TOC', async () => {
        const mainContent = `= test

content`;
        const mainFile = await (0, workspaceHelper_1.createFile)(mainContent, 'tableofcontents-main-document.adoc');
        createdFiles.push(mainFile);
        const provider = new tableOfContentsProvider_1.TableOfContentsProvider(new inMemoryDocument_1.InMemoryDocument(mainFile, mainContent), new asciidocLoader_1.AsciidocLoader(new asciidoctorConfig_1.AsciidoctorConfig(), new asciidoctorExtensions_1.AsciidoctorExtensions(security_1.AsciidoctorExtensionsSecurityPolicyArbiter.activate(helper_1.extensionContext)), new asciidoctorDiagnostic_1.AsciidoctorDiagnostic('test'), helper_1.extensionContext));
        const toc = await provider.getToc();
        const documentTitleEntry = toc.find((entry) => entry.text === 'test' && entry.line === 0);
        assert.deepStrictEqual(documentTitleEntry !== undefined, true, 'should include the document title in the TOC');
    });
    test('Should include the document title in the TOC (when using an include just below it)', async () => {
        createdFiles.push(await (0, workspaceHelper_1.createFile)(`:attr: value
`, 'tableofcontents-attrs.adoc'));
        const mainContent = `= test
include::attrs.adoc[]

content`;
        const mainFile = await (0, workspaceHelper_1.createFile)(mainContent, 'tableofcontents-main-document.adoc');
        createdFiles.push(mainFile);
        const provider = new tableOfContentsProvider_1.TableOfContentsProvider(new inMemoryDocument_1.InMemoryDocument(mainFile, mainContent), new asciidocLoader_1.AsciidocLoader(new asciidoctorConfig_1.AsciidoctorConfig(), new asciidoctorExtensions_1.AsciidoctorExtensions(security_1.AsciidoctorExtensionsSecurityPolicyArbiter.activate(helper_1.extensionContext)), new asciidoctorDiagnostic_1.AsciidoctorDiagnostic('test'), helper_1.extensionContext));
        const toc = await provider.getToc();
        const documentTitleEntry = toc.find((entry) => entry.text === 'test' && entry.line === 0);
        assert.deepStrictEqual(documentTitleEntry !== undefined, true, 'should include the document title in the TOC');
    });
    test('Should properly decode HTML entities', async () => {
        const doc = new inMemoryDocument_1.InMemoryDocument(vscode.Uri.file('test.adoc'), `= Title

== Dungeons & Dragons

== Let's do it!`);
        const provider = new tableOfContentsProvider_1.TableOfContentsProvider(doc, new asciidocLoader_1.AsciidocLoader(new asciidoctorConfig_1.AsciidoctorConfig(), new asciidoctorExtensions_1.AsciidoctorExtensions(security_1.AsciidoctorExtensionsSecurityPolicyArbiter.activate(helper_1.extensionContext)), new asciidoctorDiagnostic_1.AsciidoctorDiagnostic('test'), helper_1.extensionContext));
        const toc = await provider.getToc();
        const ddEntry = toc.find((t) => t.text === 'Dungeons & Dragons');
        assert.strictEqual(ddEntry !== null, true, 'should find an entry with title: Dungeons & Dragons');
        assert.deepStrictEqual({
            text: ddEntry.text,
            slug: ddEntry.slug.value,
        }, {
            text: 'Dungeons & Dragons',
            slug: '_dungeons_dragons',
        });
        console.log(toc.map((t) => t.text));
        const ldiEntry = toc.find((t) => t.text === 'Let’s do it!');
        assert.strictEqual(ldiEntry !== null, true, 'should find an entry with title: Let’s do it!');
        assert.deepStrictEqual({
            text: ldiEntry.text,
            slug: ldiEntry.slug.value,
        }, {
            text: 'Let’s do it!',
            slug: '_lets_do_it',
        });
    });
});
//# sourceMappingURL=tableOfContentsProvider.test.js.map