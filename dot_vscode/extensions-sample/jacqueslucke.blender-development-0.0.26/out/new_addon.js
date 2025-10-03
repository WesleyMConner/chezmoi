"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMAND_newAddon = COMMAND_newAddon;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const paths_1 = require("./paths");
const select_utils_1 = require("./select_utils");
const utils_1 = require("./utils");
const addonTemplateDir = path.join(paths_1.templateFilesDir, 'addons');
const manifestFile = path.join(paths_1.templateFilesDir, 'blender_manifest.toml');
async function COMMAND_newAddon() {
    let builder = await getNewAddonGenerator();
    let [addonName, authorName, supportLegacy] = await askUser_SettingsForNewAddon();
    let folderPath = await getFolderForNewAddon();
    folderPath = await fixAddonFolderName(folderPath);
    let mainPath = await builder(folderPath, addonName, authorName, supportLegacy);
    await vscode.window.showTextDocument(vscode.Uri.file(mainPath));
    (0, utils_1.addFolderToWorkspace)(folderPath);
}
async function getNewAddonGenerator() {
    let items = [];
    items.push({ label: 'Simple', data: generateAddon_Simple });
    items.push({ label: 'With Auto Load', data: generateAddon_WithAutoLoad });
    let item = await (0, select_utils_1.letUserPickItem)(items, 'Choose Template');
    return item.data;
}
async function getFolderForNewAddon() {
    let items = [];
    for (let workspaceFolder of (0, utils_1.getWorkspaceFolders)()) {
        let folderPath = workspaceFolder.uri.fsPath;
        if (await canAddonBeCreatedInFolder(folderPath)) {
            items.push({ data: async () => folderPath, label: folderPath });
        }
    }
    if (items.length > 0) {
        items.push({ data: selectFolderForAddon, label: 'Open Folder...' });
        let item = await (0, select_utils_1.letUserPickItem)(items);
        return await item.data();
    }
    else {
        return await selectFolderForAddon();
    }
}
async function selectFolderForAddon() {
    let value = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'New Addon'
    });
    if (value === undefined)
        return Promise.reject((0, utils_1.cancel)());
    let folderPath = value[0].fsPath;
    if (!(await canAddonBeCreatedInFolder(folderPath))) {
        let message = 'Cannot create new addon in this folder.';
        message += ' Maybe it contains other files already.';
        return Promise.reject(new Error(message));
    }
    return folderPath;
}
async function canAddonBeCreatedInFolder(folder) {
    return new Promise(resolve => {
        fs.stat(folder, (err, stat) => {
            if (err !== null) {
                resolve(false);
                return;
            }
            if (!stat.isDirectory()) {
                resolve(false);
                return;
            }
            fs.readdir(folder, {}, (err, files) => {
                for (let name of files) {
                    if (!name.startsWith('.')) {
                        resolve(false);
                        return;
                    }
                }
                resolve(true);
            });
        });
    });
}
async function fixAddonFolderName(folder) {
    let name = path.basename(folder);
    if ((0, utils_1.isValidPythonModuleName)(name)) {
        return folder;
    }
    let items = [];
    let alternatives = getFolderNameAlternatives(name).map(newName => path.join(path.dirname(folder), newName));
    items.push(...alternatives.filter(async (p) => !(await (0, utils_1.pathExists)(p))).map(p => ({ label: p, data: p })));
    items.push({ label: "Don't change the name.", data: folder });
    let item = await (0, select_utils_1.letUserPickItem)(items, 'Warning: This folder name should not be used.');
    let newPath = item.data;
    if (folder !== newPath) {
        (0, utils_1.renamePath)(folder, newPath);
    }
    return newPath;
}
function getFolderNameAlternatives(name) {
    let alternatives = [];
    alternatives.push(name.replace(/\W/, '_'));
    alternatives.push(name.replace(/\W/, ''));
    return alternatives;
}
async function askUser_SettingsForNewAddon() {
    let addonName = await vscode.window.showInputBox({ placeHolder: 'Addon Name' });
    if (addonName === undefined) {
        return Promise.reject((0, utils_1.cancel)());
    }
    else if (addonName === "") {
        return Promise.reject(new Error('Can\'t create an addon without a name.'));
    }
    let authorName = await vscode.window.showInputBox({ placeHolder: 'Your Name' });
    if (authorName === undefined) {
        return Promise.reject((0, utils_1.cancel)());
    }
    else if (authorName === "") {
        return Promise.reject(new Error('Can\'t create an addon without an author name.'));
    }
    let items = [];
    items.push({ label: "Yes", data: true });
    items.push({ label: "No", data: false });
    let item = await (0, select_utils_1.letUserPickItem)(items, "Support legacy Blender versions (<4.2)?");
    let supportLegacy = item.data;
    return [addonName, authorName, supportLegacy];
}
async function generateAddon_Simple(folder, addonName, authorName, supportLegacy) {
    let srcDir = path.join(addonTemplateDir, 'simple');
    let initSourcePath = path.join(srcDir, '__init__.py');
    let initTargetPath = path.join(folder, '__init__.py');
    await copyModifiedInitFile(initSourcePath, initTargetPath, addonName, authorName, supportLegacy);
    let manifestTargetPath = path.join(folder, 'blender_manifest.toml');
    await copyModifiedManifestFile(manifestFile, manifestTargetPath, addonName, authorName);
    return manifestTargetPath;
}
async function generateAddon_WithAutoLoad(folder, addonName, authorName, supportLegacy) {
    let srcDir = path.join(addonTemplateDir, 'with_auto_load');
    let initSourcePath = path.join(srcDir, '__init__.py');
    let initTargetPath = path.join(folder, '__init__.py');
    await copyModifiedInitFile(initSourcePath, initTargetPath, addonName, authorName, supportLegacy);
    let manifestTargetPath = path.join(folder, 'blender_manifest.toml');
    await copyModifiedManifestFile(manifestFile, manifestTargetPath, addonName, authorName);
    let autoLoadSourcePath = path.join(srcDir, 'auto_load.py');
    let autoLoadTargetPath = path.join(folder, 'auto_load.py');
    await copyFileWithReplacedText(autoLoadSourcePath, autoLoadTargetPath, {});
    try {
        let defaultFilePath = path.join(folder, await getDefaultFileName());
        if (!(await (0, utils_1.pathExists)(defaultFilePath))) {
            await (0, utils_1.writeTextFile)(defaultFilePath, 'import bpy\n');
        }
        return defaultFilePath;
    }
    catch {
        return manifestTargetPath;
    }
}
async function getDefaultFileName() {
    let items = [];
    items.push({ label: '__init__.py' });
    items.push({ label: 'operators.py' });
    let item = await (0, select_utils_1.letUserPickItem)(items, 'Open File');
    return item.label;
}
async function copyModifiedInitFile(src, dst, addonName, authorName, supportLegacy) {
    let replacements;
    // Remove bl_info if not supporting legacy addon system
    if (supportLegacy) {
        replacements = {
            ADDON_NAME: (0, utils_1.toTitleCase)(addonName),
            AUTHOR_NAME: authorName,
        };
    }
    else {
        // https://regex101.com/r/RmBWrk/1
        replacements = {
            'bl_info.+=.+{[\\s\\S]*}\\s*': '',
        };
    }
    await copyFileWithReplacedText(src, dst, replacements);
}
async function copyModifiedManifestFile(src, dst, addonName, authorName) {
    let replacements = {
        ADDON_ID: addonName.toLowerCase().replace(/\s/g, '_'),
        ADDON_NAME: (0, utils_1.toTitleCase)(addonName),
        AUTHOR_NAME: authorName,
    };
    await copyFileWithReplacedText(src, dst, replacements);
}
async function copyFileWithReplacedText(src, dst, replacements) {
    let text = await (0, utils_1.readTextFile)(src);
    let new_text = (0, utils_1.multiReplaceText)(text, replacements);
    await (0, utils_1.writeTextFile)(dst, new_text);
}
//# sourceMappingURL=new_addon.js.map