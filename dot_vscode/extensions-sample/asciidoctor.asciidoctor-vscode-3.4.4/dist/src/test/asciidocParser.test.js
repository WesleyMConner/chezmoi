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
const assert = __importStar(require("assert"));
require("mocha");
const vscode = __importStar(require("vscode"));
const helper_1 = require("./helper");
const asciidocEngine_1 = require("../asciidocEngine");
const asciidoctorConfig_1 = require("../features/asciidoctorConfig");
const asciidoctorExtensions_1 = require("../features/asciidoctorExtensions");
const asciidoctorDiagnostic_1 = require("../features/asciidoctorDiagnostic");
const security_1 = require("../security");
const inMemoryDocument_1 = require("./inMemoryDocument");
const workspaceHelper_1 = require("./workspaceHelper");
class TestWebviewResourceProvider {
    constructor() {
        this.cspSource = 'cspSource';
    }
    asWebviewUri(resource) {
        return vscode.Uri.file(resource.path);
    }
    asMediaWebViewSrc(...pathSegments) {
        return pathSegments.toString();
    }
}
class EmptyAsciidocContributions {
    constructor() {
        this.previewScripts = [];
        this.previewStyles = [];
        this.previewResourceRoots = [];
    }
}
class AsciidocContributionProviderTest {
    constructor(extensionUri) {
        this.contributions = new EmptyAsciidocContributions();
        this.extensionUri = extensionUri;
    }
    dispose() {
        // noop
    }
}
suite('AsciiDoc parser with Antora support enabled', function () {
    this.timeout(60000);
    test('convert Antora page', async () => {
        const createdFiles = [];
        try {
            createdFiles.push(await (0, workspaceHelper_1.createDirectory)('docs'));
            await (0, workspaceHelper_1.createFile)(`name: "antora"
version: "1.1.1"
title: Antora
asciidoc:
  attributes:
    url-vscode-marketplace: https://marketplace.visualstudio.com/vscode
`, 'docs', 'antora.yml');
            const asciidocFile = await (0, workspaceHelper_1.createFile)('', 'docs', 'modules', 'ROOT', 'pages', 'index.adoc'); // virtual
            await (0, workspaceHelper_1.enableAntoraSupport)();
            const asciidocParser = new asciidocEngine_1.AsciidocEngine(new AsciidocContributionProviderTest(helper_1.extensionContext.extensionUri), new asciidoctorConfig_1.AsciidoctorConfig(), new asciidoctorExtensions_1.AsciidoctorExtensions(security_1.AsciidoctorExtensionsSecurityPolicyArbiter.activate(helper_1.extensionContext)), new asciidoctorDiagnostic_1.AsciidoctorDiagnostic('test'));
            const result = await asciidocParser.convertFromTextDocument(new inMemoryDocument_1.InMemoryDocument(asciidocFile, 'Download from the {url-vscode-marketplace}[Visual Studio Code Marketplace].'), helper_1.extensionContext, new TestWebviewResourceProvider());
            assert.strictEqual(result.html.includes('<p>Download from the <a href="https://marketplace.visualstudio.com/vscode" data-href="https://marketplace.visualstudio.com/vscode">Visual Studio Code Marketplace</a>.</p>'), true);
        }
        finally {
            await (0, workspaceHelper_1.removeFiles)(createdFiles);
            await (0, workspaceHelper_1.resetAntoraSupport)();
        }
    });
});
//# sourceMappingURL=asciidocParser.test.js.map