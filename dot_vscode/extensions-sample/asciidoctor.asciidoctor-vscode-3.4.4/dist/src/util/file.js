"use strict";
/*---------------------------------------------------------------------------------------------
  *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exists = exports.dir = exports.sortFilesAndDirectories = exports.getChildrenOfPath = exports.FileInfo = exports.isAsciidocFile = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
function isAsciidocFile(document) {
    return document.languageId === 'asciidoc';
}
exports.isAsciidocFile = isAsciidocFile;
class FileInfo {
    constructor(path, file) {
        this.file = file;
        this.isFile = fs.statSync(path_1.default.join(path, file)).isFile();
    }
}
exports.FileInfo = FileInfo;
async function getChildrenOfPath(path) {
    try {
        const files = await new Promise((resolve, reject) => {
            fs.readdir(path, (err, files) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(files);
                }
            });
        });
        return files.map((f) => new FileInfo(path, f));
    }
    catch (error) {
        return [];
    }
}
exports.getChildrenOfPath = getChildrenOfPath;
const sortFilesAndDirectories = (filesAndDirs) => {
    const dirs = filesAndDirs.filter((f) => f.isFile !== true);
    const files = filesAndDirs.filter((f) => f.isFile === true);
    return [...dirs, ...files];
};
exports.sortFilesAndDirectories = sortFilesAndDirectories;
function dir(uri, workspaceFolder) {
    if (uri.path === workspaceFolder?.path) {
        return undefined;
    }
    if (uri.path.lastIndexOf('/') <= 0) {
        return undefined;
    }
    let query = uri.query;
    // The Git file system provider is using a JSON-encoded string in `query` to store the path of the file.
    if (uri.scheme === 'git') {
        try {
            const queryObject = JSON.parse(query);
            queryObject.path = queryObject.path.slice(0, queryObject.path.lastIndexOf('/'));
            query = JSON.stringify(queryObject);
        }
        catch (e) {
            // something went wrong, use the initial value
        }
    }
    return uri.with({ path: uri.path.slice(0, uri.path.lastIndexOf('/')), query });
}
exports.dir = dir;
async function exists(uri) {
    try {
        await vscode.workspace.fs.stat(uri);
        return true;
    }
    catch (err) {
        // file does not exist, ignore
        return false;
    }
}
exports.exists = exists;
//# sourceMappingURL=file.js.map