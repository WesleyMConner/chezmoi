'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.outputChannel = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const utils_1 = require("./utils");
const new_addon_1 = require("./new_addon");
const new_operator_1 = require("./new_operator");
const addon_folder_1 = require("./addon_folder");
const blender_executable_1 = require("./blender_executable");
const blender_folder_1 = require("./blender_folder");
const communication_1 = require("./communication");
const scripts_1 = require("./scripts");
/* Registration
 *********************************************/
function activate(context) {
    exports.outputChannel = vscode.window.createOutputChannel("Blender debugpy");
    exports.outputChannel.appendLine("Addon starting.");
    exports.outputChannel.show(true);
    let commands = [
        ['blender.stop', COMMAND_stop],
        ['blender.build', COMMAND_build],
        ['blender.buildAndStart', COMMAND_buildAndStart],
        ['blender.startWithoutCDebugger', COMMAND_startWithoutCDebugger],
        ['blender.buildPythonApiDocs', COMMAND_buildPythonApiDocs],
        ['blender.reloadAddons', COMMAND_reloadAddons],
        ['blender.newAddon', new_addon_1.COMMAND_newAddon],
        ['blender.newScript', scripts_1.COMMAND_newScript],
        ['blender.openScriptsFolder', scripts_1.COMMAND_openScriptsFolder],
        ['blender.openFiles', COMMAND_openFiles],
    ];
    let textEditorCommands = [
        ['blender.runScript', scripts_1.COMMAND_runScript],
        ['blender.setScriptContext', scripts_1.COMMAND_setScriptContext],
        ['blender.newOperator', new_operator_1.COMMAND_newOperator],
    ];
    let fileExplorerCommands = [
        ['blender.openWithBlender', COMMAND_openWithBlender],
    ];
    let disposables = [
        vscode.workspace.onDidSaveTextDocument(HANDLER_updateOnSave),
    ];
    const startCom = vscode.commands.registerCommand('blender.start', (0, utils_1.handleCommandWithArgsErrors)(COMMAND_start));
    disposables.push(startCom);
    for (const [identifier, func] of commands) {
        const command = vscode.commands.registerCommand(identifier, (0, utils_1.handleCommandErrors)(func));
        disposables.push(command);
    }
    for (const [identifier, func] of textEditorCommands) {
        const command = vscode.commands.registerTextEditorCommand(identifier, (0, utils_1.handleCommandErrors)(func));
        disposables.push(command);
    }
    for (const [identifier, func] of fileExplorerCommands) {
        const command = vscode.commands.registerCommand(identifier, (0, utils_1.handleFileExplorerCommandErrors)(func));
        disposables.push(command);
    }
    context.subscriptions.push(...disposables);
    (0, communication_1.startServer)();
}
function deactivate() {
    (0, communication_1.stopServer)();
}
/* Commands
 *********************************************/
async function COMMAND_buildAndStart() {
    await COMMAND_build();
    await COMMAND_start(undefined);
}
async function COMMAND_start(args) {
    // args are used for example in calls from keybindings
    let blenderFolder = await blender_folder_1.BlenderWorkspaceFolder.Get();
    if (blenderFolder === null) {
        if (args !== undefined && args.blenderExecutable !== undefined) {
            if (args.blenderExecutable.path === undefined) {
                await blender_executable_1.BlenderExecutable.LaunchAnyInteractive();
                return;
            }
            const executable = new blender_executable_1.BlenderExecutable(args.blenderExecutable);
            await blender_executable_1.BlenderExecutable.LaunchAny(executable, undefined);
        }
        else {
            await blender_executable_1.BlenderExecutable.LaunchAnyInteractive();
        }
    }
    else {
        if (args !== undefined && args.blenderExecutable !== undefined) {
            if (args.blenderExecutable.path === undefined) {
                await blender_executable_1.BlenderExecutable.LaunchDebugInteractive(blenderFolder, undefined);
                return;
            }
            const executable = new blender_executable_1.BlenderExecutable(args.blenderExecutable);
            await blender_executable_1.BlenderExecutable.LaunchDebug(executable, blenderFolder, undefined);
        }
        else {
            await blender_executable_1.BlenderExecutable.LaunchDebugInteractive(blenderFolder, undefined);
        }
    }
}
async function COMMAND_openWithBlender(resource) {
    startBlender([resource.fsPath]);
}
async function COMMAND_openFiles() {
    let resources = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: true,
        filters: { 'Blender files': ['blend'] },
        openLabel: "Select .blend file(s)"
    });
    if (resources === undefined) {
        return Promise.reject(new Error('No .blend file selected.'));
    }
    startBlender(resources.map(r => r.fsPath));
}
async function startBlender(blend_filepaths) {
    let blenderFolder = await blender_folder_1.BlenderWorkspaceFolder.Get();
    if (blenderFolder === null) {
        await blender_executable_1.BlenderExecutable.LaunchAnyInteractive(blend_filepaths);
    }
    else {
        await blender_executable_1.BlenderExecutable.LaunchDebugInteractive(blenderFolder, blend_filepaths);
    }
}
async function COMMAND_stop() {
    communication_1.RunningBlenders.sendToAll({ type: 'stop' });
}
async function COMMAND_build() {
    await rebuildAddons(await addon_folder_1.AddonWorkspaceFolder.All());
    let blenderFolder = await blender_folder_1.BlenderWorkspaceFolder.Get();
    if (blenderFolder !== null) {
        await blenderFolder.buildDebug();
    }
}
async function COMMAND_startWithoutCDebugger() {
    await blender_executable_1.BlenderExecutable.LaunchAnyInteractive();
}
async function COMMAND_buildPythonApiDocs() {
    let folder = await blender_folder_1.BlenderWorkspaceFolder.Get();
    if (folder === null) {
        vscode.window.showInformationMessage('Cannot generate API docs without Blender source code.');
        return;
    }
    let part = await vscode.window.showInputBox({ placeHolder: 'part' });
    if (part === undefined)
        return;
    await folder.buildPythonDocs(part);
}
let isSavingForReload = false;
async function COMMAND_reloadAddons() {
    isSavingForReload = true;
    await vscode.workspace.saveAll(false);
    isSavingForReload = false;
    await reloadAddons(await addon_folder_1.AddonWorkspaceFolder.All());
}
async function reloadAddons(addons) {
    if (addons.length === 0)
        return;
    let instances = await communication_1.RunningBlenders.getResponsive();
    if (instances.length === 0)
        return;
    await rebuildAddons(addons);
    let names = await Promise.all(addons.map(a => a.getModuleName()));
    // Send source dirs so that the python script can determine if each addon is an extension or not.
    let dirs = await Promise.all(addons.map(a => a.getSourceDirectory()));
    instances.forEach(instance => instance.post({ type: 'reload', names: names, dirs: dirs }));
}
async function rebuildAddons(addons) {
    await Promise.all(addons.map(a => a.buildIfNecessary()));
}
/* Event Handlers
 ***************************************/
async function HANDLER_updateOnSave(document) {
    if (isSavingForReload)
        return;
    let addons = await addon_folder_1.AddonWorkspaceFolder.All();
    await reloadAddons(addons.filter(a => a.reloadOnSave));
}
//# sourceMappingURL=extension.js.map