"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsciidocTextDocument = void 0;
const vscode_1 = __importDefault(require("vscode"));
const path_1 = __importDefault(require("path"));
const workspace_1 = require("./util/workspace");
class AsciidocTextDocument {
    constructor(uri) {
        this.uri = uri;
        this.baseDir = AsciidocTextDocument.getBaseDir(uri);
        this.dirName = AsciidocTextDocument.getDirName(uri);
        this.extensionName = AsciidocTextDocument.getExtensionName(uri);
        this.fileName = AsciidocTextDocument.getFileName(uri);
        this.filePath = AsciidocTextDocument.getFilePath(uri);
    }
    static fromTextDocument(textDocument) {
        return new AsciidocTextDocument(textDocument.uri);
    }
    /**
     * Get the base directory.
     * @private
     */
    static getBaseDir(uri) {
        const useWorkspaceAsBaseDir = vscode_1.default.workspace.getConfiguration('asciidoc', null).get('useWorkspaceRootAsBaseDirectory');
        if (useWorkspaceAsBaseDir) {
            const workspaceFolder = (0, workspace_1.getWorkspaceFolder)(uri);
            if (workspaceFolder) {
                return workspaceFolder.uri.fsPath;
            }
        }
        return AsciidocTextDocument.getDirName(uri);
    }
    static getDirName(uri) {
        return 'browser' in process && process.browser === true
            ? undefined
            : path_1.default.dirname(path_1.default.resolve(uri.fsPath));
    }
    /**
     * Return the extension name of the file without the '.'.
     * @param uri
     * @private
     */
    static getExtensionName(uri) {
        const textDocumentExt = path_1.default.extname(uri.path);
        return textDocumentExt.startsWith('.') ? textDocumentExt.substring(1) : '';
    }
    /**
     * Return the file name without the file extension.
     * @param uri
     * @private
     */
    static getFileName(uri) {
        if ('browser' in process && process.browser === true) {
            return undefined;
        }
        return path_1.default.parse(uri.fsPath).name;
    }
    /**
     * Return the filesystem path of the URI.
     * @param uri
     * @private
     */
    static getFilePath(uri) {
        if ('browser' in process && process.browser === true) {
            return undefined;
        }
        return uri.fsPath;
    }
}
exports.AsciidocTextDocument = AsciidocTextDocument;
//# sourceMappingURL=asciidocTextDocument.js.map