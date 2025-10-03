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
const antoraCompletionProvider_1 = __importDefault(require("../features/antora/antoraCompletionProvider"));
const vscode_1 = require("vscode");
const workspaceHelper_1 = require("./workspaceHelper");
suite('Antora CompletionsProvider', () => {
    const createdFiles = [];
    suiteSetup(async () => {
        createdFiles.push(await (0, workspaceHelper_1.createDirectory)('docs'));
        await (0, workspaceHelper_1.createFile)(`name: "api"
version: "1.0"
title: Antora
asciidoc:
  attributes:
    source-language: asciidoc@
    xrefstyle: short@
    example-caption: false
`, 'docs', 'api', 'antora.yml');
        createdFiles.push(await (0, workspaceHelper_1.createFile)('', 'help.adoc'));
        const asciidocFile = await (0, workspaceHelper_1.createFile)(`image::images/ocean/waves/seaswell.png[]

image::images/mountain.jpeg[]

link:help.adoc[]
`, 'asciidoctorWebViewConverterTest.adoc');
        createdFiles.push(asciidocFile);
    });
    suiteTeardown(async () => {
        await (0, workspaceHelper_1.removeFiles)(createdFiles);
    });
    test('Should return completion items', async () => {
        try {
            const provider = new antoraCompletionProvider_1.default();
            const file = await (0, workspaceHelper_1.createFile)(`= JWT Token

`, 'docs', 'api', 'modules', 'auth', 'pages', 'jwt', 'index.adoc');
            const textDocument = await vscode.workspace.openTextDocument(file);
            await (0, workspaceHelper_1.enableAntoraSupport)();
            const completionsItems = await provider.provideCompletionItems(textDocument, new vscode_1.Position(2, 1));
            assert_1.default.deepStrictEqual(completionsItems[0].label, {
                description: 'asciidoc@',
                label: 'source-language',
            });
            assert_1.default.strictEqual(completionsItems[0].insertText, '{asciidoc@}');
            assert_1.default.deepStrictEqual(completionsItems[1].label, {
                description: 'short@',
                label: 'xrefstyle',
            });
            assert_1.default.strictEqual(completionsItems[1].insertText, '{short@}');
            assert_1.default.deepStrictEqual(completionsItems[2].label, {
                description: false,
                label: 'example-caption',
            });
            assert_1.default.strictEqual(completionsItems[2].insertText, '{false}');
        }
        finally {
            await (0, workspaceHelper_1.resetAntoraSupport)();
        }
    });
});
//# sourceMappingURL=antoraCompletionProvider.test.js.map