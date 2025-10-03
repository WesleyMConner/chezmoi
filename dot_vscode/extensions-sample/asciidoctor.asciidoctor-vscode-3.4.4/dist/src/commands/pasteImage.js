"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentImagesDir = exports.PasteImage = void 0;
const image_paste_1 = require("../image-paste");
const vscode_1 = __importDefault(require("vscode"));
var Configuration = image_paste_1.Import.Configuration;
class PasteImage {
    constructor(asciidocLoader) {
        this.asciidocLoader = asciidocLoader;
        this.id = 'asciidoc.pasteImage';
    }
    async execute() {
        try {
            const activeTextEditor = vscode_1.default.window.activeTextEditor;
            if (activeTextEditor === undefined) {
                return;
            }
            const configuration = new Configuration();
            configuration.ImagesDirectory = await getCurrentImagesDir(this.asciidocLoader, activeTextEditor.document, activeTextEditor.selection);
            await image_paste_1.Import.Image.importFromClipboard(configuration);
        }
        catch (e) {
            vscode_1.default.window.showErrorMessage(e);
        }
    }
}
exports.PasteImage = PasteImage;
/**
 * Reads the current `:imagesdir:` [attribute](https://asciidoctor.org/docs/user-manual/#setting-the-location-of-images) from the document.
 *
 * Reads the _nearest_ `:imagesdir:` attribute that appears _before_ the current selection
 * or cursor location, failing that figures it out from the API by converting the document and reading the attribute
 */
async function getCurrentImagesDir(asciidocLoader, textDocument, selection) {
    const text = textDocument.getText();
    const imagesDir = /^[\t\f]*?:imagesdir:\s+(.+?)\s+$/gim;
    let matches = imagesDir.exec(text);
    const index = selection.start;
    const cursorIndex = textDocument.offsetAt(index);
    let dir = '';
    while (matches && matches.index < cursorIndex) {
        dir = matches[1] || '';
        matches = imagesDir.exec(text);
    }
    if (dir !== '') {
        return dir;
    }
    const document = await asciidocLoader.load(textDocument);
    return document.getAttribute('imagesdir', '');
}
exports.getCurrentImagesDir = getCurrentImagesDir;
//# sourceMappingURL=pasteImage.js.map