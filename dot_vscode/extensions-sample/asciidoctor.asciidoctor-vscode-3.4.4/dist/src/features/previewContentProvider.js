"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsciidocContentProvider = void 0;
class AsciidocContentProvider {
    constructor(asciidocEngine, context) {
        this.asciidocEngine = asciidocEngine;
        this.context = context;
    }
    async providePreviewHTML(asciidocDocument, previewConfigurations, editor, line) {
        const { html } = await this.asciidocEngine.convertFromTextDocument(asciidocDocument, this.context, editor, line);
        return html;
    }
}
exports.AsciidocContentProvider = AsciidocContentProvider;
//# sourceMappingURL=previewContentProvider.js.map