"use strict";
/* --------------------
 * Copyright(C) Matthias Behr, 2020 - 2024.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TSharkListProvider = exports.TSharkDataProvider = exports.TSharkProcess = void 0;
const vscode = require("vscode");
const path = require("path");
const child_process_1 = require("child_process");
let _nextTSharkdId = 1;
const platformWin32 = process.platform === "win32";
const separator = platformWin32 ? '"' : "'"; // win cmd uses ", unix sh uses '
function escapeShellChars(aString) {
    if (platformWin32) { // < > ( ) & | , ; " escape with ^
        // for now not escape & | " 
        return aString.replace(/\<|\>|\(|\),/g, '^$&');
    }
    else { // for now we dont escape as the display filter is already within single quotes
        return aString;
    }
}
function getTsharkFullPath() {
    const confTshark = vscode.workspace.getConfiguration().get('vsc-webshark.tsharkFullPath');
    const tsharkFullPath = confTshark ? confTshark : 'tshark';
    return tsharkFullPath;
}
function getMergecapFullPath() {
    const confMergecap = vscode.workspace.getConfiguration().get('vsc-webshark.mergecapFullPath');
    if (confMergecap) {
        return confMergecap;
    }
    else {
        // lets provide a better default with the tshark path:
        const confTshark = vscode.workspace.getConfiguration().get('vsc-webshark.tsharkFullPath');
        return confTshark ? path.join(path.dirname(confTshark), 'mergecap') : 'mergecap';
    }
}
class TSharkProcess {
    constructor(tsharkArgs, onDataFunction, _inFiles = [], _outFile = '') {
        this._inFiles = _inFiles;
        this._outFile = _outFile;
        this._tsharkPath = getTsharkFullPath();
        this._mergecapPath = getMergecapFullPath();
        this.running = false;
        this._donePromises = [];
        this._spawnedShell = false;
        this.id = _nextTSharkdId++;
        this._onDataFunction = onDataFunction;
        //const { base: sharkdCmd, dir: sharkdDirParsed } = path.parse(this._tsharkPath);
        //const sharkdDir = sharkdDirParsed.length > 0 ? sharkdDirParsed : process.cwd();
        // todo seems not needed here? (test...)
        console.log(`spawning ${this._tsharkPath} from cwd=${process.cwd()} win32=${platformWin32}`);
        if (tsharkArgs.length < 1) {
            throw Error('tharkArgs.length <1');
        }
        // we should not modify the args. so let's make a deep copy first:
        let localTsharkArgs = [];
        for (let i = 0; i < tsharkArgs.length; ++i) {
            const innerArr = tsharkArgs[i];
            // do we need to do any escaping of shell chars?
            const newInnerArr = [...innerArr].map((e) => escapeShellChars(e));
            localTsharkArgs.push(newInnerArr);
        }
        const haveMultipleInFiles = _inFiles.length > 1;
        if (_inFiles.length === 1) {
            localTsharkArgs[0].unshift(`-r ${separator}${_inFiles[0]}${separator}`);
        }
        if (_outFile.length) {
            localTsharkArgs[localTsharkArgs.length - 1].push(`-w ${separator}${_outFile}${separator}`);
        }
        if (localTsharkArgs.length > 1 || haveMultipleInFiles) {
            // we have more than one process that we'd like to pipe the output to
            const command = platformWin32 ? 'cmd' : 'sh';
            const args = [`${platformWin32 ? '/s /c' : '-c'}`];
            this._spawnedShell = true;
            // add pipe support for the interims ones:
            let longArg = '"';
            // for multiple in files we first pass via mergecap:
            if (haveMultipleInFiles) {
                longArg += `${separator}${this._mergecapPath}${separator} -w -`;
                for (let f = 0; f < _inFiles.length; ++f) {
                    longArg += ` ${separator}${_inFiles[f]}${separator}`;
                }
                longArg += `|`;
                console.log(`spawning ${longArg} for ${_inFiles.length} multiple files`);
            }
            for (let i = 0; i < localTsharkArgs.length; ++i) {
                longArg += `${separator}${this._tsharkPath}${separator} `;
                if (i > 0 || haveMultipleInFiles) {
                    longArg += `-r - `;
                }
                longArg += localTsharkArgs[i].join(' ');
                if (i < localTsharkArgs.length - 1) {
                    longArg += ` -w -|`;
                }
            }
            longArg += '"';
            args.push(longArg);
            console.log(`spawning ${command} from cwd=${process.cwd()} win32=${platformWin32} args:`);
            for (let i = 0; i < args.length; ++i) {
                console.log(` ${args[i]}`);
            }
            this._proc = (0, child_process_1.spawn)(command, args, {
                stdio: ['ignore', 'pipe', 'pipe'],
                shell: true,
                windowsVerbatimArguments: platformWin32 ? true : false,
                detached: !platformWin32,
            });
        }
        else {
            // single args. spawn directly
            console.log(`spawning ${this._tsharkPath} from cwd=${process.cwd()} win32=${platformWin32} args:`);
            for (let i = 0; i < localTsharkArgs[0].length; ++i) {
                console.log(` ${localTsharkArgs[0][i]}`);
            }
            this._proc = (0, child_process_1.spawn)(`${separator}${this._tsharkPath}${separator}`, localTsharkArgs[0], {
                stdio: ['ignore', 'pipe', 'pipe'],
                shell: true,
                windowsVerbatimArguments: platformWin32 ? true : false,
            });
        }
        this.running = true;
        this._proc.on('error', (err) => {
            console.warn(`TsharkProcess(${this.id}) got error: ${err}`);
            this.running = false;
            this.lastError = err;
            this._donePromises.forEach((p) => p(-1));
            this._donePromises = [];
        });
        this._proc.on('close', (code) => {
            console.log(`TsharkProcess(${this.id}) closed with: ${code}`);
            this.running = false;
            this._donePromises.forEach((p) => p(code || 0));
            this._donePromises = [];
        });
        this._proc.stderr?.on('data', (data) => {
            const strData = data.toString();
            console.log(`TsharkProcess(${this.id}) stderr: '${strData}'`);
            if (this.running) {
                vscode.window.showWarningMessage(`tshark got stderr: '${strData}'`);
            }
        });
        this._proc.stdout?.on('data', (data) => {
            //console.log(`TsharkProcess(${this.id}) got data len=${data.length} '${data.slice(0, 70).toString()}'`);
            if (this._onDataFunction) {
                this._onDataFunction(data);
            }
        });
    }
    dispose() {
        console.log(`TSharkProcess(${this.id}).dispose() called.(killed=${this._proc.killed}) spawnedShell=${this._spawnedShell} running=${this.running}`);
        if (this.running) {
            if (this._spawnedShell && !platformWin32) {
                try {
                    if (this._proc.pid !== undefined) {
                        process.kill(-this._proc.pid, 'SIGINT'); // this is a bit more picky with not running processes
                    }
                }
                catch (err) {
                    console.log(`TSharkProcess(${this.id}).dispose() process.kill got err=${err}`);
                }
            }
            else {
                if (platformWin32) {
                    // we start all with shell so need to kill the full tree:
                    (0, child_process_1.spawn)('taskkill', ['/pid', `${this._proc.pid}`, '/f', '/t']);
                }
                else {
                    this._proc.kill(); // send SIGTERM
                }
            }
            this.running = false;
        }
    }
    done() {
        return new Promise((resolve) => {
            if (!this.running) {
                resolve(this.lastError !== undefined ? -1 : 0);
                return;
            }
            this._donePromises.push(resolve);
        });
    }
}
exports.TSharkProcess = TSharkProcess;
class TSharkDataProvider {
    constructor(tsharkArgs, _inFiles = [], _outFile = '') {
        this._inFiles = _inFiles;
        this._outFile = _outFile;
        this._onDidChangeData = new vscode.EventEmitter();
        this.onDidChangeData = this._onDidChangeData.event;
        this._partialLine = '';
        this._tshark = new TSharkProcess(tsharkArgs, this.onData.bind(this), _inFiles, _outFile);
    }
    done() {
        return this._tshark.done();
    }
    onData(data) {
        const lines = data.toString().split(platformWin32 ? /\r\n/ : '\n');
        if (lines.length > 0) {
            // the first one we need to join with the partialLine
            if (this._partialLine.length > 0) {
                lines[0] = this._partialLine + lines[0];
                this._partialLine = '';
            }
            // the last one we use as partialLine (waiting for the \n)
            if (lines[lines.length - 1].endsWith('\n')) {
            }
            else {
                this._partialLine = lines[lines.length - 1];
                lines.pop();
            }
            if (lines.length > 0) {
                this._onDidChangeData.fire(lines);
            }
        }
    }
    dispose() {
        console.log(`TSharkDataProvider.dispose() called.`);
        this._tshark.dispose();
    }
}
exports.TSharkDataProvider = TSharkDataProvider;
class TSharkListProvider {
    constructor(tsharkArgs, _options = null, _inFiles = [], _outFile = '') {
        this._options = _options;
        this._inFiles = _inFiles;
        this._outFile = _outFile;
        this._onDidChangeData = new vscode.EventEmitter();
        this.onDidChangeData = this._onDidChangeData.event;
        this.data = { map: new Map() };
        this._expectHeader = true; // for now we do always expect the query with -E header=y
        this.headers = [];
        if (_options?.groupBy?.groupFn?.length) {
            this._groupFn = new Function('col0', _options.groupBy.groupFn);
            console.warn(`using groupFn=`, this._groupFn);
        }
        this._tshark = new TSharkDataProvider(tsharkArgs, _inFiles, _outFile);
        this._tshark.onDidChangeData(this.onData.bind(this));
    }
    onData(lines) {
        let didChange = false;
        // we do expect one, two or 3 data fields:
        // data like: f0:7f:0c:08:75:9f       160.48.199.66   0x0000010100a60000,0x0000100200a60000
        // first field will be used as key
        for (let i = 0; i < lines.length; ++i) {
            const parts = lines[i].split('\t');
            if (this._expectHeader) {
                this.headers = parts;
                this._expectHeader = false;
            }
            else {
                switch (parts.length) {
                    case 1:
                    case 2:
                    case 3:
                        {
                            const group = this._groupFn ? this._groupFn(parts[0]) : parts[0];
                            const dataSet = this.data.map.get(group);
                            if (!dataSet) {
                                let obj = {};
                                // if we group by we do add a "_firstKey" with the orig value
                                // this is used e.g. if we want to group by frame_epoch but need a real frame time as key
                                if (this._groupFn) {
                                    obj._firstKey = parts[0];
                                }
                                obj[this.headers.length > 0 ? this.headers[0] : 'f0'] = parts[0];
                                if (parts.length >= 2) {
                                    let key = this.headers.length > 1 ? this.headers[1] : 'f1';
                                    let value = parts[1];
                                    if (this._options?.valueMapper) {
                                        [key, value] = this._options.valueMapper(key, value);
                                    }
                                    if (key.length > 0) {
                                        obj[key] = [value];
                                    }
                                }
                                if (parts.length >= 3) {
                                    let key = this.headers.length > 2 ? this.headers[2] : 'f2';
                                    let value = parts[2];
                                    if (this._options?.valueMapper) {
                                        [key, value] = this._options.valueMapper(key, value);
                                    }
                                    if (key.length > 0) {
                                        obj[key] = [value];
                                    }
                                }
                                this.data.map.set(group, obj);
                                didChange = true;
                            }
                            else {
                                if (!this._options?.groupBy?.justOneValue) {
                                    if (parts.length >= 2) {
                                        // check whether f1 contains parts1 already:
                                        let key = this.headers.length > 1 ? this.headers[1] : 'f1';
                                        let value = parts[1];
                                        if (this._options?.valueMapper) {
                                            [key, value] = this._options.valueMapper(key, value);
                                        }
                                        if (key.length > 0 && !dataSet[key].includes(value)) {
                                            dataSet[key].push(value);
                                            didChange = true;
                                        }
                                    }
                                    if (parts.length >= 3) {
                                        // check whether f2 contains parts2 already:
                                        let key = this.headers.length > 2 ? this.headers[2] : 'f2';
                                        let value = parts[2];
                                        if (this._options?.valueMapper) {
                                            [key, value] = this._options.valueMapper(key, value);
                                        }
                                        if (key.length > 0 && !dataSet[key].includes(value)) {
                                            dataSet[key].push(value);
                                            didChange = true;
                                        }
                                    }
                                }
                            }
                        }
                        break;
                    default:
                        // ignore
                        break;
                }
            }
        }
        if (didChange) {
            this._onDidChangeData.fire(this.data);
        }
    }
    done() {
        return this._tshark.done();
    }
    dispose() {
        console.log(`TSharkListProvider.dispose() called.`);
        this._tshark.dispose();
    }
}
exports.TSharkListProvider = TSharkListProvider;
//# sourceMappingURL=tshark.js.map