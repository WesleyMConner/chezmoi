"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lintFolder = void 0;
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const vscode_uri_1 = require("vscode-uri");
const fse = require("fs-extra");
const path = require("path");
const vscode_languageserver_1 = require("vscode-languageserver");
const debug = require("debug")("vscode-groovy-lint");
const glob = require("glob-promise");
const timeToDisplayWaitingMessageMs = 5000;
function lintFolder(folders, docManager) {
    return __awaiter(this, void 0, void 0, function* () {
        let isLinting = true;
        let continueLinting = true;
        // Function to lint all applicable files of a folder
        function processLintFolder() {
            return __awaiter(this, void 0, void 0, function* () {
                const folderList = folders.map(folder => folder.path);
                debug(`Start analyzing folder(s): ${folderList.join(',')}`);
                // Browse each folder
                for (const folder of folderList) {
                    // List applicable files of folder
                    const pathFilesPatternGroovy = path.join(folder, '/**/*.groovy');
                    const pathFilesPatternJenkins = path.join(folder, '/**/Jenkins*');
                    const files = [];
                    for (const pathFilesPattern of [pathFilesPatternGroovy, pathFilesPatternJenkins]) {
                        const pathFiles = yield glob(pathFilesPattern);
                        files.push(...pathFiles);
                    }
                    // Trigger a lint for each of the found documents
                    for (const file of files) {
                        const docUri = vscode_uri_1.URI.file(file).toString();
                        let textDocument = docManager.getDocumentFromUri(docUri, false, false);
                        // eslint-disable-next-line eqeqeq
                        if (textDocument == null) {
                            const content = yield fse.readFile(file, "utf8");
                            textDocument = vscode_languageserver_textdocument_1.TextDocument.create(docUri, 'groovy', 1, content.toString());
                        }
                        // Lint one doc after another , to do not busy too much the processor
                        if (continueLinting === true) {
                            yield docManager.validateTextDocument(textDocument, { displayErrorsEvenIfDocumentClosed: true });
                        }
                    }
                }
                debug(`Completed analyzing folder(s): ${folderList.join(',')}`);
                isLinting = false;
            });
        }
        // Request lint folders
        const lintFoldersPromise = processLintFolder();
        // Wait some seconds: if the lint is still processing, display an info message
        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            if (isLinting === true) {
                const msg = {
                    type: vscode_languageserver_1.MessageType.Info,
                    message: `'Analyzing all files of a folder can be long, please be patient :)'`,
                    actions: [
                        { title: "Ok, keep going" },
                        { title: "Cancel analysis of folder files" }
                    ]
                };
                const req = yield docManager.connection.sendRequest('window/showMessageRequest', msg);
                if ((req === null || req === void 0 ? void 0 : req.title) === "Cancel lint of folders") {
                    continueLinting = false;
                }
            }
        }), timeToDisplayWaitingMessageMs);
        // Await folders are linted
        yield lintFoldersPromise;
    });
}
exports.lintFolder = lintFolder;
//# sourceMappingURL=folder.js.map