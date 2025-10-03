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
exports.disableErrorForProject = exports.disableErrorWithComment = exports.applyQuickFixesInFile = exports.applyQuickFixes = exports.provideQuickFixCodeActions = void 0;
/* eslint-disable eqeqeq */
const vscode_languageserver_1 = require("vscode-languageserver");
const vscode_uri_1 = require("vscode-uri");
const fse = require("fs-extra");
const clientUtils_1 = require("./clientUtils");
const linterParser_1 = require("./linterParser");
const types_1 = require("./types");
const commands_1 = require("./commands");
const path_1 = require("path");
const debug = require("debug")("vscode-groovy-lint");
const trace = require("debug")("vscode-groovy-lint-trace");
/**
 * Provide quick-fixes for a piece of code
 * @export
 * @param {TextDocument} textDocument
 * @param {CodeActionParams} codeActionParams
 * @returns {CodeAction[]}
 */
function provideQuickFixCodeActions(textDocument, codeActionParams, docQuickFixes) {
    const diagnostics = codeActionParams.context.diagnostics;
    const quickFixCodeActions = [];
    if (diagnostics === undefined || diagnostics === null || diagnostics.length === 0) {
        return quickFixCodeActions;
    }
    trace(`docQuickFixes: ${JSON.stringify(docQuickFixes, null, 2)}`);
    // Browse diagnostics to get related CodeActions
    for (const diagnostic of codeActionParams.context.diagnostics) {
        // Skip Diagnostics not from VsCodeGroovyLint
        trace(`Diagnostic is ${JSON.stringify(diagnostic, null, 2)}`);
        if (diagnostic.source !== 'GroovyLint') {
            continue;
        }
        // Get corresponding QuickFix if existing and convert it as QuickAction
        const diagCode = diagnostic.code + '';
        if (docQuickFixes && docQuickFixes[diagCode]) {
            for (const quickFix of docQuickFixes[diagCode]) {
                const codeActions = createQuickFixCodeActions(diagnostic, quickFix, textDocument.uri);
                debug(`codeActions is ${JSON.stringify(codeActions, null, 2)}`);
                quickFixCodeActions.push(...codeActions);
            }
        }
        // Add Ignores for this error
        const disableActions = createDisableActions(diagnostic, textDocument.uri);
        quickFixCodeActions.push(...disableActions);
        const viewDocAction = createViewDocAction(diagnostic, textDocument.uri);
        if (viewDocAction) {
            quickFixCodeActions.push(viewDocAction);
        }
    }
    debug(`Provided ${quickFixCodeActions.length} codeActions for ${textDocument.uri}`);
    return quickFixCodeActions;
}
exports.provideQuickFixCodeActions = provideQuickFixCodeActions;
// Create QuickFix codeActions for diagnostic
function createQuickFixCodeActions(diagnostic, quickFix, textDocumentUri) {
    const codeActions = [];
    // Quick fix only this error
    const quickFixAction = {
        title: quickFix.label,
        kind: vscode_languageserver_1.CodeActionKind.RefactorRewrite,
        command: {
            command: commands_1.COMMAND_LINT_QUICKFIX.command,
            title: quickFix.label,
            arguments: [textDocumentUri, diagnostic]
        },
        diagnostics: [diagnostic],
        isPreferred: true
    };
    codeActions.push(quickFixAction);
    codeActions.push(Object.assign(Object.assign({}, quickFixAction), { kind: vscode_languageserver_1.CodeActionKind.QuickFix }));
    // Quick fix error in file
    const quickFixActionAllFile = {
        title: `${quickFix.label} for this entire file`,
        kind: vscode_languageserver_1.CodeActionKind.Source,
        command: {
            command: commands_1.COMMAND_LINT_QUICKFIX_FILE.command,
            title: `${quickFix.label} for this entire file`,
            arguments: [textDocumentUri, diagnostic]
        },
        diagnostics: [diagnostic],
        isPreferred: true
    };
    codeActions.push(quickFixActionAllFile);
    codeActions.push(Object.assign(Object.assign({}, quickFixActionAllFile), { kind: vscode_languageserver_1.CodeActionKind.QuickFix }));
    return codeActions;
}
function createDisableActions(diagnostic, textDocumentUri) {
    // Sometimes it comes there whereas it shouldn't ... let's avoid a crash
    if (diagnostic == null) {
        console.warn('Warning: we should not be in createDisableActions as there is no diagnostic set');
        return [];
    }
    const disableActions = [];
    let errorLabel = diagnostic.code.split('-')[0].replace(/([A-Z])/g, ' $1').trim();
    if (diagnostic.severity === vscode_languageserver_1.DiagnosticSeverity.Warning ||
        diagnostic.severity === vscode_languageserver_1.DiagnosticSeverity.Error ||
        diagnostic.severity === vscode_languageserver_1.DiagnosticSeverity.Information) {
        // Ignore only this error
        const titleDisableLine = `${errorLabel}: disable for this line`;
        const disableErrorAction = {
            title: titleDisableLine,
            kind: vscode_languageserver_1.CodeActionKind.QuickFix,
            command: {
                command: commands_1.COMMAND_DISABLE_ERROR_FOR_LINE.command,
                title: titleDisableLine,
                arguments: [textDocumentUri, diagnostic]
            },
            diagnostics: [diagnostic],
            isPreferred: false
        };
        disableActions.push(disableErrorAction);
        // disable this error type in all file
        const titleDisableAllFile = `${errorLabel}: disable for the entire file`;
        const disableErrorInFileAction = {
            title: titleDisableAllFile,
            kind: vscode_languageserver_1.CodeActionKind.QuickFix,
            command: {
                command: commands_1.COMMAND_DISABLE_ERROR_FOR_FILE.command,
                title: titleDisableAllFile,
                arguments: [textDocumentUri, diagnostic]
            },
            diagnostics: [diagnostic],
            isPreferred: false
        };
        disableActions.push(disableErrorInFileAction);
        // disable this error type in all project (will update .groovylintrc.json)
        const titleDisableProject = `${errorLabel}: disable for entire project`;
        const disableInProjectAction = {
            title: titleDisableProject,
            kind: vscode_languageserver_1.CodeActionKind.QuickFix,
            command: {
                command: commands_1.COMMAND_DISABLE_ERROR_FOR_PROJECT.command,
                title: titleDisableProject,
                arguments: [textDocumentUri, diagnostic]
            },
            diagnostics: [diagnostic],
            isPreferred: false
        };
        disableActions.push(disableInProjectAction);
    }
    return disableActions;
}
// Create action to view documentation
function createViewDocAction(diagnostic, textDocumentUri) {
    // Sometimes it comes there whereas it shouldn't ... let's avoid a crash
    if (diagnostic == null) {
        console.warn('Warning: we should not be in createViewDocAction as there is no diagnostic set');
        return null;
    }
    const ruleCode = diagnostic.code.split('-')[0];
    let errorLabel = ruleCode.replace(/([A-Z])/g, ' $1').trim();
    const titleShowDoc = `${errorLabel}: show documentation`;
    const viewCodeAction = {
        title: titleShowDoc,
        kind: vscode_languageserver_1.CodeActionKind.QuickFix,
        command: {
            command: commands_1.COMMAND_SHOW_RULE_DOCUMENTATION.command,
            title: titleShowDoc,
            arguments: [ruleCode]
        },
        diagnostics: [diagnostic],
        isPreferred: false
    };
    return viewCodeAction;
}
// Apply quick fixes
function applyQuickFixes(diagnostics, textDocumentUri, docManager) {
    return __awaiter(this, void 0, void 0, function* () {
        // Sometimes it comes there whereas it shouldn't ... let's avoid a crash
        if (diagnostics == null || diagnostics.length === 0) {
            console.warn('Warning: we should not be in applyQuickFixes as there is no diagnostics set');
            return;
        }
        const textDocument = docManager.getDocumentFromUri(textDocumentUri);
        const errorIds = [];
        for (const diagnostic of diagnostics) {
            errorIds.push(parseInt(diagnostic.code.split('-')[1], 10));
        }
        debug(`Request apply QuickFixes for ${textDocumentUri}: ${errorIds.join(',')}`);
        // Call NpmGroovyLint instance fixer
        const docLinter = docManager.getDocLinter(textDocument.uri);
        debug(`Start fixing ${textDocument.uri}`);
        docManager.connection.sendNotification(types_1.StatusNotification.type, {
            state: 'lint.start.fix',
            documents: [{ documentUri: textDocument.uri }],
            lastFileName: textDocument.uri
        });
        yield docLinter.fixErrors(errorIds, { nolintafter: true });
        // Parse fix results
        const { fixFailures } = (0, linterParser_1.parseLinterResults)(docLinter.lintResult, textDocument.getText(), textDocument, docManager);
        // Notify user of failures if existing
        yield (0, clientUtils_1.notifyFixFailures)(fixFailures, docManager);
        // Just Notify client of end of fixing
        yield docManager.connection.sendNotification(types_1.StatusNotification.type, {
            state: 'lint.end',
            documents: [{
                    documentUri: textDocument.uri
                }],
            lastFileName: textDocument.uri
        });
        // Apply updates to textDocument
        if (docLinter.status !== 0) {
            debug(`Error while fixing ${textDocument.uri} status: ${docLinter.status} error: ${docLinter.error ? docLinter.error.msg : 'unknown'}}`);
        }
        else if (docLinter.lintResult.summary.totalFixedNumber > 0) {
            const source = textDocument.getText();
            const updatedSource = (0, clientUtils_1.getUpdatedSource)(docLinter, source);
            const textEdit = (0, clientUtils_1.createTextEditReplaceAll)(source, updatedSource);
            yield (0, clientUtils_1.applyTextDocumentEditOnWorkspace)(docManager, textDocument, textEdit);
            setTimeout(() => {
                const newDoc = docManager.getUpToDateTextDocument(textDocument);
                docManager.validateTextDocument(newDoc, { force: true });
            }, 500);
        }
        debug(`End fixing ${textDocument.uri}`);
    });
}
exports.applyQuickFixes = applyQuickFixes;
// Quick fix in the whole file
function applyQuickFixesInFile(diagnostics, textDocumentUri, docManager) {
    return __awaiter(this, void 0, void 0, function* () {
        // Sometimes it comes there whereas it shouldn't ... let's avoid a crash
        if (diagnostics == null || diagnostics.length === 0) {
            console.warn('Warning: we should not be in applyQuickFixesInFile as there is no diagnostics set');
            return;
        }
        const textDocument = docManager.getDocumentFromUri(textDocumentUri);
        const fixRule = diagnostics[0].code.split('-')[0];
        debug(`Request apply QuickFixes in file for ${fixRule} error in ${textDocumentUri}`);
        // Fix call
        yield docManager.validateTextDocument(textDocument, { fix: true, fixrules: [fixRule] });
        // Lint after call
        debug(`Request new lint of ${textDocumentUri} after fix action`);
        setTimeout(() => {
            const newDoc = docManager.getUpToDateTextDocument(textDocument);
            docManager.validateTextDocument(newDoc, { force: true });
        }, 500);
    });
}
exports.applyQuickFixesInFile = applyQuickFixesInFile;
// Disable error with comment groovylint-disable
function disableErrorWithComment(diagnostic, textDocumentUri, scope, docManager) {
    return __awaiter(this, void 0, void 0, function* () {
        // Sometimes it comes there whereas it shouldn't ... let's avoid a crash
        if (diagnostic == null) {
            console.warn('Warning: we should not be in disableErrorWithComment as there is no diagnostic set');
            return;
        }
        const textDocument = docManager.getDocumentFromUri(textDocumentUri);
        const [eol, allLines] = (0, clientUtils_1.eolAndLines)(textDocument.getText());
        // Get line to check or create
        let linePos = 0;
        let disableKey = '';
        switch (scope) {
            // Get single error line position
            case 'line':
                linePos = getDiagnosticRangeInfo(diagnostic.range, 'start').line || 0;
                disableKey = 'groovylint-disable-next-line';
                break;
            // Manage shebang case ( https://en.wikipedia.org/wiki/Shebang_(Unix) ): use first or second line if shebang
            case 'file':
                linePos = (allLines[0] && allLines[0].startsWith('#!')) ? 1 : 0;
                disableKey = 'groovylint-disable';
                break;
        }
        const line = allLines[linePos];
        const prevLinePos = (linePos === 0) ? 0 : (linePos === 1) ? 1 : linePos - 1;
        const prevLine = allLines[prevLinePos] || '';
        const indent = " ".repeat(line.search(/\S/));
        const errorCode = diagnostic.code.split('-')[0];
        const commentRules = parseGroovyLintComment(disableKey, prevLine);
        if (commentRules) {
            // Update existing /* groovylint-disable */ or /* groovylint-disable-next-line */
            commentRules.push(errorCode);
            commentRules.sort();
            const disableLine = indent + `/* ${disableKey} ${[...new Set(commentRules)].join(", ")} */`;
            const range = vscode_languageserver_1.Range.create(prevLinePos, 0, prevLinePos, prevLine.length);
            const textEdit = vscode_languageserver_1.TextEdit.replace(range, disableLine);
            yield (0, clientUtils_1.applyTextDocumentEditOnWorkspace)(docManager, textDocument, textEdit);
        }
        else {
            // Add new /* groovylint-disable */ or /* groovylint-disable-next-line */
            const disableLine = indent + `/* ${disableKey} ${errorCode} */${eol}`;
            const position = vscode_languageserver_1.Position.create(linePos, 0);
            const textEdit = vscode_languageserver_1.TextEdit.insert(position, disableLine);
            yield (0, clientUtils_1.applyTextDocumentEditOnWorkspace)(docManager, textDocument, textEdit);
        }
        // The content of textDocument.getText() will be out of date, so request
        // a lint when we get the new document content via onDidChangeContent.
        docManager.updateDocumentSettings(textDocument.uri, { lint: { next: true } });
    });
}
exports.disableErrorWithComment = disableErrorWithComment;
/* Depending of context, diagnostic.range can be
{ start : {line: 1, character:1}, end : {line: 2, character:2} }
or
[ {line: 1, character:1}, {line: 2, character:2] ]
*/
function getDiagnosticRangeInfo(range, startOrEnd) {
    if (Array.isArray(range)) {
        return (startOrEnd === 'start') ? range[0] : range[1];
    }
    return range[startOrEnd];
}
// Parse groovylint comment
function parseGroovyLintComment(type, line) {
    if (line.includes(type) &&
        !(type === 'groovylint-disable' && line.includes('groovylint-disable-next-line'))) {
        const typeDetail = line
            .replace("/*", "")
            .replace("//", "")
            .replace("*/", "")
            .replace(type, "")
            .trim();
        if (typeDetail) {
            const errors = typeDetail.split(",").map((errType) => errType.trim());
            return errors;
        }
        return [];
    }
    return false;
}
// Create/ Update .groovylintrc.json file
function disableErrorForProject(diagnostic, textDocumentUri, docManager) {
    return __awaiter(this, void 0, void 0, function* () {
        debug(`Request disable error in all project from ${textDocumentUri}`);
        // Sometimes it comes there whereas it shouldn't ... let's avoid a crash
        if (diagnostic == null) {
            console.warn('Warning: we should not be in alwaysIgnoreError as there is no diagnostic set');
            return [];
        }
        const textDocument = docManager.getDocumentFromUri(textDocumentUri);
        // Get line to check or create
        const errorCode = diagnostic.code.split('-')[0];
        debug(`Error code to be disabled is ${errorCode}`);
        // Get or create configuration file path using NpmGroovyLint instance associated to this document
        const docLinter = docManager.getDocLinter(textDocument.uri);
        const textDocumentFilePath = vscode_uri_1.URI.parse(textDocument.uri).fsPath;
        const startPath = (0, path_1.dirname)(textDocumentFilePath);
        let configFilePath = yield docLinter.getConfigFilePath(startPath);
        let configFileContent = JSON.parse(fse.readFileSync(configFilePath, "utf8").toString());
        if (configFilePath.endsWith(".groovylintrc-recommended.json")) {
            const projectFolder = docManager.getCurrentWorkspaceFolder();
            configFilePath = `${projectFolder}/.groovylintrc.json`;
            configFileContent = { extends: "recommended", rules: {} };
        }
        debug(`Config file to be created/updated is ${configFilePath}`);
        // Find / Create disabled rule
        const newRuleContent = { enabled: false };
        let existingRule = Object.entries(configFileContent.rules).filter(mapElt => {
            mapElt[0].includes(errorCode);
        });
        if (existingRule.length > 0) {
            if (typeof configFileContent.rules[existingRule[0]] === 'string') { // ex: "warning"
                Object.assign(newRuleContent, { severity: configFileContent.rules[existingRule[0]] });
            }
            else { // ex: 'indentationLevel: 4'
                delete configFileContent.rules[existingRule[0]].enabled;
                delete configFileContent.rules[existingRule[0]].disabled;
                Object.assign(newRuleContent, configFileContent.rules[existingRule[0]]);
            }
            delete configFileContent.rules[existingRule[0]];
        }
        configFileContent.rules[errorCode] = newRuleContent;
        // Reorder rules
        const rulesSorted = {};
        for (const ruleKey of Object.keys(configFileContent.rules).sort()) {
            rulesSorted[ruleKey] = configFileContent.rules[ruleKey];
        }
        configFileContent.rules = rulesSorted;
        // Write new JSON config
        yield fse.writeFile(configFilePath, JSON.stringify(configFileContent, null, 4));
        debug(`Updated file ${configFilePath}`);
        // Remove Diagnostics corresponding to this error
        const removeAll = true;
        docManager.removeDiagnostics([diagnostic], textDocument.uri, removeAll);
        // Lint again all open documents
        docManager.lintAgainAllOpenDocuments();
        // Show message to user and propose to open the configuration file
        const msg = {
            type: vscode_languageserver_1.MessageType.Info,
            message: `Disabled rule ${errorCode} in config file`,
            actions: [
                { title: "Open" }
            ]
        };
        try {
            const req = yield docManager.connection.sendRequest('window/showMessageRequest', msg);
            if (req.title === "Open") {
                yield docManager.connection.sendNotification(types_1.OpenNotification.type, { file: configFilePath });
            }
        }
        catch (e) {
            debug(`Error with window/showMessageRequest or Opening config file: ${e.message}`);
        }
    });
}
exports.disableErrorForProject = disableErrorForProject;
//# sourceMappingURL=codeActions.js.map