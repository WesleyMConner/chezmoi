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
exports.resetAntoraSupport = exports.enableAntoraSupport = exports.createLink = exports.createDirectory = exports.createDirectories = exports.createFile = exports.removeFiles = void 0;
const vscode_1 = __importStar(require("vscode"));
const workspace_1 = require("../util/workspace");
const helper_1 = require("./helper");
async function removeFiles(files) {
    for (const file of files) {
        if (await exists(file)) {
            await vscode_1.default.workspace.fs.delete(file, { recursive: true });
        }
    }
}
exports.removeFiles = removeFiles;
async function exists(file) {
    try {
        await vscode_1.default.workspace.fs.stat(file);
        return true;
    }
    catch (err) {
        if (err instanceof vscode_1.FileSystemError && err.code === 'FileNotFound') {
            return false;
        }
        else {
            throw err;
        }
    }
}
async function createFile(content, ...pathSegments) {
    const file = vscode_1.default.Uri.joinPath((0, workspace_1.getDefaultWorkspaceFolderUri)(), ...pathSegments);
    await vscode_1.default.workspace.fs.writeFile(file, Buffer.from(content));
    return (0, workspace_1.normalizeUri)(file);
}
exports.createFile = createFile;
async function createDirectories(...pathSegments) {
    const currentPath = [];
    for (const pathSegment of pathSegments) {
        currentPath.push(pathSegment);
        const dir = vscode_1.default.Uri.joinPath((0, workspace_1.getDefaultWorkspaceFolderUri)(), ...currentPath);
        try {
            const stat = await vscode_1.default.workspace.fs.stat(dir);
            if (stat.type === (vscode_1.FileType.Directory | vscode_1.FileType.SymbolicLink)) {
                // continue
            }
            else {
                await vscode_1.default.workspace.fs.createDirectory(dir);
            }
        }
        catch (err) {
            if (err instanceof vscode_1.FileSystemError && err.code === 'FileNotFound') {
                await vscode_1.default.workspace.fs.createDirectory(dir);
            }
            else {
                throw err;
            }
        }
    }
}
exports.createDirectories = createDirectories;
async function createDirectory(...pathSegments) {
    const dir = vscode_1.default.Uri.joinPath((0, workspace_1.getDefaultWorkspaceFolderUri)(), ...pathSegments);
    await vscode_1.default.workspace.fs.createDirectory(dir);
    return (0, workspace_1.normalizeUri)(dir);
}
exports.createDirectory = createDirectory;
async function createLink(existingPathSegments, newPathSegments) {
    const fs = require('fs').promises;
    const workspaceUri = (0, workspace_1.getDefaultWorkspaceFolderUri)();
    const existingPath = vscode_1.default.Uri.joinPath(workspaceUri, ...existingPathSegments);
    const newPath = vscode_1.default.Uri.joinPath(workspaceUri, ...newPathSegments);
    await fs.symlink(existingPath.fsPath, newPath.fsPath);
    return (0, workspace_1.normalizeUri)(newPath);
}
exports.createLink = createLink;
async function enableAntoraSupport() {
    await helper_1.extensionContext.workspaceState.update('antoraSupportSetting', true);
}
exports.enableAntoraSupport = enableAntoraSupport;
async function resetAntoraSupport() {
    await helper_1.extensionContext.workspaceState.update('antoraSupportSetting', undefined);
}
exports.resetAntoraSupport = resetAntoraSupport;
//# sourceMappingURL=workspaceHelper.js.map