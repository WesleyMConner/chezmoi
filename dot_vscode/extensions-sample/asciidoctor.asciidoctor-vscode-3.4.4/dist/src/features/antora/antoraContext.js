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
exports.AntoraSupportManager = exports.AntoraContext = exports.AntoraDocumentContext = exports.AntoraConfig = void 0;
const vscode_1 = __importStar(require("vscode"));
const path_1 = __importDefault(require("path"));
const antoraCompletionProvider_1 = __importDefault(require("./antoraCompletionProvider"));
const dispose_1 = require("../../util/dispose");
const nls = __importStar(require("vscode-nls"));
const antoraDocument_1 = require("./antoraDocument");
const localize = nls.loadMessageBundle(__filename);
class AntoraConfig {
    constructor(uri, config) {
        this.uri = uri;
        this.config = config;
        const path = uri.path;
        this.contentSourceRootPath = path.slice(0, path.lastIndexOf('/'));
        this.contentSourceRootFsPath = path_1.default.dirname(uri.fsPath);
        if (config.version === true || config.version === undefined) {
            config.version = this.getVersionForPath(path);
        }
    }
    getVersionForPath(path) {
        const version = AntoraConfig.versionMap.get(path);
        if (version)
            return `V-${version}`;
        const nextVersion = AntoraConfig.versionMap.size + 1;
        AntoraConfig.versionMap.set(path, nextVersion);
        return `V-${nextVersion}`;
    }
}
exports.AntoraConfig = AntoraConfig;
AntoraConfig.versionMap = new Map();
class AntoraDocumentContext {
    constructor(antoraContext, resourceContext) {
        this.antoraContext = antoraContext;
        this.resourceContext = resourceContext;
        this.PERMITTED_FAMILIES = ['attachment', 'example', 'image', 'page', 'partial'];
    }
    resolveAntoraResourceIds(id, defaultFamily) {
        const resource = this.antoraContext.contentCatalog.resolveResource(id, this.resourceContext, defaultFamily, this.PERMITTED_FAMILIES);
        if (resource) {
            return resource.src?.abspath;
        }
        return undefined;
    }
    getComponents() {
        return this.antoraContext.contentCatalog.getComponents();
    }
    getImages() {
        return this.antoraContext.contentCatalog.findBy({ family: 'image' });
    }
    getContentCatalog() {
        return this.antoraContext.contentCatalog;
    }
}
exports.AntoraDocumentContext = AntoraDocumentContext;
class AntoraContext {
    constructor(contentCatalog) {
        this.contentCatalog = contentCatalog;
    }
    async getResource(textDocumentUri) {
        const antoraConfig = await (0, antoraDocument_1.getAntoraConfig)(textDocumentUri);
        if (antoraConfig === undefined) {
            return undefined;
        }
        const contentSourceRootPath = antoraConfig.contentSourceRootFsPath;
        const config = antoraConfig.config;
        if (config.name === undefined) {
            return undefined;
        }
        const page = this.contentCatalog.getByPath({
            component: config.name,
            version: config.version,
            // Vinyl will normalize the path to a system-dependent path :(
            path: path_1.default.relative(contentSourceRootPath, textDocumentUri.fsPath),
        });
        if (page === undefined) {
            return undefined;
        }
        return page.src;
    }
}
exports.AntoraContext = AntoraContext;
class AntoraSupportManager {
    constructor() {
        this._disposables = [];
    }
    static getInstance(workspaceState) {
        if (AntoraSupportManager.instance) {
            AntoraSupportManager.workspaceState = workspaceState;
            return AntoraSupportManager.instance;
        }
        AntoraSupportManager.instance = new AntoraSupportManager();
        AntoraSupportManager.workspaceState = workspaceState;
        // look for Antora support setting in workspace state
        const isEnableAntoraSupportSettingDefined = workspaceState.get('antoraSupportSetting');
        if (isEnableAntoraSupportSettingDefined === true) {
            AntoraSupportManager.instance.registerFeatures();
        }
        else if (isEnableAntoraSupportSettingDefined === undefined) {
            // choice has not been made
            const onDidOpenAsciiDocFileAskAntoraSupport = vscode_1.default.workspace.onDidOpenTextDocument(async (textDocument) => {
                // Convert Git URI to `file://` URI since the Git file system provider produces unexpected results.
                const textDocumentUri = textDocument.uri.scheme === 'git'
                    ? vscode_1.Uri.file(textDocument.uri.path)
                    : textDocument.uri;
                if (await (0, antoraDocument_1.antoraConfigFileExists)(textDocumentUri)) {
                    const yesAnswer = localize(0, null);
                    const noAnswer = localize(1, null);
                    const answer = await vscode_1.default.window.showInformationMessage(localize(2, null), yesAnswer, noAnswer);
                    const enableAntoraSupport = answer === yesAnswer;
                    await workspaceState.update('antoraSupportSetting', enableAntoraSupport);
                    if (enableAntoraSupport) {
                        AntoraSupportManager.instance.registerFeatures();
                    }
                    // do not ask again to avoid bothering users
                    onDidOpenAsciiDocFileAskAntoraSupport.dispose();
                }
            });
            AntoraSupportManager.instance._disposables.push(onDidOpenAsciiDocFileAskAntoraSupport);
        }
    }
    async getAttributes(textDocumentUri) {
        const antoraEnabled = this.isEnabled();
        if (antoraEnabled) {
            return (0, antoraDocument_1.getAttributes)(textDocumentUri);
        }
        return {};
    }
    isEnabled() {
        // look for Antora support setting in workspace state
        const isEnableAntoraSupportSettingDefined = AntoraSupportManager.workspaceState.get('antoraSupportSetting');
        if (isEnableAntoraSupportSettingDefined === true) {
            return true;
        }
        // choice has not been made or Antora is explicitly disabled
        return false;
    }
    registerFeatures() {
        const attributesCompletionProvider = vscode_1.default.languages.registerCompletionItemProvider({
            language: 'asciidoc',
            scheme: 'file',
        }, new antoraCompletionProvider_1.default(), '{');
        this._disposables.push(attributesCompletionProvider);
    }
    dispose() {
        (0, dispose_1.disposeAll)(this._disposables);
    }
}
exports.AntoraSupportManager = AntoraSupportManager;
//# sourceMappingURL=antoraContext.js.map