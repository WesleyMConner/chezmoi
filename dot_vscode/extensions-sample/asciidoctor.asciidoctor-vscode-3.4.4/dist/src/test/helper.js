"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extensionContext = void 0;
const vscode_1 = __importDefault(require("vscode"));
suiteSetup(async () => {
    // Trigger extension activation and grab the context as some tests depend on it
    const extension = vscode_1.default.extensions.getExtension('asciidoctor.asciidoctor-vscode');
    await extension?.activate();
    exports.extensionContext = global.testExtensionContext;
});
//# sourceMappingURL=helper.js.map