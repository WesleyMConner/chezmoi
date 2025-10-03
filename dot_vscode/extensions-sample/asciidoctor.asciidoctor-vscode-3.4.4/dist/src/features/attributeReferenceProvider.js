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
exports.AttributeReferenceProvider = void 0;
const vscode = __importStar(require("vscode"));
function findNearestBlock(document, lineNumber) {
    let nearestBlock;
    const blocks = document.findBy((block) => {
        const sourceLocation = block.getSourceLocation();
        if (sourceLocation) {
            if (sourceLocation.getLineNumber() === lineNumber) {
                return true;
            }
            else if (sourceLocation.getLineNumber() < lineNumber) {
                nearestBlock = block;
            }
        }
        return false;
    });
    if (blocks && blocks.length) {
        return blocks[0];
    }
    return nearestBlock;
}
class AttributeReferenceProvider {
    constructor(asciidocLoader) {
        this.asciidocLoader = asciidocLoader;
    }
    async provideCompletionItems(textDocument, position) {
        const document = await this.asciidocLoader.load(textDocument);
        const attributes = document.getAttributes();
        const lineText = textDocument.lineAt(position).text;
        const nearestBlock = findNearestBlock(document, position.line + 1); // 0-based on VS code but 1-based on Asciidoctor (hence the + 1)
        if (nearestBlock && nearestBlock.content_model === 'verbatim' && !nearestBlock.getSubstitutions().includes('attributes')) {
            // verbatim block without attributes subs should not provide attributes completion
            return [];
        }
        const prefix = lineText.substring(position.character - 1, position.character);
        const suffix = lineText.substring(position.character, position.character + 1);
        return Object.keys(attributes).map((key) => {
            const completionItem = new vscode.CompletionItem({
                label: key,
                description: attributes[key]?.toString(),
            }, vscode.CompletionItemKind.Variable);
            let insertText = key;
            insertText = prefix !== '{' ? `{${insertText}` : insertText;
            insertText = suffix !== '}' ? `${insertText}}` : insertText;
            completionItem.insertText = insertText;
            completionItem.sortText = `20_${key}`;
            completionItem.filterText = key + ' ' + attributes[key]?.toString();
            return completionItem;
        });
    }
}
exports.AttributeReferenceProvider = AttributeReferenceProvider;
//# sourceMappingURL=attributeReferenceProvider.js.map