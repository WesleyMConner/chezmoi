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
exports.getAntoraDocumentContext = exports.getAttributes = exports.getAntoraConfig = exports.antoraConfigFileExists = exports.findAntoraConfigFile = void 0;
const vscode_1 = __importStar(require("vscode"));
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const path_1 = require("path");
const workspace_1 = require("../../util/workspace");
const file_1 = require("../../util/file");
const contentClassifier = __importStar(require("@antora/content-classifier"));
const findFiles_1 = require("../../util/findFiles");
const antoraContext_1 = require("./antoraContext");
const classifyContent = contentClassifier.default || contentClassifier;
const MAX_DEPTH_SEARCH_ANTORA_CONFIG = 100;
async function findAntoraConfigFile(textDocumentUri) {
    const asciidocFilePath = path_1.posix.normalize(textDocumentUri.path);
    const cancellationToken = new vscode_1.CancellationTokenSource();
    cancellationToken.token.onCancellationRequested((e) => {
        console.log('Cancellation requested, cause: ' + e);
    });
    const antoraConfigUris = await (0, findFiles_1.findFiles)('**/antora.yml');
    // check for Antora configuration
    for (const antoraConfigUri of antoraConfigUris) {
        const antoraConfigParentDirPath = antoraConfigUri.path.slice(0, antoraConfigUri.path.lastIndexOf('/'));
        const modulesDirPath = path_1.posix.normalize(`${antoraConfigParentDirPath}/modules`);
        if (asciidocFilePath.startsWith(modulesDirPath) && asciidocFilePath.slice(modulesDirPath.length).match(/^\/[^/]+\/pages\/.*/)) {
            console.log(`Found an Antora configuration file at ${antoraConfigUri.path} for the AsciiDoc document ${asciidocFilePath}`);
            return antoraConfigUri;
        }
    }
    const antoraConfigPaths = antoraConfigUris.map((uri) => uri.path);
    console.log(`Unable to find an applicable Antora configuration file in [${antoraConfigPaths.join(', ')}] for the AsciiDoc document ${asciidocFilePath}`);
    return undefined;
}
exports.findAntoraConfigFile = findAntoraConfigFile;
async function antoraConfigFileExists(textDocumentUri) {
    const workspaceFolderUri = vscode_1.default.workspace.getWorkspaceFolder(textDocumentUri)?.uri;
    let currentDirectoryUri = (0, file_1.dir)(textDocumentUri, workspaceFolderUri);
    let depth = 0;
    let antoraConfig;
    while (currentDirectoryUri !== undefined && depth < MAX_DEPTH_SEARCH_ANTORA_CONFIG) {
        depth++;
        const antoraConfigUri = vscode_1.default.Uri.joinPath(currentDirectoryUri, 'antora.yml');
        if (await (0, file_1.exists)(antoraConfigUri)) {
            // Important: some file system providers, most notably the built-in git file system provider,
            // return true when calling `exists` even if the file does not exist on the local file system.
            // The Git file system provider will also return an empty buffer when calling `readFile`!
            // antora.yml file must have a name and version key.
            // In other words, the file must not be empty to be valid!
            try {
                const content = await vscode_1.default.workspace.fs.readFile(antoraConfigUri);
                if (content.length > 0) {
                    antoraConfig = antoraConfigUri;
                }
            }
            catch (e) {
                // ignore, assume that the file does not exist
            }
            break;
        }
        currentDirectoryUri = (0, file_1.dir)(currentDirectoryUri, workspaceFolderUri);
    }
    return antoraConfig !== undefined;
}
exports.antoraConfigFileExists = antoraConfigFileExists;
async function getAntoraConfigs() {
    const cancellationToken = new vscode_1.CancellationTokenSource();
    cancellationToken.token.onCancellationRequested((e) => {
        console.log('Cancellation requested, cause: ' + e);
    });
    const antoraConfigUris = await (0, findFiles_1.findFiles)('**/antora.yml');
    // check for Antora configuration
    const antoraConfigs = await Promise.all(antoraConfigUris.map(async (antoraConfigUri) => {
        let config = {};
        const parentPath = antoraConfigUri.path.slice(0, antoraConfigUri.path.lastIndexOf('/'));
        const parentDirectoryStat = await vscode_1.default.workspace.fs.stat(antoraConfigUri.with({ path: parentPath }));
        if (parentDirectoryStat.type === (vscode_1.FileType.Directory | vscode_1.FileType.SymbolicLink) || parentDirectoryStat.type === vscode_1.FileType.SymbolicLink) {
            // ignore!
            return undefined;
        }
        try {
            config = js_yaml_1.default.load(await vscode_1.default.workspace.fs.readFile(antoraConfigUri)) || {};
        }
        catch (err) {
            console.log(`Unable to parse ${antoraConfigUri}, cause:` + err.toString());
        }
        return new antoraContext_1.AntoraConfig(antoraConfigUri, config);
    }));
    return antoraConfigs.filter((c) => c); // filter undefined
}
async function getAntoraConfig(textDocumentUri) {
    const antoraConfigUri = await findAntoraConfigFile(textDocumentUri);
    if (antoraConfigUri === undefined) {
        return undefined;
    }
    let config = {};
    try {
        config = js_yaml_1.default.load(fs_1.default.readFileSync(antoraConfigUri.fsPath, 'utf8')) || {};
    }
    catch (err) {
        console.log(`Unable to parse ${antoraConfigUri.fsPath}, cause:` + err.toString());
    }
    return new antoraContext_1.AntoraConfig(antoraConfigUri, config);
}
exports.getAntoraConfig = getAntoraConfig;
async function getAttributes(textDocumentUri) {
    const antoraConfig = await getAntoraConfig(textDocumentUri);
    if (antoraConfig === undefined) {
        return {};
    }
    return antoraConfig.config.asciidoc?.attributes || {};
}
exports.getAttributes = getAttributes;
async function getAntoraDocumentContext(textDocumentUri, workspaceState) {
    const antoraSupportManager = antoraContext_1.AntoraSupportManager.getInstance(workspaceState);
    if (!antoraSupportManager.isEnabled()) {
        return undefined;
    }
    try {
        const antoraConfigs = await getAntoraConfigs();
        const contentAggregate = (await Promise.all(antoraConfigs
            .filter((antoraConfig) => antoraConfig.config !== undefined && 'name' in antoraConfig.config && 'version' in antoraConfig.config)
            .map(async (antoraConfig) => {
            const workspaceFolder = (0, workspace_1.getWorkspaceFolder)(antoraConfig.uri);
            const workspaceRelative = path_1.posix.relative(workspaceFolder.uri.path, antoraConfig.contentSourceRootPath);
            const globPattern = 'modules/*/{attachments,examples,images,pages,partials,assets}/**';
            const files = await Promise.all((await (0, findFiles_1.findFiles)(`${workspaceRelative ? `${workspaceRelative}/` : ''}${globPattern}`)).map(async (file) => {
                const contentSourceRootPath = antoraConfig.contentSourceRootPath;
                return {
                    base: contentSourceRootPath,
                    path: path_1.posix.relative(contentSourceRootPath, file.path),
                    contents: Buffer.from((await vscode_1.default.workspace.fs.readFile(file))),
                    extname: path_1.posix.extname(file.path),
                    stem: path_1.posix.basename(file.path, path_1.posix.extname(file.path)),
                    src: {
                        abspath: file.path,
                        basename: path_1.posix.basename(file.path),
                        editUrl: '',
                        extname: path_1.posix.extname(file.path),
                        path: file.path,
                        stem: path_1.posix.basename(file.path, path_1.posix.extname(file.path)),
                    },
                };
            }));
            return {
                name: antoraConfig.config.name,
                version: antoraConfig.config.version,
                ...antoraConfig.config,
                files,
            };
        })));
        const contentCatalog = await classifyContent({
            site: {},
        }, contentAggregate);
        const antoraContext = new antoraContext_1.AntoraContext(contentCatalog);
        const antoraResourceContext = await antoraContext.getResource(textDocumentUri);
        if (antoraResourceContext === undefined) {
            return undefined;
        }
        return new antoraContext_1.AntoraDocumentContext(antoraContext, antoraResourceContext);
    }
    catch (err) {
        console.error(`Unable to get Antora context for ${textDocumentUri}`, err);
        return undefined;
    }
}
exports.getAntoraDocumentContext = getAntoraDocumentContext;
//# sourceMappingURL=antoraDocument.js.map