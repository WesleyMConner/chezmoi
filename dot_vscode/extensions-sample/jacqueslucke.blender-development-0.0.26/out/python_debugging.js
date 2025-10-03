"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachPythonDebuggerToBlender = attachPythonDebuggerToBlender;
const path = require("path");
const vscode = require("vscode");
const os = require("os");
const blender_folder_1 = require("./blender_folder");
const scripts_1 = require("./scripts");
const extension_1 = require("./extension");
const utils_1 = require("./utils");
async function attachPythonDebuggerToBlender(port, blenderPath, justMyCode, scriptsFolder, addonPathMappings) {
    let mappings = await getPythonPathMappings(scriptsFolder, addonPathMappings);
    attachPythonDebugger(port, justMyCode, mappings);
}
function attachPythonDebugger(port, justMyCode, pathMappings = []) {
    let configuration = {
        name: `Python at Port ${port}`,
        request: "attach",
        type: 'python',
        port: port,
        host: 'localhost',
        pathMappings: pathMappings,
        justMyCode: justMyCode
    };
    extension_1.outputChannel.appendLine("Python debug configuration: " + JSON.stringify(configuration, undefined, 2));
    vscode.debug.startDebugging(undefined, configuration);
}
async function getPythonPathMappings(scriptsFolder, addonPathMappings) {
    let mappings = [];
    // first, add the mapping to the addon as it is the most specific one.
    mappings.push(...addonPathMappings.map(item => ({
        localRoot: item.src,
        remoteRoot: item.load
    })));
    // add optional scripts folders
    for (let folder of (0, scripts_1.getStoredScriptFolders)()) {
        mappings.push({
            localRoot: folder.path,
            remoteRoot: folder.path
        });
    }
    // add blender scripts last, otherwise it seem to take all the scope and not let the proper mapping of other files
    mappings.push(await getBlenderScriptsPathMapping(scriptsFolder));
    // add the workspace folder as last resort for mapping loose scripts inside it
    let wsFolder = (0, utils_1.getAnyWorkspaceFolder)();
    mappings.push({
        localRoot: wsFolder.uri.fsPath,
        remoteRoot: wsFolder.uri.fsPath
    });
    // change drive letter for some systems
    fixMappings(mappings);
    return mappings;
}
async function getBlenderScriptsPathMapping(scriptsFolder) {
    let blender = await blender_folder_1.BlenderWorkspaceFolder.Get();
    if (blender !== null) {
        return {
            localRoot: path.join(blender.uri.fsPath, 'release', 'scripts'),
            remoteRoot: scriptsFolder
        };
    }
    else {
        return {
            localRoot: scriptsFolder,
            remoteRoot: scriptsFolder
        };
    }
}
function fixMappings(mappings) {
    for (let i = 0; i < mappings.length; i++) {
        mappings[i].localRoot = fixPath(mappings[i].localRoot);
    }
}
/* This is to work around a bug where vscode does not find
 * the path: c:\... but only C:\... on windows.
 * https://github.com/Microsoft/vscode-python/issues/2976 */
function fixPath(filepath) {
    if (os.platform() !== 'win32')
        return filepath;
    if (filepath.match(/^[a-zA-Z]:/) !== null) {
        return filepath[0].toUpperCase() + filepath.substring(1);
    }
    return filepath;
}
//# sourceMappingURL=python_debugging.js.map