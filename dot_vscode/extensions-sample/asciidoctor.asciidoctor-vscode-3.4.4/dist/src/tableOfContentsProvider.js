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
exports.TableOfContentsProvider = void 0;
const vscode = __importStar(require("vscode"));
const html_entities_1 = require("html-entities");
const slugify_1 = require("./slugify");
class TableOfContentsProvider {
    constructor(document, asciidocLoader) {
        this.document = document;
        this.asciidocLoader = asciidocLoader;
        this.document = document;
    }
    async getToc() {
        if (!this.toc) {
            try {
                this.toc = await this.buildToc(this.document);
            }
            catch (e) {
                console.log(`Unable to build the Table Of Content for: ${this.document.fileName}`, e);
                this.toc = [];
            }
        }
        return this.toc;
    }
    async lookup(fragment) {
        const toc = await this.getToc();
        const slug = slugify_1.githubSlugifier.fromHeading(fragment);
        return toc.find((entry) => entry.slug.equals(slug));
    }
    async buildToc(textDocument) {
        const asciidocDocument = await this.asciidocLoader.load(textDocument);
        const toc = asciidocDocument
            .findBy({ context: 'section' })
            .map((section) => {
            let lineNumber = section.getLineNumber(); // Asciidoctor is 1-based but can return 0 (probably a bug/limitation)
            if (lineNumber > 0) {
                lineNumber = lineNumber - 1;
            }
            return {
                slug: new slugify_1.Slug(section.getId()),
                text: (0, html_entities_1.decode)(section.getTitle()),
                level: section.getLevel(),
                line: lineNumber,
                location: new vscode.Location(textDocument.uri, new vscode.Position(lineNumber, 1)),
            };
        });
        // Get full range of section
        return toc.map((entry, startIndex) => {
            let end;
            for (let i = startIndex + 1; i < toc.length; ++i) {
                if (toc[i].level <= entry.level) {
                    end = toc[i].line - 1;
                    break;
                }
            }
            let endLine = typeof end === 'number' ? end : textDocument.lineCount - 1;
            if (endLine > textDocument.lineCount - 1) {
                endLine = textDocument.lineCount - 1;
            }
            return {
                ...entry,
                location: new vscode.Location(textDocument.uri, new vscode.Range(entry.location.range.start, new vscode.Position(endLine, textDocument.lineAt(endLine).range.end.character))),
            };
        });
    }
}
exports.TableOfContentsProvider = TableOfContentsProvider;
//# sourceMappingURL=tableOfContentsProvider.js.map