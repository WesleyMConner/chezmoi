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
exports.DropImageIntoEditorProvider = void 0;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const URI = __importStar(require("vscode-uri"));
const imageFileExtensions = new Set([
    '.bmp',
    '.gif',
    '.ico',
    '.jpe',
    '.jpeg',
    '.jpg',
    '.png',
    '.svg',
    '.tga',
    '.tif',
    '.tiff',
    '.webp',
]);
class DropImageIntoEditorProvider {
    constructor(asciidocLoader) {
        this.asciidocLoader = asciidocLoader;
    }
    async provideDocumentDropEdits(textDocument, _position, dataTransfer, token) {
        // Check if drop config is enabled
        const enabled = vscode.workspace.getConfiguration('asciidoc', textDocument).get('editor.drop.enabled', true);
        if (!enabled) {
            return undefined;
        }
        // Return the text or snippet to insert at the drop location.
        const snippet = await tryGetUriListSnippet(textDocument, this.asciidocLoader, dataTransfer, token);
        return snippet ? new vscode.DocumentDropEdit(snippet) : undefined;
    }
}
exports.DropImageIntoEditorProvider = DropImageIntoEditorProvider;
async function tryGetUriListSnippet(textDocument, asciidocLoader, dataTransfer, token) {
    // Get dropped files uris
    const urlList = await dataTransfer.get('text/uri-list')?.asString();
    if (!urlList || token.isCancellationRequested) {
        return undefined;
    }
    const uris = [];
    for (const resource of urlList.split('\n')) {
        uris.push(vscode.Uri.parse(resource.replace('\r', '')));
    }
    if (!uris.length) {
        return;
    }
    const document = await asciidocLoader.load(textDocument);
    const imagesDirectory = document.getAttribute('imagesdir');
    const snippet = new vscode.SnippetString();
    // Drop location uri
    const docUri = textDocument.uri;
    // Get uri for each uris list value
    uris.forEach((uri, index) => {
        let imagePath;
        if (docUri.scheme === uri.scheme && docUri.authority === uri.authority) {
            const imageRelativePath = path.relative(URI.Utils.dirname(docUri).fsPath, uri.fsPath).replace(/\\/g, '/');
            if (imagesDirectory && imageRelativePath.startsWith(imagesDirectory)) {
                imagePath = encodeURI(imageRelativePath.substring(imagesDirectory.length));
            }
            else {
                imagePath = encodeURI(imageRelativePath);
            }
        }
        else {
            imagePath = uri.toString(false);
        }
        // Check that the dropped file is an image
        const ext = URI.Utils.extname(uri).toLowerCase();
        snippet.appendText(imageFileExtensions.has(ext) ? `image::${imagePath}[]` : '');
        // Add a line break if multiple dropped documents
        if (index <= uris.length - 1 && uris.length > 1) {
            snippet.appendText('\n');
        }
    });
    return snippet;
}
//# sourceMappingURL=dropIntoEditor.js.map