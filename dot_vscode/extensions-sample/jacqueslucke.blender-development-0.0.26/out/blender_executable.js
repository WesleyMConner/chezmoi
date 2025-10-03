"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlenderExecutable = void 0;
const os = require("os");
const path = require("path");
const vscode = require("vscode");
const child_process = require("child_process");
const fs = require("fs");
const util = require("util");
const paths_1 = require("./paths");
const communication_1 = require("./communication");
const select_utils_1 = require("./select_utils");
const utils_1 = require("./utils");
const addon_folder_1 = require("./addon_folder");
const extension_1 = require("./extension");
const blender_executable_windows_1 = require("./blender_executable_windows");
const blender_executable_linux_1 = require("./blender_executable_linux");
const stat = util.promisify(fs.stat);
class BlenderExecutable {
    constructor(data) {
        this.data = data;
    }
    static async GetAnyInteractive() {
        let data = await getFilteredBlenderPath({
            label: 'Blender Executable',
            selectNewLabel: 'Choose a new Blender executable...',
            predicate: () => true,
            setSettings: () => { }
        });
        return new BlenderExecutable(data);
    }
    static async GetDebugInteractive() {
        let data = await getFilteredBlenderPath({
            label: 'Debug Build',
            selectNewLabel: 'Choose a new debug build...',
            predicate: item => item.isDebug,
            setSettings: item => { item.isDebug = true; }
        });
        return new BlenderExecutable(data);
    }
    static async LaunchAnyInteractive(blend_filepaths) {
        const executable = await this.GetAnyInteractive();
        await this.LaunchAny(executable, blend_filepaths);
    }
    static async LaunchAny(executable, blend_filepaths) {
        if (blend_filepaths === undefined || !blend_filepaths.length) {
            await executable.launch();
            return;
        }
        for (const blend_filepath of blend_filepaths) {
            await executable.launch(blend_filepath);
        }
    }
    static async LaunchDebugInteractive(folder, blend_filepaths) {
        const executable = await this.GetAnyInteractive();
        await this.LaunchDebug(executable, folder, blend_filepaths);
    }
    static async LaunchDebug(executable, folder, blend_filepaths) {
        if (blend_filepaths === undefined || !blend_filepaths.length) {
            await executable.launchDebug(folder);
            return;
        }
        for (const blend_filepath of blend_filepaths) {
            await executable.launchDebug(folder, blend_filepath);
        }
    }
    get path() {
        return this.data.path;
    }
    async launch(blend_filepath) {
        const blenderArgs = getBlenderLaunchArgs(blend_filepath);
        const execution = new vscode.ProcessExecution(this.path, blenderArgs, { env: await getBlenderLaunchEnv() });
        extension_1.outputChannel.appendLine(`Starting blender: ${this.path} ${blenderArgs.join(' ')}`);
        extension_1.outputChannel.appendLine('With ENV Vars: ' + JSON.stringify(execution.options?.env, undefined, 2));
        await (0, utils_1.runTask)('blender', execution);
    }
    async launchDebug(folder, blend_filepath) {
        const env = await getBlenderLaunchEnv();
        let configuration = {
            name: 'Debug Blender',
            type: 'cppdbg',
            request: 'launch',
            program: this.data.path,
            args: ['--debug'].concat(getBlenderLaunchArgs(blend_filepath)),
            environment: Object.entries(env).map(([key, value]) => { return { name: key, value }; }),
            stopAtEntry: false,
            MIMode: 'gdb',
            cwd: folder.uri.fsPath,
        };
        vscode.debug.startDebugging(folder.folder, configuration);
    }
    async launchWithCustomArgs(taskName, args) {
        const execution = new vscode.ProcessExecution(this.path, args);
        await (0, utils_1.runTask)(taskName, execution, true);
    }
}
exports.BlenderExecutable = BlenderExecutable;
async function searchBlenderInSystem() {
    const blenders = [];
    if (process.platform === "win32") {
        const windowsBlenders = await (0, blender_executable_windows_1.getBlenderWindows)();
        blenders.push(...windowsBlenders.map(blend_path => ({ path: blend_path, name: "", isDebug: false })));
    }
    const separator = process.platform === "win32" ? ";" : ":";
    const path_env = process.env.PATH?.split(separator);
    if (path_env === undefined) {
        return blenders;
    }
    const exe = process.platform === "win32" ? "blender.exe" : "blender";
    for (const p of path_env) {
        const executable = path.join(p, exe);
        const stats = await stat(executable).catch((err) => undefined);
        if (stats === undefined || !stats?.isFile())
            continue;
        blenders.push({ path: executable, name: "", isDebug: false, linuxInode: stats.ino });
    }
    return blenders;
}
async function getFilteredBlenderPath(type) {
    let result = [];
    {
        const blenderPathsInSystem = await searchBlenderInSystem();
        const deduplicatedBlenderPaths = deduplicateSamePaths(blenderPathsInSystem);
        if (process.platform !== 'win32') {
            try {
                result = await (0, blender_executable_linux_1.deduplicateSameHardLinks)(deduplicatedBlenderPaths, true);
            }
            catch { // weird cases as network attached storage or FAT32 file system are not tested
                result = deduplicatedBlenderPaths;
            }
        }
        else {
            result = deduplicatedBlenderPaths;
        }
    }
    const config = (0, utils_1.getConfig)();
    const settingsBlenderPaths = config.get('executables').filter(type.predicate);
    { // deduplicate Blender paths twice: it preserves proper order in UI
        const deduplicatedBlenderPaths = deduplicateSamePaths(result, settingsBlenderPaths);
        if (process.platform !== 'win32') {
            try {
                result = [...settingsBlenderPaths, ...await (0, blender_executable_linux_1.deduplicateSameHardLinks)(deduplicatedBlenderPaths, false, settingsBlenderPaths)];
            }
            catch { // weird cases as network attached storage or FAT32 file system are not tested
                result = [...settingsBlenderPaths, ...deduplicatedBlenderPaths];
            }
        }
        else {
            result = [...settingsBlenderPaths, ...deduplicatedBlenderPaths];
        }
    }
    const quickPickItems = [];
    for (const blenderPath of result) {
        quickPickItems.push({
            data: async () => blenderPath,
            label: blenderPath.name || blenderPath.path,
            description: await stat(path.isAbsolute(blenderPath.path) ? blenderPath.path : path.join((0, utils_1.getAnyWorkspaceFolder)().uri.fsPath, blenderPath.path)).then(_stats => undefined).catch((err) => "File does not exist")
        });
    }
    // last option opens interactive window
    quickPickItems.push({ label: type.selectNewLabel, data: async () => askUser_FilteredBlenderPath(type) });
    const pickedItem = await (0, select_utils_1.letUserPickItem)(quickPickItems);
    const pathData = await pickedItem.data();
    // update VScode settings
    if (settingsBlenderPaths.find(data => data.path === pathData.path) === undefined) {
        settingsBlenderPaths.push(pathData);
        const toSave = settingsBlenderPaths.map(item => { return { 'name': item.name, 'isDebug': item.isDebug, 'path': item.path }; });
        config.update('executables', toSave, vscode.ConfigurationTarget.Global);
    }
    return pathData;
}
function deduplicateSamePaths(blenderPathsToReduce, additionalBlenderPaths = []) {
    const deduplicatedBlenderPaths = [];
    const uniqueBlenderPaths = [];
    const isTheSamePath = (path_one, path_two) => path.relative(path_one, path_two) === '';
    for (const item of blenderPathsToReduce) {
        if (uniqueBlenderPaths.some(path => isTheSamePath(item.path, path))) {
            continue;
        }
        if (additionalBlenderPaths.some(blenderPath => isTheSamePath(item.path, blenderPath.path))) {
            continue;
        }
        uniqueBlenderPaths.push(item.path);
        deduplicatedBlenderPaths.push(item);
    }
    return deduplicatedBlenderPaths;
}
async function askUser_FilteredBlenderPath(type) {
    let filepath = await askUser_BlenderPath(type.label);
    let pathData = {
        path: filepath,
        name: '',
        isDebug: false,
    };
    type.setSettings(pathData);
    return pathData;
}
async function askUser_BlenderPath(openLabel) {
    let value = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        openLabel: openLabel
    });
    if (value === undefined)
        return Promise.reject((0, utils_1.cancel)());
    let filepath = value[0].fsPath;
    if (os.platform() === 'darwin') {
        if (filepath.toLowerCase().endsWith('.app')) {
            filepath += '/Contents/MacOS/blender';
        }
    }
    await testIfPathIsBlender(filepath);
    return filepath;
}
async function testIfPathIsBlender(filepath) {
    let name = path.basename(filepath);
    if (!name.toLowerCase().startsWith('blender')) {
        return Promise.reject(new Error('Expected executable name to begin with \'blender\''));
    }
    let testString = '###TEST_BLENDER###';
    let command = `"${filepath}" --factory-startup -b --python-expr "import sys;print('${testString}');sys.stdout.flush();sys.exit()"`;
    return new Promise((resolve, reject) => {
        child_process.exec(command, {}, (err, stdout, stderr) => {
            let text = stdout.toString();
            if (!text.includes(testString)) {
                var message = 'A simple check to test if the selected file is Blender failed.';
                message += ' Please create a bug report when you are sure that the selected file is Blender 2.8 or newer.';
                message += ' The report should contain the full path to the executable.';
                reject(new Error(message));
            }
            else {
                resolve();
            }
        });
    });
}
function getBlenderLaunchArgs(blend_filepath) {
    const config = (0, utils_1.getConfig)();
    let additional_args = [];
    if (blend_filepath !== undefined) {
        if (!fs.existsSync(blend_filepath)) {
            new Error(`File does not exist: '${blend_filepath}'`);
        }
        let pre_args = config.get("preFileArguments", []);
        let post_args = config.get("postFileArguments", []);
        for (const [index, arg] of pre_args.entries()) {
            if (arg === "--" || arg.startsWith("-- ")) {
                extension_1.outputChannel.appendLine(`WARNING: ignoring any remainning arguments: '--' arument can not be in preFileArguments. Please put arguemnts [${pre_args.slice(index).toString()}] in postFileArguments`);
                break;
            }
            additional_args.push(arg);
        }
        additional_args.push(blend_filepath);
        additional_args = additional_args.concat(post_args);
    }
    else {
        additional_args = config.get("additionalArguments", []);
    }
    const args = ['--python', paths_1.launchPath].concat(additional_args);
    return args;
}
async function getBlenderLaunchEnv() {
    let config = (0, utils_1.getConfig)();
    let addons = await addon_folder_1.AddonWorkspaceFolder.All();
    let loadDirsWithNames = await Promise.all(addons.map(a => a.getLoadDirectoryAndModuleName()));
    return {
        ADDONS_TO_LOAD: JSON.stringify(loadDirsWithNames),
        VSCODE_EXTENSIONS_REPOSITORY: config.get("addon.extensionsRepository"),
        VSCODE_LOG_LEVEL: config.get("addon.logLevel"),
        EDITOR_PORT: (0, communication_1.getServerPort)().toString(),
        ...config.get("environmentVariables", {}),
    };
}
//# sourceMappingURL=blender_executable.js.map