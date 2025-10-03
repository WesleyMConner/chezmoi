"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlenderWorkspaceFolder = void 0;
const path = require("path");
const vscode = require("vscode");
const blender_executable_1 = require("./blender_executable");
const utils_1 = require("./utils");
class BlenderWorkspaceFolder {
    constructor(folder) {
        this.folder = folder;
    }
    static async Get() {
        for (let folder of (0, utils_1.getWorkspaceFolders)()) {
            let blender = new BlenderWorkspaceFolder(folder);
            if (await blender.isValid()) {
                return blender;
            }
        }
        return null;
    }
    async isValid() {
        let paths = ['doc', 'source', 'release'].map(n => path.join(this.uri.fsPath, n));
        return (0, utils_1.pathsExist)(paths);
    }
    get uri() {
        return this.folder.uri;
    }
    get buildDebugCommand() {
        return this.getConfig().get('core.buildDebugCommand');
    }
    async buildDebug() {
        let execution = new vscode.ShellExecution(this.buildDebugCommand, { cwd: this.uri.fsPath });
        await (0, utils_1.runTask)('Build Blender', execution, true, this.folder);
    }
    async buildPythonDocs(part = undefined) {
        let api_folder = path.join(this.uri.fsPath, 'doc', 'python_api');
        let args = [
            '--background',
            '--factory-startup',
            '--python',
            path.join(api_folder, 'sphinx_doc_gen.py'),
        ];
        if (part !== undefined) {
            args.push('--');
            args.push('--partial');
            args.push(part);
        }
        let blender = await blender_executable_1.BlenderExecutable.GetAnyInteractive();
        await blender.launchWithCustomArgs('build api docs', args);
        let execution = new vscode.ProcessExecution('sphinx-build', [
            path.join(api_folder, 'sphinx-in'),
            path.join(api_folder, 'sphinx-out'),
        ]);
        await (0, utils_1.runTask)('generate html', execution, true);
    }
    getConfig() {
        return (0, utils_1.getConfig)(this.uri);
    }
}
exports.BlenderWorkspaceFolder = BlenderWorkspaceFolder;
//# sourceMappingURL=blender_folder.js.map