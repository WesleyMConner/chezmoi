"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMAND_runScript = COMMAND_runScript;
exports.COMMAND_newScript = COMMAND_newScript;
exports.COMMAND_openScriptsFolder = COMMAND_openScriptsFolder;
exports.COMMAND_setScriptContext = COMMAND_setScriptContext;
exports.getStoredScriptFolders = getStoredScriptFolders;
const vscode = require("vscode");
const path = require("path");
const paths_1 = require("./paths");
const communication_1 = require("./communication");
const select_utils_1 = require("./select_utils");
const data_loader_1 = require("./data_loader");
const utils_1 = require("./utils");
const extension_1 = require("./extension");
async function COMMAND_runScript() {
    let editor = vscode.window.activeTextEditor;
    if (editor === undefined)
        return Promise.reject(new Error('no active script'));
    const document = editor.document;
    extension_1.outputChannel.appendLine(`Blender: Run Script: ${document.uri.fsPath}`);
    await document.save();
    communication_1.RunningBlenders.sendToResponsive({ type: 'script', path: document.uri.fsPath });
}
async function COMMAND_newScript() {
    let [folderPath, filePath] = await getPathForNewScript();
    await createNewScriptAtPath(filePath);
    await vscode.window.showTextDocument(vscode.Uri.file(filePath));
    await vscode.commands.executeCommand('cursorBottom');
    (0, utils_1.addFolderToWorkspace)(folderPath);
}
async function COMMAND_openScriptsFolder() {
    let folderPath = await getFolderForScripts();
    (0, utils_1.addFolderToWorkspace)(folderPath);
}
async function COMMAND_setScriptContext() {
    let editor = vscode.window.activeTextEditor;
    if (editor === undefined)
        return;
    let items = (await (0, data_loader_1.getAreaTypeItems)()).map(item => ({ label: item.name, description: item.identifier }));
    let item = await (0, select_utils_1.letUserPickItem)(items);
    await setScriptContext(editor.document, item.description);
}
async function setScriptContext(document, areaType) {
    let workspaceEdit = new vscode.WorkspaceEdit();
    let [line, match] = findAreaContextLine(document);
    if (match === null) {
        workspaceEdit.insert(document.uri, new vscode.Position(0, 0), `# context.area: ${areaType}\n`);
    }
    else {
        let start = new vscode.Position(line, match[0].length);
        let end = new vscode.Position(line, document.lineAt(line).range.end.character);
        let range = new vscode.Range(start, end);
        workspaceEdit.replace(document.uri, range, areaType);
    }
    await vscode.workspace.applyEdit(workspaceEdit);
}
function findAreaContextLine(document) {
    for (let i = 0; i < document.lineCount; i++) {
        let line = document.lineAt(i);
        let match = line.text.match(/^\s*#\s*context\.area\s*:\s*/i);
        if (match !== null) {
            return [i, match];
        }
    }
    return [-1, null];
}
async function getPathForNewScript() {
    let folderPath = await getFolderForScripts();
    let fileName = await askUser_ScriptFileName(folderPath);
    let filePath = path.join(folderPath, fileName);
    if (await (0, utils_1.pathExists)(filePath)) {
        return Promise.reject(new Error('file exists already'));
    }
    return [folderPath, filePath];
}
async function createNewScriptAtPath(filePath) {
    let defaultScriptPath = path.join(paths_1.templateFilesDir, 'script.py');
    await (0, utils_1.copyFile)(defaultScriptPath, filePath);
}
async function getFolderForScripts() {
    let scriptFolders = getStoredScriptFolders();
    let items = [];
    for (let folderData of scriptFolders) {
        let useCustomName = folderData.name !== '';
        items.push({
            label: useCustomName ? folderData.name : folderData.path,
            data: async () => folderData,
        });
    }
    items.push({
        label: 'New Folder...',
        data: askUser_ScriptFolder,
    });
    let item = await (0, select_utils_1.letUserPickItem)(items);
    let folderData = await item.data();
    if (scriptFolders.find(data => data.path === folderData.path) === undefined) {
        scriptFolders.push(folderData);
        let config = (0, utils_1.getConfig)();
        config.update('scripts.directories', scriptFolders, vscode.ConfigurationTarget.Global);
    }
    return folderData.path;
}
function getStoredScriptFolders() {
    let config = (0, utils_1.getConfig)();
    return config.get('scripts.directories');
}
async function askUser_ScriptFolder() {
    let value = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Script Folder'
    });
    if (value === undefined)
        return Promise.reject((0, utils_1.cancel)());
    return {
        path: value[0].fsPath,
        name: ''
    };
}
async function askUser_ScriptFileName(folder) {
    let defaultName = await getDefaultScriptName(folder);
    let name = await vscode.window.showInputBox({
        value: defaultName
    });
    if (name === undefined)
        return Promise.reject((0, utils_1.cancel)());
    if (!name.toLowerCase().endsWith('.py')) {
        name += '.py';
    }
    return name;
}
async function getDefaultScriptName(folder) {
    while (true) {
        let name = 'script ' + (0, utils_1.getRandomString)(10) + '.py';
        if (!(await (0, utils_1.pathExists)(path.join(folder, name)))) {
            return name;
        }
    }
}
//# sourceMappingURL=scripts.js.map