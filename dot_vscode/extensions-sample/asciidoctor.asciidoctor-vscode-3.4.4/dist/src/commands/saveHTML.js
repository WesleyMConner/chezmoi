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
exports.SaveHTML = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
class SaveHTML {
    constructor(engine) {
        this.engine = engine;
        this.id = 'asciidoc.saveHTML';
        this.engine = engine;
    }
    async execute() {
        const editor = vscode.window.activeTextEditor;
        if (editor === null || editor === undefined) {
            return;
        }
        const textDocument = editor.document;
        const docPath = path.parse(path.resolve(textDocument.fileName));
        let htmlPath;
        if (textDocument.isUntitled) {
            htmlPath = path.join(docPath.dir, 'untitled.html');
        }
        else {
            htmlPath = path.join(docPath.dir, docPath.name + '.html');
        }
        const { output: html } = await this.engine.export(textDocument, 'html5');
        fs.writeFile(htmlPath, html, function (err) {
            if (err) {
                vscode.window.showErrorMessage('Error writing file ' + htmlPath + '\n' + err.toString());
                return;
            }
            vscode.window.showInformationMessage('Successfully converted to ', htmlPath)
                .then((selection) => {
                if (selection === htmlPath) {
                    switch (process.platform) {
                        // Use backticks for unix systems to run the open command directly
                        // This avoids having to wrap the command AND path in quotes which
                        // breaks if there is a single quote (') in the path
                        case 'win32':
                            (0, child_process_1.exec)(`"${htmlPath.replace('"', '\\"')}"`);
                            break;
                        case 'darwin':
                            (0, child_process_1.exec)(`\`open "${htmlPath.replace('"', '\\"')}" ; exit\``);
                            break;
                        case 'linux':
                            (0, child_process_1.exec)(`\`xdg-open "${htmlPath.replace('"', '\\"')}" ; exit\``);
                            break;
                        default:
                            vscode.window.showWarningMessage('Output type is not supported');
                            break;
                    }
                }
            });
        });
    }
}
exports.SaveHTML = SaveHTML;
//# sourceMappingURL=saveHTML.js.map