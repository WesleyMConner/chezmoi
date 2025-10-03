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
exports.isTest = exports.notifyFixFailures = exports.showRuleDocumentation = exports.getUpdatedSource = exports.eolAndLines = exports.createTextEditReplaceAll = exports.applyTextDocumentEditOnWorkspace = exports.unixEOL = exports.dosEOL = exports.eolReplaceRegExp = exports.eolCaptureRegExp = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
const types_1 = require("./types");
const debug = require("debug")("vscode-groovy-lint");
// RegExp to find and capture End Of Line (EOL) sequences.
exports.eolCaptureRegExp = new RegExp(/(\r?\n)/);
// RegExp to replace End Of Line (EOL) sequences.
exports.eolReplaceRegExp = new RegExp(/\r?\n/g);
// End of Line sequences.
exports.dosEOL = '\r\n';
exports.unixEOL = '\n';
const defaultDocUrl = "https://codenarc.github.io/CodeNarc/codenarc-rule-index.html";
// Apply updated source into the client TextDocument
function applyTextDocumentEditOnWorkspace(docManager, textDocument, textEdit) {
    return __awaiter(this, void 0, void 0, function* () {
        const textDocEdit = vscode_languageserver_1.TextDocumentEdit.create({ uri: textDocument.uri, version: textDocument.version }, [textEdit]);
        const applyWorkspaceEdits = {
            documentChanges: [textDocEdit]
        };
        const applyEditResult = yield docManager.connection.workspace.applyEdit(applyWorkspaceEdits);
        debug(`Updated ${textDocument.uri} using WorkspaceEdit (${JSON.stringify(applyEditResult)})`);
    });
}
exports.applyTextDocumentEditOnWorkspace = applyTextDocumentEditOnWorkspace;
/**
 * Create text edit to replace the whole file maintaining line endings.
 *
 * @param originalText the original text.
 * @param newText the new text.
 * @returns a TextEdit which replaces currentText with newText.
 */
function createTextEditReplaceAll(originalText, newText) {
    const [eol, lines] = eolAndLines(originalText);
    // Pop is faster than indexed access and also avoids having to check the index going negative.
    const lastLine = lines.pop() || "";
    const range = vscode_languageserver_1.Range.create(0, 0, lines.length, lastLine.length);
    return vscode_languageserver_1.TextEdit.replace(range, newText.replace(exports.eolReplaceRegExp, eol));
}
exports.createTextEditReplaceAll = createTextEditReplaceAll;
/**
 * Returns the predominant end of line sequence and lines of a string.
 *
 * @param text the string to process.
 * @returns the predominant end of line sequence and the lines.
 */
function eolAndLines(text) {
    const parts = text.split(exports.eolCaptureRegExp);
    let dos = 0;
    let unix = 0;
    const lines = [];
    parts.forEach(val => {
        switch (val) {
            case exports.dosEOL:
                dos++;
                break;
            case exports.unixEOL:
                unix++;
                break;
            default:
                lines.push(val);
                break;
        }
    });
    return [unix > dos ? exports.unixEOL : exports.dosEOL, lines];
}
exports.eolAndLines = eolAndLines;
// Return updated source
function getUpdatedSource(docLinter, prevSource) {
    var _a;
    if (((_a = docLinter === null || docLinter === void 0 ? void 0 : docLinter.lintResult) === null || _a === void 0 ? void 0 : _a.files) && docLinter.lintResult.files[0]) {
        return docLinter.lintResult.files[0].updatedSource;
    }
    return prevSource;
}
exports.getUpdatedSource = getUpdatedSource;
// Shows the documentation of a rule
function showRuleDocumentation(ruleCode, docManager) {
    return __awaiter(this, void 0, void 0, function* () {
        debug(`Request showRuleDocumentation on ${ruleCode}`);
        const ruleDesc = docManager.getRuleDescription(ruleCode);
        // Show documentation as info message, and propose to open codenarc website rule page
        const readMoreLabel = 'Read More';
        const msg = {
            type: vscode_languageserver_1.MessageType.Info,
            message: `${ruleCode}: ${ruleDesc.description}`,
            actions: [
                { title: readMoreLabel }
            ]
        };
        const res = yield docManager.connection.sendRequest(vscode_languageserver_1.ShowMessageRequest.type, msg);
        if (res.title === readMoreLabel) {
            docManager.connection.sendNotification(types_1.OpenNotification.type, { url: ruleDesc.docUrl || defaultDocUrl });
        }
    });
}
exports.showRuleDocumentation = showRuleDocumentation;
// Display failed fixes if returned
function notifyFixFailures(fixFailures, docManager) {
    return __awaiter(this, void 0, void 0, function* () {
        if (fixFailures.length === 0 || docManager.ignoreNotifyFixError === true) {
            return;
        }
        const failedErrorTypes = Array.from(new Set(fixFailures.map(failedFixErr => failedFixErr.rule)));
        failedErrorTypes.sort();
        debug(`Notify fix failures of errors: ${failedErrorTypes.join(',')}`);
        const doNotDisplayAgain = 'Do not display again';
        const dismiss = 'Dismiss';
        const msg = {
            type: vscode_languageserver_1.MessageType.Warning,
            message: `Some error fixes have failed, please fix them manually: ${failedErrorTypes.join(',')}`,
            actions: [
                { title: dismiss },
                { title: doNotDisplayAgain }
            ]
        };
        docManager.connection.sendRequest(vscode_languageserver_1.ShowMessageRequest.type, msg).then((res) => {
            if (res && res.title === doNotDisplayAgain) {
                docManager.ignoreNotifyFixError = true;
            }
        });
    });
}
exports.notifyFixFailures = notifyFixFailures;
// Check if we are in test mode
function isTest() {
    return (process.env.npm_lifecycle_event && process.env.npm_lifecycle_event === 'test') ||
        (process.env.AUTO_ACCEPT_REPLACE_TABS && process.env.AUTO_ACCEPT_REPLACE_TABS === 'activated');
}
exports.isTest = isTest;
//# sourceMappingURL=clientUtils.js.map