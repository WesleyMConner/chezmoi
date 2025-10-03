"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddonWorkspaceFolder = void 0;
const path = require("path");
const vscode = require("vscode");
const utils_1 = require("./utils");
// TODO: It would be superior to use custom AddonFolder interface that is not bound to the
// vscode.WorkspaceFolder directly. The 'uri' property is only one used at this point.
class AddonWorkspaceFolder {
    constructor(folder) {
        this.folder = folder;
    }
    static async All() {
        // Search folders specified by settings first, if nothing is specified
        // search workspace folders instead.
        let addonFolders = await foldersToWorkspaceFoldersMockup((0, utils_1.getConfig)().get('addonFolders'));
        let searchableFolders = addonFolders.length !== 0 ? addonFolders : (0, utils_1.getWorkspaceFolders)();
        let folders = [];
        for (let folder of searchableFolders) {
            let addon = new AddonWorkspaceFolder(folder);
            if (await addon.hasAddonEntryPoint()) {
                folders.push(addon);
            }
        }
        return folders;
    }
    get uri() {
        return this.folder.uri;
    }
    get buildTaskName() {
        return this.getConfig().get('addon.buildTaskName');
    }
    get reloadOnSave() {
        return this.getConfig().get('addon.reloadOnSave');
    }
    get justMyCode() {
        return this.getConfig().get('addon.justMyCode');
    }
    async hasAddonEntryPoint() {
        try {
            let sourceDir = await this.getSourceDirectory();
            return folderContainsAddonEntry(sourceDir);
        }
        catch (err) {
            return false;
        }
    }
    async buildIfNecessary() {
        let taskName = this.buildTaskName;
        if (taskName === '')
            return Promise.resolve();
        await (0, utils_1.executeTask)(taskName, true);
    }
    getConfig() {
        return (0, utils_1.getConfig)(this.uri);
    }
    async getLoadDirectoryAndModuleName() {
        let load_dir = await this.getLoadDirectory();
        let module_name = await this.getModuleName();
        return {
            'load_dir': load_dir,
            'module_name': module_name,
        };
    }
    async getModuleName() {
        let value = (0, utils_1.getConfig)(this.uri).get('addon.moduleName');
        if (value === 'auto') {
            return path.basename(await this.getLoadDirectory());
        }
        else {
            return value;
        }
    }
    async getLoadDirectory() {
        let value = (0, utils_1.getConfig)(this.uri).get('addon.loadDirectory');
        if (value === 'auto') {
            return this.getSourceDirectory();
        }
        else {
            return this.makePathAbsolute(value);
        }
    }
    async getSourceDirectory() {
        let value = (0, utils_1.getConfig)(this.uri).get('addon.sourceDirectory');
        if (value === 'auto') {
            return await tryFindActualAddonFolder(this.uri.fsPath);
        }
        else {
            return this.makePathAbsolute(value);
        }
    }
    makePathAbsolute(directory) {
        if (path.isAbsolute(directory)) {
            return directory;
        }
        else {
            return path.join(this.uri.fsPath, directory);
        }
    }
}
exports.AddonWorkspaceFolder = AddonWorkspaceFolder;
async function tryFindActualAddonFolder(root) {
    if (await folderContainsAddonEntry(root))
        return root;
    for (let folder of await (0, utils_1.getSubfolders)(root)) {
        if (await folderContainsAddonEntry(folder)) {
            return folder;
        }
    }
    return Promise.reject(new Error('cannot find actual addon code, please set the path in the settings'));
}
async function folderContainsAddonEntry(folderPath) {
    let manifestPath = path.join(folderPath, "blender_manifest.toml");
    if (await (0, utils_1.pathExists)(manifestPath)) {
        return true;
    }
    let initPath = path.join(folderPath, '__init__.py');
    try {
        let content = await (0, utils_1.readTextFile)(initPath);
        return content.includes('bl_info');
    }
    catch {
        return false;
    }
}
async function foldersToWorkspaceFoldersMockup(folders) {
    let mockups = [];
    // Assume this functionality is only used with a single workspace folder for now.
    let rootFolder = (0, utils_1.getAnyWorkspaceFolder)();
    for (let i = 0; i < folders.length; i++) {
        let absolutePath;
        if (path.isAbsolute(folders[i])) {
            absolutePath = folders[i];
        }
        else {
            absolutePath = path.join(rootFolder.uri.fsPath, folders[i]);
        }
        let exists = await (0, utils_1.pathExists)(absolutePath);
        if (!exists) {
            vscode.window.showInformationMessage(`Revise settings, path to addon doesn't exist ${absolutePath}`);
            continue;
        }
        mockups.push({
            "name": path.basename(absolutePath),
            "uri": vscode.Uri.from({ scheme: "file", path: absolutePath }),
            "index": i
        });
    }
    return mockups;
}
//# sourceMappingURL=addon_folder.js.map