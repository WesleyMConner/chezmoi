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
exports.getAsciidoctorConfigContent = exports.AsciidoctorConfig = void 0;
const vscode = __importStar(require("vscode"));
const asciidoctorProcessor_1 = require("../asciidoctorProcessor");
const file_1 = require("../util/file");
const MAX_DEPTH_SEARCH_ASCIIDOCCONFIG = 100;
/**
 * .asciidoctorconfig support.
 */
class AsciidoctorConfig {
    constructor() {
        const asciidoctorProcessor = asciidoctorProcessor_1.AsciidoctorProcessor.getInstance();
        this.prependExtension = asciidoctorProcessor.processor.Extensions.createPreprocessor('PrependConfigPreprocessorExtension', {
            postConstruct: function () {
                this.asciidoctorConfigContent = '';
            },
            process: function (doc, reader) {
                if (this.asciidoctorConfigContent.length > 0) {
                    // otherwise an empty line at the beginning breaks level 0 detection
                    reader.pushInclude(this.asciidoctorConfigContent, undefined, undefined, 1, {});
                }
            },
        }).$new();
    }
    async activate(registry, documentUri) {
        await this.configureAsciidoctorConfigPrependExtension(documentUri);
        registry.preprocessor(this.prependExtension);
    }
    async configureAsciidoctorConfigPrependExtension(documentUri) {
        const asciidoctorConfigContent = await getAsciidoctorConfigContent(documentUri);
        if (asciidoctorConfigContent !== undefined) {
            this.prependExtension.asciidoctorConfigContent = asciidoctorConfigContent;
        }
        else {
            this.prependExtension.asciidoctorConfigContent = '';
        }
    }
}
exports.AsciidoctorConfig = AsciidoctorConfig;
async function getAsciidoctorConfigContent(documentUri) {
    const workspaceFolderUri = vscode.workspace.getWorkspaceFolder(documentUri)?.uri;
    let currentDirectoryUri = (0, file_1.dir)(documentUri, workspaceFolderUri);
    let depth = 0;
    const asciidoctorConfigs = [];
    while (currentDirectoryUri !== undefined && depth < MAX_DEPTH_SEARCH_ASCIIDOCCONFIG) {
        depth++;
        const asciidoctorConfigAdocUri = vscode.Uri.joinPath(currentDirectoryUri, '.asciidoctorconfig.adoc');
        if (await (0, file_1.exists)(asciidoctorConfigAdocUri)) {
            asciidoctorConfigs.push(asciidoctorConfigAdocUri);
        }
        const asciidoctorConfigUri = vscode.Uri.joinPath(currentDirectoryUri, '.asciidoctorconfig');
        if ((await (0, file_1.exists)(asciidoctorConfigUri))) {
            asciidoctorConfigs.push(asciidoctorConfigUri);
        }
        currentDirectoryUri = (0, file_1.dir)(currentDirectoryUri, workspaceFolderUri);
    }
    asciidoctorConfigs.sort((a, b) => a.path.localeCompare(b.path));
    if (asciidoctorConfigs.length === 0) {
        return undefined;
    }
    const configContents = [];
    for (const asciidoctorConfig of asciidoctorConfigs) {
        const asciidoctorConfigContent = new TextDecoder().decode(await vscode.workspace.fs.readFile(asciidoctorConfig));
        const asciidoctorConfigParentDirectory = asciidoctorConfig.path.slice(0, asciidoctorConfig.path.lastIndexOf('/'));
        configContents.push(`:asciidoctorconfigdir: ${asciidoctorConfigParentDirectory}\n\n${asciidoctorConfigContent.trim()}\n\n`);
    }
    if (configContents.length > 0) {
        return configContents.join('\n\n');
    }
    return undefined;
}
exports.getAsciidoctorConfigContent = getAsciidoctorConfigContent;
//# sourceMappingURL=asciidoctorConfig.js.map