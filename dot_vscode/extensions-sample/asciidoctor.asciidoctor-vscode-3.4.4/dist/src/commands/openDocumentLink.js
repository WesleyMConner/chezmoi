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
exports.resolveLinkToAsciidocFile = exports.OpenDocumentLinkCommand = void 0;
const vscode = __importStar(require("vscode"));
const path_1 = require("path");
const tableOfContentsProvider_1 = require("../tableOfContentsProvider");
const file_1 = require("../util/file");
class OpenDocumentLinkCommand {
    constructor(asciidocLoader) {
        this.asciidocLoader = asciidocLoader;
        this.id = OpenDocumentLinkCommand.id;
    }
    static createCommandUri(path, fragment) {
        return vscode.Uri.parse(`command:${OpenDocumentLinkCommand.id}?${encodeURIComponent(JSON.stringify({ path, fragment }))}`);
    }
    execute(args) {
        const p = decodeURIComponent(args.path);
        return this.tryOpen(p, args).catch(async () => {
            if ((0, path_1.extname)(p) === '') {
                return this.tryOpen(p + '.adoc', args);
            }
            const resource = vscode.Uri.file(p);
            await vscode.commands.executeCommand('vscode.open', resource);
            return undefined;
        });
    }
    async tryOpen(path, args) {
        const resource = vscode.Uri.file(path);
        if (vscode.window.activeTextEditor && (0, file_1.isAsciidocFile)(vscode.window.activeTextEditor.document) &&
            vscode.window.activeTextEditor.document.uri.fsPath === resource.fsPath) {
            return this.tryRevealLine(vscode.window.activeTextEditor, args.fragment);
        }
        else {
            return vscode.workspace.openTextDocument(resource)
                .then(vscode.window.showTextDocument)
                .then((editor) => this.tryRevealLine(editor, args.fragment));
        }
    }
    async tryRevealLine(editor, fragment) {
        if (editor && fragment) {
            const toc = new tableOfContentsProvider_1.TableOfContentsProvider(editor.document, this.asciidocLoader);
            const entry = await toc.lookup(fragment);
            if (entry) {
                return editor.revealRange(new vscode.Range(entry.line, 0, entry.line, 0), vscode.TextEditorRevealType.AtTop);
            }
            const lineNumberFragment = fragment.match(/^L(\d+)$/i);
            if (lineNumberFragment) {
                const line = +lineNumberFragment[1] - 1;
                if (!isNaN(line)) {
                    return editor.revealRange(new vscode.Range(line, 0, line, 0), vscode.TextEditorRevealType.AtTop);
                }
            }
        }
    }
}
exports.OpenDocumentLinkCommand = OpenDocumentLinkCommand;
OpenDocumentLinkCommand.id = '_asciidoc.openDocumentLink';
async function resolveLinkToAsciidocFile(path) {
    try {
        const standardLink = await tryResolveLinkToAsciidocFile(path);
        if (standardLink) {
            return standardLink;
        }
    }
    catch {
        // Noop
    }
    // If no extension, try with `.adoc` extension
    if ((0, path_1.extname)(path) === '') {
        return tryResolveLinkToAsciidocFile(path + '.adoc');
    }
    return undefined;
}
exports.resolveLinkToAsciidocFile = resolveLinkToAsciidocFile;
async function tryResolveLinkToAsciidocFile(path) {
    const resource = vscode.Uri.file(path);
    let document;
    try {
        document = await vscode.workspace.openTextDocument(resource);
    }
    catch {
        return undefined;
    }
    if ((0, file_1.isAsciidocFile)(document)) {
        return document.uri;
    }
    return undefined;
}
//# sourceMappingURL=openDocumentLink.js.map