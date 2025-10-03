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
exports.DocumentsManager = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const linter_1 = require("./linter");
const codeActions_1 = require("./codeActions");
const clientUtils_1 = require("./clientUtils");
const vscode_uri_1 = require("vscode-uri");
const path_1 = require("path");
const types_1 = require("./types");
const folder_1 = require("./folder");
const commands_1 = require("./commands");
const debug = require("debug")("vscode-groovy-lint");
// Documents manager
class DocumentsManager {
    // Initialize documentManager
    constructor(cnx) {
        // list of documents managed by the client
        this.documents = new vscode_languageserver_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
        this.autoFixTabs = false;
        this.neverFixTabs = false;
        this.ignoreNotifyCrashes = false;
        this.ignoreNotifyFixError = false;
        // Counter for job id
        this.currentTaskId = 0;
        // Cache the settings of all open documents
        this.documentSettings = new Map();
        this.currentTextDocumentUri = '';
        this.currentWorkspaceFolder = process.cwd();
        // Memory stored values
        this.docLinters = new Map();
        this.docsDiagnostics = new Map();
        this.docsDiagsQuickFixes = new Map();
        this.ruleDescriptions = new Map();
        // Lint/fix queue
        this.currentlyLinted = [];
        this.queuedLints = [];
        this.connection = cnx;
        if ((0, clientUtils_1.isTest)()) {
            this.autoFixTabs = true;
        }
    }
    // Commands execution
    executeCommand(params) {
        return __awaiter(this, void 0, void 0, function* () {
            debug(`Request execute command ${JSON.stringify(params, null, 2)}`);
            // Set current document URI if sent as parameter
            if (params.arguments && params.arguments[0] && vscode_uri_1.URI.isUri(params.arguments[0])) {
                this.setCurrentDocumentUri(params.arguments[0].toString());
            }
            // Command: Lint
            if (params.command === commands_1.COMMAND_LINT.command) {
                const document = this.getDocumentFromUri(this.currentTextDocumentUri);
                yield this.validateTextDocument(document, { force: true });
            }
            // Command: Fix
            else if (params.command === commands_1.COMMAND_LINT_FIX.command) {
                let document = this.getDocumentFromUri(this.currentTextDocumentUri);
                yield this.validateTextDocument(document, { fix: true });
                // The content of textDocument.getText() may be out of date, so request
                // a lint when we get the new document content via onDidChangeContent.
                this.updateDocumentSettings(document.uri, { lint: { next: true } });
            }
            // Command: Apply quick fix
            else if (params.command === commands_1.COMMAND_LINT_QUICKFIX.command) {
                const [textDocumentUri, diagnostic] = params.arguments;
                yield (0, codeActions_1.applyQuickFixes)([diagnostic], textDocumentUri, this);
            }
            // Command: Apply quick fix in all file
            else if (params.command === commands_1.COMMAND_LINT_QUICKFIX_FILE.command) {
                const [textDocumentUri, diagnostic] = params.arguments;
                yield (0, codeActions_1.applyQuickFixesInFile)([diagnostic], textDocumentUri, this);
            }
            // Ignore error
            else if (params.command === commands_1.COMMAND_DISABLE_ERROR_FOR_LINE.command) {
                const [textDocumentUri, diagnostic] = params.arguments;
                yield (0, codeActions_1.disableErrorWithComment)(diagnostic, textDocumentUri, 'line', this);
            }
            // Ignore error in entire file
            else if (params.command === commands_1.COMMAND_DISABLE_ERROR_FOR_FILE.command) {
                const [textDocumentUri, diagnostic] = params.arguments;
                yield (0, codeActions_1.disableErrorWithComment)(diagnostic, textDocumentUri, 'file', this);
            }
            // Command: Update .groovylintrc.json to ignore error in the future
            else if (params.command === commands_1.COMMAND_DISABLE_ERROR_FOR_PROJECT.command) {
                const [textDocumentUri, diagnostic] = params.arguments;
                yield (0, codeActions_1.disableErrorForProject)(diagnostic, textDocumentUri, this);
            }
            // Show rule documentation
            else if (params.command === commands_1.COMMAND_SHOW_RULE_DOCUMENTATION.command) {
                const [ruleCode] = params.arguments;
                yield (0, clientUtils_1.showRuleDocumentation)(ruleCode, this);
            }
            // Command: Lint folder
            else if (params.command === commands_1.COMMAND_LINT_FOLDER.command) {
                // First argument is the folder that has been right-clicked
                // Second argument is the list of folders to selected.
                const folders = params.arguments[1];
                yield (0, folder_1.lintFolder)(folders, this);
            }
        });
    }
    // Return TextDocument from uri
    getDocumentFromUri(docUri, setCurrent = false, throwError = true) {
        const textDocument = this.documents.get(docUri);
        // eslint-disable-next-line eqeqeq
        if (textDocument == null && throwError == true) {
            throw new Error(`ERROR: Document not found for URI ${docUri}`);
        }
        // eslint-disable-next-line eqeqeq
        if (textDocument != null && setCurrent) {
            this.setCurrentDocumentUri(docUri);
        }
        return textDocument;
    }
    // Store URI of currently edited document
    setCurrentDocumentUri(uri) {
        this.currentTextDocumentUri = uri;
    }
    // Check if document is opened in client
    isDocumentOpenInClient(docUri) {
        if (this.documents.get(docUri)) {
            return true;
        }
        return false;
    }
    // Get document settings from workspace configuration or cache
    getDocumentSettings(resource) {
        let result = this.documentSettings.get(resource);
        if (!result) {
            result = this.connection.workspace.getConfiguration({
                scopeUri: resource,
                section: 'groovyLint'
            });
            this.documentSettings.set(resource, result);
        }
        return result;
    }
    updateDocumentSettings(resource, settingUpdate) {
        return __awaiter(this, void 0, void 0, function* () {
            let docSettings = yield this.getDocumentSettings(resource);
            docSettings = Object.assign(docSettings, settingUpdate);
            this.documentSettings.set(resource, docSettings);
            return docSettings;
        });
    }
    // Remove document settings when closed
    removeDocumentSettings(uri) {
        if (uri === 'all') {
            this.documentSettings.clear();
        }
        else {
            this.documentSettings.delete(uri);
        }
    }
    // Lint again all open documents (after change of config)
    lintAgainAllOpenDocuments() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.refreshDebugMode(false);
            // Reset all cached document settings
            this.removeDocumentSettings('all');
            // Revalidate all open text documents
            for (const doc of this.documents.all()) {
                yield this.validateTextDocument(doc, { force: true });
            }
            ;
        });
    }
    // Format a text document
    formatTextDocument(textDocument) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.validateTextDocument(textDocument, { format: true });
        });
    }
    // Validate a text document by calling linter
    validateTextDocument(textDocument_1) {
        return __awaiter(this, arguments, void 0, function* (textDocument, opts = {
            displayErrorsEvenIfDocumentClosed: false
        }) {
            // Do not validate document if it is not open
            if (opts.displayErrorsEvenIfDocumentClosed !== true && !this.isDocumentOpenInClient(textDocument.uri)) {
                return Promise.resolve([]);
            }
            // Find if document is already being formatted or fixed
            const currentLintsOnDoc = this.currentlyLinted.filter((currLinted) => currLinted.uri === textDocument.uri);
            const duplicateLintsOnDoc = currentLintsOnDoc.filter((currLinted) => !this.isUpdateRequest(currLinted.options) &&
                currLinted.source === textDocument.getText());
            const currentActionsOnDoc = currentLintsOnDoc.filter((currLinted) => this.isUpdateRequest(currLinted.options));
            // Duplicate lint request with same doc content: do not trigger a new lint as there is a current one
            if (duplicateLintsOnDoc.length > 0 && !this.isUpdateRequest(opts)) {
                return Promise.resolve([]);
            }
            // Current document is not currently formatted/fixed, let's lint it now !
            if (currentActionsOnDoc.length === 0 &&
                (!(this.isUpdateRequest(opts) && currentLintsOnDoc.length > 0))) {
                // Add current lint in currentlyLinted
                const source = textDocument.getText();
                this.currentlyLinted.push({ uri: textDocument.uri, options: opts, source: source });
                const res = yield (0, linter_1.executeLinter)(textDocument, this, opts);
                // Remove current lint from currently linted
                const justLintedPos = this.currentlyLinted.findIndex((currLinted) => JSON.stringify({ uri: currLinted.uri, options: currLinted.options }) === JSON.stringify({ uri: textDocument.uri, options: opts }) &&
                    currLinted.source === source);
                this.currentlyLinted.splice(justLintedPos, 1);
                // Check if there is another lint in queue for the same file
                const indexNextInQueue = this.queuedLints.findIndex((queuedItem) => queuedItem.uri === textDocument.uri);
                // There is another lint in queue for the same file: process it
                if (indexNextInQueue > -1) {
                    const lintToProcess = this.queuedLints[indexNextInQueue];
                    this.queuedLints.splice(indexNextInQueue, 1);
                    debug(`Run queued lint for ${textDocument.uri} (${JSON.stringify(lintToProcess.options || '{}')})`);
                    this.validateTextDocument(textDocument, lintToProcess.options).then((resVal) => __awaiter(this, void 0, void 0, function* () {
                        // If format has not been performed by queue request , lint again after it is processed
                        if (lintToProcess.options.format === true, resVal && resVal.length > 0) {
                            const documentUpdated = this.getDocumentFromUri(textDocument.uri);
                            const newDoc = this.getUpToDateTextDocument(documentUpdated);
                            this.validateTextDocument(newDoc);
                        }
                        // If fix has not been performed by queue request , lint again after it is processed
                        else if (lintToProcess.options.fix === true) {
                            const documentUpdated = this.getDocumentFromUri(textDocument.uri);
                            const newDoc = this.getUpToDateTextDocument(documentUpdated);
                            this.validateTextDocument(newDoc);
                        }
                    }));
                    return Promise.resolve([]);
                }
                return res;
            }
            // Document is currently formatted or fixed: add the request in queue !
            // gather current lints details
            const currentFormatsOnDoc = currentActionsOnDoc.filter((currLinted) => currLinted.options && currLinted.options.format === true);
            const currentFixesOnDoc = currentActionsOnDoc.filter((currLinted) => currLinted.options && currLinted.options.fix === true);
            // Format request and no current format or fix: add in queue
            if (opts.format === true && currentFormatsOnDoc.length === 0 && currentFixesOnDoc.length === 0) {
                // add applyNow option because TextEdits won't be returned to formatting provided. edit textDocument directly from language server
                opts.applyNow = true;
                this.queuedLints.push({ uri: textDocument.uri, options: opts });
                debug(`Added in queue: ${textDocument.uri} (${JSON.stringify(opts)})`);
            }
            // Fix request and no current fix: add in queue
            else if (opts.fix === true && currentFixesOnDoc.length === 0) {
                this.queuedLints.push({ uri: textDocument.uri, options: opts });
                debug(`Added in queue: ${textDocument.uri} (${JSON.stringify(opts || '{}')})`);
            }
            // All other cases: do not add in queue, else actions would be redundant
            else {
                debug(`WE SHOULD NOT BE HERE : ${textDocument.uri} (${JSON.stringify(opts || '{}')})`);
            }
            return Promise.resolve([]);
        });
    }
    // Returns true if the request is format or fix
    isUpdateRequest(options) {
        return [options.format, options.fix].includes(true);
    }
    // Cancel all current and future document validations
    cancelAllDocumentValidations() {
        return __awaiter(this, void 0, void 0, function* () {
            this.queuedLints = [];
            for (const currLinted of this.currentlyLinted) {
                yield this.cancelDocumentValidation(currLinted.uri);
            }
        });
    }
    // Cancels a document validation
    cancelDocumentValidation(textDocumentUri) {
        return __awaiter(this, void 0, void 0, function* () {
            // Remove duplicates in queue ( ref: https://stackoverflow.com/a/56757215/7113625 )
            this.queuedLints = this.queuedLints.filter((v, i, a) => a.findIndex(t => (JSON.stringify(t) === JSON.stringify(v))) === i);
            this.queuedLints = this.queuedLints.filter((queuedLint) => queuedLint.uri !== textDocumentUri);
            // Find currently linted document
            this.currentlyLinted = this.currentlyLinted.filter((currLinted) => currLinted.uri !== textDocumentUri);
            this.connection.sendNotification(types_1.StatusNotification.type, {
                state: 'lint.cancel',
                documents: [{ documentUri: textDocumentUri }]
            });
        });
    }
    // Return quick fixes associated to a document
    getDocQuickFixes(textDocumentUri) {
        return this.docsDiagsQuickFixes.get(textDocumentUri) || [];
    }
    // Set document quick fixes
    setDocQuickFixes(textDocumentUri, docQuickFixes) {
        this.docsDiagsQuickFixes.set(textDocumentUri, docQuickFixes);
    }
    // Return NpmGroovyLint instance associated to a document
    getDocLinter(textDocumentUri) {
        return this.docLinters.get(textDocumentUri);
    }
    // Set document NpmGroovyLint instance
    setDocLinter(textDocumentUri, linter) {
        this.docLinters.set(textDocumentUri, linter);
    }
    // Delete stored doc linter
    deleteDocLinter(textDocumentUri) {
        this.docLinters.delete(textDocumentUri);
    }
    // Set rule description for later display
    getRuleDescriptions() {
        return this.ruleDescriptions;
    }
    // Set rule description for later display
    getRuleDescription(ruleName) {
        return this.ruleDescriptions.get(ruleName);
    }
    // Set rule description for later display
    setRuleDescriptions(rules) {
        Object.keys(rules).forEach(key => {
            this.ruleDescriptions.set(key, rules[key]);
        });
    }
    // Return current workspace folder
    getCurrentWorkspaceFolder() {
        return this.currentWorkspaceFolder;
    }
    // Set current workspace folder
    setCurrentWorkspaceFolder(textDocumentUri) {
        return __awaiter(this, void 0, void 0, function* () {
            const workspaceFolders = (yield this.connection.workspace.getWorkspaceFolders()) || [];
            const uriCompare = (0, path_1.resolve)(vscode_uri_1.URI.parse(textDocumentUri).fsPath);
            for (const wsFolder of workspaceFolders) {
                if (uriCompare.includes((0, path_1.resolve)(vscode_uri_1.URI.parse(wsFolder.uri).fsPath))) {
                    this.currentWorkspaceFolder = (0, path_1.resolve)(vscode_uri_1.URI.parse(wsFolder.uri).fsPath);
                    break;
                }
            }
        });
    }
    // Get task id from counter
    getNewTaskId() {
        this.currentTaskId++;
        return this.currentTaskId;
    }
    // If document has been updated during an operation, get its most recent state
    getUpToDateTextDocument(textDocument) {
        return this.documents.get(textDocument.uri) || textDocument; // Or expression, in case the textDocument is not opened yet
    }
    // Update diagnostics on client and store them in docsDiagnostics field
    updateDiagnostics(docUri, diagnostics) {
        return __awaiter(this, void 0, void 0, function* () {
            debug(`Update diagnostics for ${docUri}: ${diagnostics.length} diagnostics sent`);
            yield this.connection.sendDiagnostics({ uri: docUri, diagnostics: diagnostics });
            this.docsDiagnostics.set(docUri, diagnostics);
        });
    }
    /**
     * Deletes diagnostics for a document.
     *
     * @param docUri The document URI to rest.
     * @returns A Promise which resolved once the reset is complete.
     **/
    deleteDiagnostics(docUri) {
        return __awaiter(this, void 0, void 0, function* () {
            const diags = this.docsDiagnostics.get(docUri);
            debug(`Delete diagnostics for ${docUri} was: ${diags === null || diags === void 0 ? void 0 : diags.length}`);
            if (diags === undefined) {
                // Nothing to do, so don't trigger an extra notification.
                return;
            }
            this.deleteDocLinter(docUri);
            this.docsDiagnostics.delete(docUri);
            this.docsDiagsQuickFixes.delete(docUri);
            yield this.connection.sendDiagnostics({ uri: docUri, diagnostics: [] });
        });
    }
    // Remove diagnostic after it has been cleared
    removeDiagnostics(diagnosticsToRemove, textDocumentUri, removeAll, recalculateRangeLinePos) {
        return __awaiter(this, void 0, void 0, function* () {
            let docDiagnostics = this.docsDiagnostics.get(textDocumentUri) || [];
            for (const diagnosticToRemove of diagnosticsToRemove) {
                // Keep only diagnostics not matching diagnosticToRemove ()
                const diagnosticCodeNarcCode = diagnosticToRemove.code.split('-')[0];
                docDiagnostics = docDiagnostics === null || docDiagnostics === void 0 ? void 0 : docDiagnostics.filter(diag => (removeAll) ?
                    diag.code.split('-')[0] !== diagnosticCodeNarcCode :
                    diag.code !== diagnosticToRemove.code);
                // Recalculate diagnostic ranges if line number has changed
                if (recalculateRangeLinePos || recalculateRangeLinePos === 0) {
                    docDiagnostics = docDiagnostics === null || docDiagnostics === void 0 ? void 0 : docDiagnostics.map(diag => {
                        var _a, _b;
                        if (((_b = (_a = diag === null || diag === void 0 ? void 0 : diag.range) === null || _a === void 0 ? void 0 : _a.start) === null || _b === void 0 ? void 0 : _b.line) >= recalculateRangeLinePos) {
                            diag.range.start.line = diag.range.start.line + 1;
                            diag.range.end.line = diag.range.end.line + 1;
                        }
                        return diag;
                    });
                }
            }
            yield this.updateDiagnostics(textDocumentUri, docDiagnostics);
        });
    }
    // Enable/Disable debug mode depending on VsCode GroovyLint setting groovyLint.debug.enable
    refreshDebugMode(onInitialized) {
        return __awaiter(this, void 0, void 0, function* () {
            if (onInitialized && process.env.DEBUG) {
                // Use DEBUG env var if configured on initialization, so Run and Debug -> Play works as expected.
                return;
            }
            const settings = yield this.connection.workspace.getConfiguration({
                section: 'groovyLint'
            });
            // Enable debug logs if setting is set
            const debugLib = require("debug");
            if (settings.debug && settings.debug.enable === true) {
                debugLib.enable('vscode-groovy-lint');
                debugLib.enable('npm-groovy-lint');
            }
            // Disable if not set
            else {
                debugLib.disable('vscode-groovy-lint');
                debugLib.disable('npm-groovy-lint');
            }
        });
    }
}
exports.DocumentsManager = DocumentsManager;
//# sourceMappingURL=DocumentsManager.js.map