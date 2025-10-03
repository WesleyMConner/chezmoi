"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeUri = exports.getDefaultWorkspaceFolderUri = exports.findDefaultWorkspaceFolderUri = exports.getWorkspaceFolders = exports.getWorkspaceFolder = void 0;
const vscode_1 = __importDefault(require("vscode"));
const os_1 = __importDefault(require("os"));
const driveLetterRx = /(?<=^\/)([A-Z])(?=:\/)/;
function getWorkspaceFolder(uri) {
    const workspaceFolder = vscode_1.default.workspace.getWorkspaceFolder(uri);
    if (workspaceFolder && os_1.default.platform() === 'win32') {
        return {
            uri: normalizeUri(workspaceFolder.uri),
            name: workspaceFolder.name,
            index: workspaceFolder.index,
        };
    }
    return workspaceFolder;
}
exports.getWorkspaceFolder = getWorkspaceFolder;
function getWorkspaceFolders() {
    return vscode_1.default.workspace.workspaceFolders?.map((workspaceFolder) => {
        if (os_1.default.platform() === 'win32') {
            return {
                uri: normalizeUri(workspaceFolder.uri),
                name: workspaceFolder.name,
                index: workspaceFolder.index,
            };
        }
        return workspaceFolder;
    });
}
exports.getWorkspaceFolders = getWorkspaceFolders;
function findDefaultWorkspaceFolderUri() {
    const workspaceFolders = getWorkspaceFolders();
    if (workspaceFolders && workspaceFolders.length) {
        return workspaceFolders[0].uri;
    }
    return undefined;
}
exports.findDefaultWorkspaceFolderUri = findDefaultWorkspaceFolderUri;
function getDefaultWorkspaceFolderUri() {
    const workspaceFolders = getWorkspaceFolders();
    return normalizeUri(workspaceFolders[0].uri);
}
exports.getDefaultWorkspaceFolderUri = getDefaultWorkspaceFolderUri;
function normalizeUri(uri) {
    // normalize Windows drive letter
    // https://github.com/microsoft/vscode/issues/194692
    if (os_1.default.platform() === 'win32') {
        return uri.with({ path: uri.path.replace(driveLetterRx, (driverLetter) => driverLetter.toLowerCase()) });
    }
    return uri;
}
exports.normalizeUri = normalizeUri;
//# sourceMappingURL=workspace.js.map