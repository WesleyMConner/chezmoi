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
require("mocha");
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const security_1 = require("../security");
const helper_1 = require("./helper");
const asciidocEngine_1 = require("../asciidocEngine");
const asciidoctorConfig_1 = require("../features/asciidoctorConfig");
const asciidoctorExtensions_1 = require("../features/asciidoctorExtensions");
const asciidoctorDiagnostic_1 = require("../features/asciidoctorDiagnostic");
const workspaceHelper_1 = require("./workspaceHelper");
const workspace_1 = require("../util/workspace");
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
class TestWebviewResourceProvider {
    constructor() {
        this.cspSource = 'aaaa';
    }
    asWebviewUri(resource) {
        return resource;
    }
    asMediaWebViewSrc(...pathSegments) {
        return pathSegments.toString();
    }
}
suite('asciidoc.Asciidoctorconfig', () => {
    let createdFiles = [];
    teardown(async () => {
        for (const createdFile of createdFiles) {
            await vscode.workspace.fs.delete(createdFile);
        }
        createdFiles = [];
    });
    const configFileNames = ['.asciidoctorconfig', '.asciidoctorconfig.adoc'];
    configFileNames.forEach((configFileName) => {
        test(`Pick up ${configFileName} from root workspace folder`, async () => {
            const configFile = await (0, workspaceHelper_1.createFile)(':application-name: Asciidoctor VS Code Extension', '.asciidoctorconfig');
            createdFiles.push(configFile);
            const textDocument = await (0, workspaceHelper_1.createFile)('= {application-name}', 'attribute-defined-in-asciidoctorconfig.adoc');
            createdFiles.push(textDocument);
            const asciidocParser = new asciidocEngine_1.AsciidocEngine(new AsciidocContributionProviderTest(helper_1.extensionContext.extensionUri), new asciidoctorConfig_1.AsciidoctorConfig(), new asciidoctorExtensions_1.AsciidoctorExtensions(security_1.AsciidoctorExtensionsSecurityPolicyArbiter.activate(helper_1.extensionContext)), new asciidoctorDiagnostic_1.AsciidoctorDiagnostic('test'));
            const { html } = await asciidocParser.convertFromUri(textDocument, helper_1.extensionContext, new TestWebviewResourceProvider());
            assert.strictEqual(html.includes('<h1>Asciidoctor VS Code Extension</h1>'), true, `{application-name} should be substituted by the value defined in ${configFileName}`);
        });
    });
    suite('Pick up .asciidoctorconfig and .asciidoctorconfig.adoc from root workspace folder', async () => {
        let html;
        const createdFiles = [];
        suiteSetup(async () => {
            const workspaceUri = (0, workspace_1.getDefaultWorkspaceFolderUri)();
            createdFiles.push(await createFileWithContentAtWorkspaceRoot(workspaceUri, '.asciidoctorconfig', `:var-only-in-asciidoctorconfig: From .asciidoctorconfig
:var-in-both: var-in-both value from .asciidoctorconfig`));
            createdFiles.push(await createFileWithContentAtWorkspaceRoot(workspaceUri, '.asciidoctorconfig.adoc', `:var-only-in-asciidoctorconfig-adoc: From .asciidoctorconfig.adoc
:var-in-both: var-in-both value from .asciidoctorconfig.adoc`));
            const adocForTest = await createFileWithContentAtWorkspaceRoot(workspaceUri, 'test-pickup-both-asciidoctorconfig-at-workspace-root.adoc', `{var-in-both}

{var-only-in-asciidoctorconfig-adoc}

{var-only-in-asciidoctorconfig}`);
            createdFiles.push(adocForTest);
            const textDocument = await vscode.workspace.openTextDocument(adocForTest);
            const asciidocParser = new asciidocEngine_1.AsciidocEngine(new AsciidocContributionProviderTest(helper_1.extensionContext.extensionUri), new asciidoctorConfig_1.AsciidoctorConfig(), new asciidoctorExtensions_1.AsciidoctorExtensions(security_1.AsciidoctorExtensionsSecurityPolicyArbiter.activate(helper_1.extensionContext)), new asciidoctorDiagnostic_1.AsciidoctorDiagnostic('test'));
            html = (await asciidocParser.convertFromTextDocument(textDocument, helper_1.extensionContext, new TestWebviewResourceProvider())).html;
        });
        suiteTeardown(async () => {
            for (const createdFile of createdFiles) {
                await vscode.workspace.fs.delete(createdFile);
            }
        });
        test('Var from .asciidocforconfig is used', async () => {
            assert.strictEqual(html.includes('<p>From .asciidoctorconfig</p>'), true, '{var-only-in-asciidoctorconfig} should be substituted by the value defined in .asciidoctorconfig');
        });
        test('Var from .asciidocforconfig.adoc is used', async () => {
            assert.strictEqual(html.includes('<p>From .asciidoctorconfig.adoc</p>'), true, '{var-only-in-asciidoctorconfig.adoc} should be substituted by the value defined in .asciidoctorconfig.adoc');
        });
        test('Var from .asciidocforconfig.adoc has precedence on .asciidoctorconfig.adoc', async () => {
            assert.strictEqual(html.includes('<p>var-in-both value from .asciidoctorconfig.adoc</p>'), true, '{var-in-both} should be substituted by the value defined in .asciidoctorconfig.adoc');
        });
        async function createFileWithContentAtWorkspaceRoot(workspaceUri, configFileName, fileContent) {
            const configFile = vscode.Uri.joinPath(workspaceUri, configFileName);
            await vscode.workspace.fs.writeFile(configFile, Buffer.from(fileContent));
            return configFile;
        }
    });
    suite('Pick up .asciidocConfig file recursively', async () => {
        let html;
        const createdFiles = [];
        suiteSetup(async () => {
            const workspaceUri = (0, workspace_1.getDefaultWorkspaceFolderUri)();
            const configFileName = '.asciidoctorconfig';
            const rootConfigFile = vscode.Uri.joinPath(workspaceUri, configFileName);
            await vscode.workspace.fs.writeFile(rootConfigFile, Buffer.from(`:only-root: Only root. Should appear.
:root-and-level1: Value of root-and-level1 specified in root. Should not appear.
:root-and-level1-and-level2: Value of root-and-level1-and-level2 specified in root. Should not appear.`));
            createdFiles.push(rootConfigFile);
            createdFiles.push(await (0, workspaceHelper_1.createDirectory)('level-empty'));
            await (0, workspaceHelper_1.createFile)(`:only-level1: Only level 1. Should appear.
:root-and-level1: Value of root-and-level1 specified in level1. Should appear.
:root-and-level1-and-level2: Value of root-and-level1-and-level2 specified in level1. Should not appear.`, 'level-empty', 'level1', configFileName);
            await (0, workspaceHelper_1.createFile)(`:only-level2: Only level 2. Should appear.
:root-and-level1-and-level2: Value of root-and-level1-and-level2 specified in level2. Should appear.`, 'level-empty', 'level1', 'level2', configFileName);
            const adocFile = await (0, workspaceHelper_1.createFile)(`{only-root}

{only-level1}

{only-level2}

{root-and-level1}

{root-and-level1-and-level2}
              `, 'level-empty', 'level1', 'level2', 'fileToTestRecursiveAsciidoctorConfigs.adoc');
            const textDocument = await vscode.workspace.openTextDocument(adocFile);
            const asciidocParser = new asciidocEngine_1.AsciidocEngine(new AsciidocContributionProviderTest(helper_1.extensionContext.extensionUri), new asciidoctorConfig_1.AsciidoctorConfig(), new asciidoctorExtensions_1.AsciidoctorExtensions(security_1.AsciidoctorExtensionsSecurityPolicyArbiter.activate(helper_1.extensionContext)), new asciidoctorDiagnostic_1.AsciidoctorDiagnostic('test'));
            html = (await asciidocParser.convertFromTextDocument(textDocument, helper_1.extensionContext, new TestWebviewResourceProvider())).html;
        });
        suiteTeardown(async () => {
            await (0, workspaceHelper_1.removeFiles)(createdFiles);
        });
        test('Var from root level is substituted', async () => {
            assert.strictEqual(html.includes('<p>Only root. Should appear.</p>'), true, '{only-root} should be substituted by the value defined at root level');
        });
        test('Var from level1 is substituted', async () => {
            assert.strictEqual(html.includes('<p>Only level 1. Should appear.</p>'), true, '{only-level1} should be substituted by the value defined at level 1');
        });
        test('Var from level2 is substituted', async () => {
            assert.strictEqual(html.includes('<p>Only level 2. Should appear.</p>'), true, '{only-level2} should be substituted by the value defined at level 2');
        });
        test('Deepest level should be use to substitue var', async () => {
            assert.strictEqual(html.includes('<p>Value of root-and-level1-and-level2 specified in level2. Should appear.</p>'), true, '{root-and-level1-and-level2} should be substituted by the value defined at level 2');
        });
        test('Intermediate but deepest level defined should be use to substitue var', async () => {
            assert.strictEqual(html.includes('<p>Value of root-and-level1 specified in level1. Should appear.</p>'), true, '{root-and-level1} should be substituted by the value defined at level 1');
        });
    });
});
//# sourceMappingURL=asciidoctorconfig.test.js.map