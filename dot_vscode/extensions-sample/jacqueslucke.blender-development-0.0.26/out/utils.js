"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancel = cancel;
exports.waitUntilTaskEnds = waitUntilTaskEnds;
exports.executeTask = executeTask;
exports.getWorkspaceFolders = getWorkspaceFolders;
exports.getAnyWorkspaceFolder = getAnyWorkspaceFolder;
exports.handleCommandWithArgsErrors = handleCommandWithArgsErrors;
exports.handleCommandErrors = handleCommandErrors;
exports.handleFileExplorerCommandErrors = handleFileExplorerCommandErrors;
exports.getRandomString = getRandomString;
exports.readTextFile = readTextFile;
exports.writeTextFile = writeTextFile;
exports.renamePath = renamePath;
exports.copyFile = copyFile;
exports.pathExists = pathExists;
exports.pathsExist = pathsExist;
exports.getSubfolders = getSubfolders;
exports.isDirectory = isDirectory;
exports.getConfig = getConfig;
exports.runTask = runTask;
exports.addFolderToWorkspace = addFolderToWorkspace;
exports.nameToIdentifier = nameToIdentifier;
exports.nameToClassIdentifier = nameToClassIdentifier;
exports.startsWithNumber = startsWithNumber;
exports.multiReplaceText = multiReplaceText;
exports.isValidPythonModuleName = isValidPythonModuleName;
exports.toTitleCase = toTitleCase;
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const crypto = require("crypto");
const CANCEL = 'CANCEL';
function cancel() {
    return new Error(CANCEL);
}
async function waitUntilTaskEnds(taskName) {
    return new Promise(resolve => {
        let disposable = vscode.tasks.onDidEndTask(e => {
            if (e.execution.task.name === taskName) {
                disposable.dispose();
                resolve();
            }
        });
    });
}
async function executeTask(taskName, wait = false) {
    await vscode.commands.executeCommand('workbench.action.tasks.runTask', taskName);
    if (wait) {
        await waitUntilTaskEnds(taskName);
    }
}
function getWorkspaceFolders() {
    let folders = vscode.workspace.workspaceFolders;
    if (folders === undefined)
        return [];
    else
        return folders;
}
function getAnyWorkspaceFolder() {
    let folders = getWorkspaceFolders();
    if (folders.length === 0) {
        throw new Error('no workspace folder found');
    }
    return folders[0];
}
function handleCommandWithArgsErrors(func) {
    return async (args) => {
        try {
            await func(args);
        }
        catch (err) {
            if (err instanceof Error) {
                if (err.message !== CANCEL) {
                    vscode.window.showErrorMessage(err.message);
                }
            }
        }
    };
}
function handleErrors(func, ...args) {
    return async () => {
        try {
            await func(...args);
        }
        catch (err) {
            if (err instanceof Error) {
                if (err.message !== CANCEL) {
                    vscode.window.showErrorMessage(err.message);
                }
            }
        }
    };
}
function handleCommandErrors(func) {
    return handleErrors(func);
}
function handleFileExplorerCommandErrors(func) {
    return (resources) => handleErrors(func, resources)();
}
function getRandomString(length = 10) {
    return crypto.randomBytes(length).toString('hex').substring(0, length);
}
function readTextFile(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', (err, data) => {
            if (err !== null) {
                reject(new Error(`Could not read the file: ${path}`));
            }
            else {
                resolve(data);
            }
        });
    });
}
async function writeTextFile(path, content) {
    return new Promise((resove, reject) => {
        fs.writeFile(path, content, err => {
            if (err !== null) {
                return reject(err);
            }
            else {
                resove();
            }
        });
    });
}
async function renamePath(oldPath, newPath) {
    return new Promise((resolve, reject) => {
        fs.rename(oldPath, newPath, err => {
            if (err !== null) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
async function copyFile(from, to) {
    return new Promise((resolve, reject) => {
        fs.copyFile(from, to, err => {
            if (err === null)
                resolve();
            else
                reject(err);
        });
    });
}
async function pathExists(path) {
    return new Promise(resolve => {
        fs.stat(path, (err, stats) => {
            resolve(err === null);
        });
    });
}
async function pathsExist(paths) {
    let promises = paths.map(p => pathExists(p));
    let results = await Promise.all(promises);
    return results.every(v => v);
}
async function getSubfolders(root) {
    return new Promise((resolve, reject) => {
        fs.readdir(root, { encoding: 'utf8' }, async (err, files) => {
            if (err !== null) {
                reject(err);
                return;
            }
            let folders = [];
            for (let name of files) {
                let fullpath = path.join(root, name);
                if (await isDirectory(fullpath)) {
                    folders.push(fullpath);
                }
            }
            resolve(folders);
        });
    });
}
async function isDirectory(filepath) {
    return new Promise(resolve => {
        fs.stat(filepath, (err, stat) => {
            if (err !== null)
                resolve(false);
            else
                resolve(stat.isDirectory());
        });
    });
}
function getConfig(resource = undefined) {
    return vscode.workspace.getConfiguration('blender', resource);
}
async function runTask(name, execution, wait = false, target = getAnyWorkspaceFolder(), identifier = getRandomString()) {
    let taskDefinition = { type: identifier };
    let source = 'blender';
    let problemMatchers = [];
    let task = new vscode.Task(taskDefinition, target, name, source, execution, problemMatchers);
    let taskExecution = await vscode.tasks.executeTask(task);
    if (wait) {
        return new Promise(resolve => {
            let disposable = vscode.tasks.onDidEndTask(e => {
                if (e.execution.task.definition.type === identifier) {
                    disposable.dispose();
                    resolve(taskExecution);
                }
            });
        });
    }
    else {
        return taskExecution;
    }
}
function addFolderToWorkspace(folder) {
    /* Warning: This might restart all extensions if there was no folder before. */
    vscode.workspace.updateWorkspaceFolders(getWorkspaceFolders().length, null, { uri: vscode.Uri.file(folder) });
}
function nameToIdentifier(name) {
    return name.toLowerCase().replace(/\W+/, '_');
}
function nameToClassIdentifier(name) {
    let parts = name.split(/\W+/);
    let result = '';
    let allowNumber = false;
    for (let part of parts) {
        if (part.length > 0 && (allowNumber || !startsWithNumber(part))) {
            result += part.charAt(0).toUpperCase() + part.slice(1);
            allowNumber = true;
        }
    }
    return result;
}
function startsWithNumber(text) {
    return text.charAt(0).match(/[0-9]/) !== null;
}
function multiReplaceText(text, replacements) {
    for (let old of Object.keys(replacements)) {
        let matcher = RegExp(old, 'g');
        text = text.replace(matcher, replacements[old]);
    }
    return text;
}
function isValidPythonModuleName(text) {
    let match = text.match(/^[_a-z][_0-9a-z]*$/i);
    return match !== null;
}
function toTitleCase(str) {
    return str.replace(/\w\S*/g, text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase());
}
//# sourceMappingURL=utils.js.map