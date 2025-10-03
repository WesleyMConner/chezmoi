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
const vscode = __importStar(require("vscode"));
const vscode_1 = require("vscode");
const tableOfContentsProvider_1 = require("../tableOfContentsProvider");
//https://github.com/asciidoctor/asciidoctor/blob/0aad7459d1fe548219733b4a2b4f00fd3bf6f362/lib/asciidoctor/rx.rb#L76
const conditionalStartRx = /^(\\)?(ifdef|ifndef|ifeval)::(\S*?(?:([,+])\S*?)?)\[(#{CC_ANY}+)?/;
const conditionalEndRx = /^(\\)?(endif)::(\S*?(?:([,+])\S*?)?)\[(#{CC_ANY}+)?/;
const commentBlockRx = /^\/{4,}/;
class AsciidocFoldingRangeProvider {
    constructor(asciidocLoader) {
        this.asciidocLoader = asciidocLoader;
    }
    async provideFoldingRanges(document, _token) {
        const foldingRanges = await this.getHeaderFoldingRanges(document);
        return foldingRanges.concat(AsciidocFoldingRangeProvider.getConditionalFoldingRanges(document), AsciidocFoldingRangeProvider.getBlockFoldingRanges(document));
    }
    static getConditionalFoldingRanges(document) {
        const conditionalStartIndexes = [];
        const foldingRanges = [];
        for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
            const line = document.lineAt(lineIndex);
            if (conditionalStartRx.test(line.text)) {
                conditionalStartIndexes.push(lineIndex);
            }
            if (conditionalEndRx.test(line.text)) {
                const startIndex = conditionalStartIndexes.pop();
                if (typeof startIndex !== 'undefined') {
                    foldingRanges.push(new vscode.FoldingRange(startIndex, lineIndex, vscode_1.FoldingRangeKind.Region));
                }
            }
        }
        return foldingRanges;
    }
    static handleOpenBlockFoldingRanges(openBlockIndexes, foldingRanges, lineIndex, lineText, documentLineCount) {
        if (lineText === '--') {
            if (openBlockIndexes.length === 0) {
                openBlockIndexes.push(lineIndex);
            }
            else {
                const startIndex = openBlockIndexes.pop();
                foldingRanges.push(new vscode.FoldingRange(startIndex, lineIndex, vscode_1.FoldingRangeKind.Region));
            }
        }
        if (openBlockIndexes.length === 1 && lineIndex === documentLineCount - 1) {
            // unterminated open block
            foldingRanges.push(new vscode.FoldingRange(openBlockIndexes.pop(), documentLineCount - 1, vscode_1.FoldingRangeKind.Region));
        }
    }
    static handleCommentBlockFoldingRanges(commentBlockIndexes, foldingRanges, lineIndex, lineText, documentLineCount) {
        if (commentBlockRx.test(lineText)) {
            if (commentBlockIndexes.length === 0) {
                commentBlockIndexes.push(lineIndex);
            }
            else {
                const startIndex = commentBlockIndexes.pop();
                foldingRanges.push(new vscode.FoldingRange(startIndex, lineIndex, vscode_1.FoldingRangeKind.Region));
            }
        }
        if (commentBlockIndexes.length === 1 && lineIndex === documentLineCount - 1) {
            // unterminated comment block
            foldingRanges.push(new vscode.FoldingRange(commentBlockIndexes.pop(), documentLineCount - 1, vscode_1.FoldingRangeKind.Region));
        }
    }
    static handleSingleLineCommentFoldingRanges(singleLineCommentStartIndexes, foldingRanges, lineIndex, lineText, documentLineCount) {
        if (lineText.startsWith('//')) {
            if (singleLineCommentStartIndexes.length === 0) {
                singleLineCommentStartIndexes.push(lineIndex);
            }
            if (lineIndex >= documentLineCount - 1) {
                // comment on last line of the document
                const startIndex = singleLineCommentStartIndexes.pop();
                if (lineIndex > startIndex) {
                    foldingRanges.push(new vscode.FoldingRange(startIndex, lineIndex, vscode_1.FoldingRangeKind.Comment));
                }
            }
        }
        else {
            if (singleLineCommentStartIndexes.length !== 0) {
                const startIndex = singleLineCommentStartIndexes.pop();
                const endIndex = lineIndex - 1;
                if (endIndex > startIndex) {
                    foldingRanges.push(new vscode.FoldingRange(startIndex, endIndex, vscode_1.FoldingRangeKind.Comment));
                }
            }
        }
    }
    static handleMultiAttributesFoldingRanges(multiAttributesIndexes, foldingRanges, lineIndex, lineText, documentLineCount) {
        if (lineText.startsWith(':')) {
            if (multiAttributesIndexes.length === 0) {
                multiAttributesIndexes.push(lineIndex);
            }
            if (lineIndex >= documentLineCount - 1) {
                // Attribute on last line of the document
                const startIndex = multiAttributesIndexes.pop();
                if (lineIndex > startIndex) {
                    foldingRanges.push(new vscode.FoldingRange(startIndex, lineIndex));
                }
            }
        }
        else {
            if (multiAttributesIndexes.length !== 0) {
                const startIndex = multiAttributesIndexes.pop();
                const endIndex = lineIndex - 1;
                if (endIndex > startIndex) {
                    foldingRanges.push(new vscode.FoldingRange(startIndex, endIndex));
                }
            }
        }
    }
    static getBlockFoldingRanges(document) {
        const foldingRanges = [];
        const openBlockIndexes = [];
        const commentBlockIndexes = [];
        const singleLineCommentStartIndexes = [];
        const multiAttributesIndexes = [];
        const documentLineCount = document.lineCount;
        for (let lineIndex = 0; lineIndex < documentLineCount; lineIndex++) {
            const line = document.lineAt(lineIndex);
            const lineText = line.text;
            this.handleOpenBlockFoldingRanges(openBlockIndexes, foldingRanges, lineIndex, lineText, documentLineCount);
            this.handleCommentBlockFoldingRanges(commentBlockIndexes, foldingRanges, lineIndex, lineText, documentLineCount);
            this.handleSingleLineCommentFoldingRanges(singleLineCommentStartIndexes, foldingRanges, lineIndex, lineText, documentLineCount);
            this.handleMultiAttributesFoldingRanges(multiAttributesIndexes, foldingRanges, lineIndex, lineText, documentLineCount);
        }
        return foldingRanges;
    }
    async getHeaderFoldingRanges(document) {
        const tableOfContentsProvider = new tableOfContentsProvider_1.TableOfContentsProvider(document, this.asciidocLoader);
        const tableOfContents = await tableOfContentsProvider.getToc();
        return tableOfContents.map((entry, startIndex) => {
            const start = entry.line;
            let end;
            for (let i = startIndex + 1; i < tableOfContents.length; ++i) {
                if (tableOfContents[i].level <= entry.level) {
                    end = tableOfContents[i].line - 1;
                    break;
                }
            }
            return new vscode.FoldingRange(start, typeof end === 'number' ? end : document.lineCount - 1, vscode_1.FoldingRangeKind.Region);
        });
    }
}
exports.default = AsciidocFoldingRangeProvider;
//# sourceMappingURL=foldingProvider.js.map