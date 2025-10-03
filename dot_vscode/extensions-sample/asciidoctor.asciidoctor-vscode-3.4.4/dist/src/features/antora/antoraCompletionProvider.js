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
const antoraDocument_1 = require("./antoraDocument");
class AntoraCompletionProvider {
    async provideCompletionItems(textDocument, position) {
        const lineText = textDocument.lineAt(position).text;
        const prefix = lineText.substring(position.character - 1, position.character);
        const suffix = lineText.substring(position.character, position.character + 1);
        const attributes = await (0, antoraDocument_1.getAttributes)(textDocument.uri);
        return Object.entries(attributes).map(([key, value]) => {
            const completionItem = new vscode.CompletionItem({
                label: key,
                description: value,
            }, vscode.CompletionItemKind.Text);
            let insertText = value;
            insertText = prefix !== '{' ? `{${insertText}` : insertText;
            insertText = suffix !== '}' ? `${insertText}}` : insertText;
            completionItem.insertText = insertText;
            return completionItem;
        });
    }
}
exports.default = AntoraCompletionProvider;
//# sourceMappingURL=antoraCompletionProvider.js.map