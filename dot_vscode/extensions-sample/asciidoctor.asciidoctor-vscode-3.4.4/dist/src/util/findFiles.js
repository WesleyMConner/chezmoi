"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findFiles = void 0;
const vscode_1 = __importDefault(require("vscode"));
/**
 * Find files across all workspace folders in the workspace using a glob expression.
 * @param glob A glob pattern that defines the files to search for.
 */
async function findFiles(glob) {
    return vscode_1.default.workspace.findFiles(glob);
}
exports.findFiles = findFiles;
//# sourceMappingURL=findFiles.js.map