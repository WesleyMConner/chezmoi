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
const os_1 = __importDefault(require("os"));
const vscode = __importStar(require("vscode"));
const assert = __importStar(require("assert"));
require("mocha");
const antoraDocument_1 = require("../features/antora/antoraDocument");
const workspaceHelper_1 = require("./workspaceHelper");
const helper_1 = require("./helper");
const workspace_1 = require("../util/workspace");
async function testGetAntoraConfig({ asciidocPathUri, antoraConfigExpectedUri }) {
    const antoraConfigUri = await (0, antoraDocument_1.findAntoraConfigFile)(asciidocPathUri);
    if (antoraConfigExpectedUri === undefined) {
        assert.strictEqual(antoraConfigUri, undefined);
    }
    else {
        // Windows is case-insensitive
        // https://github.com/microsoft/vscode/issues/194692
        if (os_1.default.platform() === 'win32') {
            assert.strictEqual(antoraConfigUri?.path?.toLowerCase(), antoraConfigExpectedUri?.path?.toLowerCase());
        }
        else {
            assert.strictEqual(antoraConfigUri?.path, antoraConfigExpectedUri?.path);
        }
    }
}
suite('Antora support with multi-documentation components', () => {
    const createdFiles = [];
    const testCases = [];
    suiteSetup(async () => {
        createdFiles.push(await (0, workspaceHelper_1.createDirectory)('docs'));
        // documentation component: docs/multiComponents/api
        const apiDocumentationComponentPaths = ['docs', 'multiComponents', 'api'];
        const apiAntoraPaths = [...apiDocumentationComponentPaths, 'antora.yml'];
        await (0, workspaceHelper_1.createFile)(`name: "api"
version: "1.0"
`, ...apiAntoraPaths);
        const endpointsPaths = [...apiDocumentationComponentPaths, 'modules', 'auth', 'pages', 'endpoints.adoc'];
        await (0, workspaceHelper_1.createFile)('= Endpoints', ...endpointsPaths);
        const ssoPaths = [...apiDocumentationComponentPaths, 'modules', 'auth', 'pages', '3rd-party', 'sso.adoc'];
        await (0, workspaceHelper_1.createFile)('= Single Sign On', ...ssoPaths);
        const tokenBasedPaths = [...apiDocumentationComponentPaths, 'modules', 'auth', 'pages', 'modules', 'token-based.adoc'];
        await (0, workspaceHelper_1.createFile)('= Token Based', ...tokenBasedPaths);
        const patPaths = [...apiDocumentationComponentPaths, 'modules', 'auth', 'pages', 'modules', 'token', 'pat.adoc'];
        await (0, workspaceHelper_1.createFile)('= Personal Access Token', ...patPaths);
        //await createFile('= Client Id & Client Secret', ...[...apiDocumentationComponentPaths, 'modules', 'auth', 'pages', 'modules', 'credentials', 'secret.adoc'])
        testCases.push({
            title: 'Should return Antora config for document inside a "modules" subdirectory',
            asciidocPathSegments: tokenBasedPaths,
            antoraConfigExpectedPathSegments: apiAntoraPaths,
        });
        testCases.push({
            title: 'Should return Antora config for document inside "pages" directory',
            asciidocPathSegments: endpointsPaths,
            antoraConfigExpectedPathSegments: apiAntoraPaths,
        });
        testCases.push({
            title: 'Should return Antora config for document inside a subdirectory',
            asciidocPathSegments: ssoPaths,
            antoraConfigExpectedPathSegments: apiAntoraPaths,
        });
        testCases.push({
            title: 'Should return Antora config for document inside a directory which has the same name as the workspace',
            asciidocPathSegments: patPaths,
            antoraConfigExpectedPathSegments: apiAntoraPaths,
        });
        // documentation component: docs/multiComponents/cli
        const cliDocumentationComponentPaths = ['docs', 'multiComponents', 'cli'];
        const cliAntoraPaths = [...cliDocumentationComponentPaths, 'antora.yml'];
        await (0, workspaceHelper_1.createFile)(`name: "cli"
version: "2.0"
`, ...cliAntoraPaths);
        await (0, workspaceHelper_1.createFile)('', ...[...cliDocumentationComponentPaths, 'modules', 'commands', 'images', 'output.png']);
        const convertPaths = [...cliDocumentationComponentPaths, 'module', 'commands', 'pages', 'convert.adoc'];
        await (0, workspaceHelper_1.createFile)(`= Convert Command

image::2.0@cli:commands:output.png[]

image::commands:output.png[]

image::output.png[]
`, ...convertPaths);
        testCases.push({
            title: 'Should return Antora config for document inside "pages" directory which is inside another directory',
            asciidocPathSegments: convertPaths,
            antoraConfigExpectedPathSegments: cliAntoraPaths,
        });
        // documentation component: docs/multiComponents/modules/api/docs/modules
        const modulesDocumentationComponentPaths = ['docs', 'multiComponents', 'modules', 'api', 'docs', 'modules'];
        const modulesAntoraPaths = [...modulesDocumentationComponentPaths, 'antora.yml'];
        await (0, workspaceHelper_1.createFile)(`name: asciidoc
version: ~
      `, ...modulesAntoraPaths);
        const admonitionPagePaths = [...modulesDocumentationComponentPaths, 'blocks', 'pages', 'admonition.adoc'];
        await (0, workspaceHelper_1.createFile)(`= Admonition Block

`, ...admonitionPagePaths);
        testCases.push({
            title: 'Should return Antora config for document inside a "modules" directory which is inside an Antora modules in a component named "modules"',
            asciidocPathSegments: admonitionPagePaths,
            antoraConfigExpectedPathSegments: modulesAntoraPaths,
        });
        // outside documentation modules
        const writerGuidePaths = ['docs', 'multiComponents', 'api', 'modules', 'writer-guide.adoc'];
        await (0, workspaceHelper_1.createFile)('= Writer Guide', ...writerGuidePaths);
        testCases.push({
            title: 'Should not return Antora config for document outside "modules" Antora folder',
            asciidocPathSegments: writerGuidePaths,
            antoraConfigExpectedPathSegments: undefined,
        });
        const contributingPaths = ['docs', 'contributing.adoc'];
        await (0, workspaceHelper_1.createFile)('= Contributing', ...contributingPaths);
        testCases.push({
            title: 'Should not return Antora config for document outside of documentation modules',
            asciidocPathSegments: contributingPaths,
            antoraConfigExpectedPathSegments: undefined,
        });
    });
    suiteTeardown(async () => {
        await (0, workspaceHelper_1.removeFiles)(createdFiles);
    });
    const workspaceUri = (0, workspace_1.getDefaultWorkspaceFolderUri)();
    for (const testCase of testCases) {
        test(testCase.title, async () => testGetAntoraConfig({
            asciidocPathUri: vscode.Uri.joinPath(workspaceUri, ...testCase.asciidocPathSegments),
            antoraConfigExpectedUri: testCase.antoraConfigExpectedPathSegments === undefined
                ? undefined
                : vscode.Uri.joinPath(workspaceUri, ...testCase.antoraConfigExpectedPathSegments),
        }));
    }
    test('Should handle symlink', async () => {
        // symlink does not work on Windows
        if (os_1.default.platform() !== 'win32') {
            const createdFiles = [];
            try {
                createdFiles.push(await (0, workspaceHelper_1.createDirectory)('antora-test'));
                await (0, workspaceHelper_1.createDirectories)('antora-test', 'docs', 'modules', 'ROOT', 'pages');
                const asciidocFile = await (0, workspaceHelper_1.createFile)('= Hello World', 'antora-test', 'docs', 'modules', 'ROOT', 'pages', 'index.adoc');
                await (0, workspaceHelper_1.createLink)(['antora-test', 'docs'], ['antora-test', 'docs-symlink']); // create a symlink!
                await (0, workspaceHelper_1.createFile)(`name: silver-leaf
version: '7.1'
`, 'antora-test', 'docs', 'antora.yml');
                // enable Antora support
                await (0, workspaceHelper_1.enableAntoraSupport)();
                const workspaceState = helper_1.extensionContext.workspaceState;
                const result = await (0, antoraDocument_1.getAntoraDocumentContext)(asciidocFile, workspaceState);
                const components = result.getComponents();
                assert.strictEqual(components !== undefined, true, 'Components must not be undefined');
                assert.strictEqual(components.length > 0, true, 'Must contains at least one component');
                const component = components.find((c) => c.versions.find((v) => v.name === 'silver-leaf' && v.version === '7.1') !== undefined);
                assert.strictEqual(component !== undefined, true, 'Component silver-leaf:7.1 must exists');
            }
            catch (err) {
                console.error('Something bad happened!', err);
                throw err;
            }
            finally {
                await (0, workspaceHelper_1.removeFiles)(createdFiles);
                await (0, workspaceHelper_1.resetAntoraSupport)();
            }
        }
    });
});
suite('Antora support with single documentation component', () => {
    test('Should build content catalog', async () => {
        const createdFiles = [];
        try {
            createdFiles.push(await (0, workspaceHelper_1.createDirectory)('modules'));
            await (0, workspaceHelper_1.createDirectories)('modules', 'ROOT', 'pages');
            const asciidocFile = await (0, workspaceHelper_1.createFile)('image:mountain.jpeg[]', 'modules', 'ROOT', 'pages', 'landscape.adoc');
            createdFiles.push(asciidocFile);
            createdFiles.push(await (0, workspaceHelper_1.createFile)('', 'modules', 'ROOT', 'images', 'mountain.jpeg'));
            createdFiles.push(await (0, workspaceHelper_1.createFile)(`name: ROOT
version: ~
`, 'antora.yml'));
            await (0, workspaceHelper_1.enableAntoraSupport)();
            const workspaceState = helper_1.extensionContext.workspaceState;
            const result = await (0, antoraDocument_1.getAntoraDocumentContext)(asciidocFile, workspaceState);
            const images = result.getImages();
            assert.strictEqual(images !== undefined, true, 'Images must not be undefined');
            assert.strictEqual(images.length > 0, true, 'Must contains one image');
            assert.strictEqual(images[0].src.basename, 'mountain.jpeg');
            assert.strictEqual(images[0].src.component, 'ROOT');
            assert.strictEqual(images[0].src.family, 'image');
            assert.strictEqual(images[0].src.version, null);
        }
        catch (err) {
            console.error('Something bad happened!', err);
            throw err;
        }
        finally {
            await (0, workspaceHelper_1.removeFiles)(createdFiles);
            await (0, workspaceHelper_1.resetAntoraSupport)();
        }
    });
});
//# sourceMappingURL=antoraSupport.test.js.map