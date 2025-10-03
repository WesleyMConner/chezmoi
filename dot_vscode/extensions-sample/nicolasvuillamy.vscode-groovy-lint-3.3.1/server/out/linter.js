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
exports.executeLinter = void 0;
const vscode_uri_1 = require("vscode-uri");
const path = require("path");
const clientUtils_1 = require("./clientUtils");
const linterParser_1 = require("./linterParser");
const types_1 = require("./types");
const vscode_languageserver_1 = require("vscode-languageserver");
const commands_1 = require("./commands");
const NpmGroovyLint = require("npm-groovy-lint/lib/groovy-lint.js");
const debug = require("debug")("vscode-groovy-lint");
const trace = require("debug")("vscode-groovy-lint-trace");
const { performance } = require('perf_hooks');
const issuesUrl = "https://github.com/nvuillam/vscode-groovy-lint/issues";
// Validate a groovy file (just lint, or also format or fix)
function executeLinter(textDocument_1, docManager_1) {
    return __awaiter(this, arguments, void 0, function* (textDocument, docManager, opts = { fix: false, format: false, showDocumentIfErrors: false, force: false }) {
        var _a, _b, _c;
        debug(`Request execute npm-groovy-lint for ${textDocument.uri} with options ${JSON.stringify(opts)}`);
        const perfStart = performance.now();
        // Get settings and stop if action not enabled
        let settings = yield docManager.getDocumentSettings(textDocument.uri);
        // Linter disabled
        if (settings.enable === false) {
            debug(`VsCodeGroovyLint is disabled: activate it in VsCode GroovyLint settings`);
            return Promise.resolve([]);
        }
        // Formatter disabled
        if (opts.format && settings.format.enable === false) {
            debug(`Formatter is disabled: activate it in VsCode settings`);
            return Promise.resolve([]);
        }
        // Fixer disabled
        if (opts.fix && settings.fix.enable === false) {
            debug(`Fixing is disabled: activate it in VsCode GroovyLint settings`);
            return Promise.resolve([]);
        }
        // In case lint was queues, get most recent version of textDocument
        textDocument = docManager.getUpToDateTextDocument(textDocument);
        let source = textDocument.getText();
        // Propose to replace tabs by spaces if there are, because CodeNarc hates tabs :/
        const fileNm = path.basename(textDocument.uri);
        source = yield manageFixSourceBeforeCallingLinter(source, textDocument, docManager);
        // If user was prompted and did not respond, do not lint
        if (source === 'cancel') {
            debug(`User did not answer to the question: leave`);
            return Promise.resolve([]);
        }
        // If file is empty, do not lint
        else if (source === '') {
            debug(`Empty file: no sources to lint`);
            return Promise.resolve([]);
        }
        // Tabs has been replaced by spaces
        else if (source === 'updated') {
            debug(`Sources has been updated to replace tabs by spaces`);
            return Promise.resolve([]);
        }
        // Check if there is an existing NpmGroovyLint instance with same source (except if format, fix or force)
        let isSimpleLintIdenticalSource = false;
        const prevLinter = docManager.getDocLinter(textDocument.uri);
        if (prevLinter && prevLinter.options.source === source && ![opts.format, opts.fix, opts.force].includes(true)) {
            isSimpleLintIdenticalSource = true;
        }
        // Manage format & fix params
        let format = false;
        let verb = 'analyzing';
        // Add format param if necessary
        if (opts.format) {
            format = true;
            verb = 'formatting';
        }
        // Add fix param if necessary
        let fix = false;
        if (opts.fix) {
            fix = true;
            verb = 'auto-fixing';
        }
        // Get a new task id
        const linterTaskId = docManager.getNewTaskId();
        // If the first lint request is not completed yet, wait for it, to be sure the CodeNarc server is already running to process next requests
        if (linterTaskId > 1 && docManager.getRuleDescriptions().size === 0) {
            debug('Wait for initial lint request to be completed before running the following ones');
            yield new Promise((resolve) => {
                const waitSrvInterval = setInterval(() => {
                    if (docManager.getRuleDescriptions().size > 0) {
                        clearInterval(waitSrvInterval);
                        resolve(true);
                    }
                }, 300);
                // FailSafe just in case... but we shouldn't get there
                setTimeout(() => {
                    if (docManager.getRuleDescriptions().size === 0) {
                        clearInterval(waitSrvInterval);
                        resolve(true);
                    }
                }, 120000);
            });
        }
        // Notify client that lint is starting
        docManager.connection.sendNotification(types_1.StatusNotification.type, {
            id: linterTaskId,
            state: 'lint.start' + (fix ? '.fix' : format ? '.format' : ''),
            documents: [{ documentUri: textDocument.uri }],
            lastFileName: fileNm
        });
        // Build NmpGroovyLint config
        const npmGroovyLintConfig = {
            source: source,
            sourcefilepath: vscode_uri_1.URI.parse(textDocument.uri).fsPath,
            parse: true, // Parse by default but not if format or fix mode
            nolintafter: true,
            loglevel: (format) ? 'info' : settings.basic.loglevel,
            returnrules: docManager.getRuleDescriptions().size > 0 ? false : true,
            insight: ((_a = settings === null || settings === void 0 ? void 0 : settings.insight) === null || _a === void 0 ? void 0 : _a.enable) === true ? true : false,
            output: 'none',
            verbose: settings.basic.verbose,
            failon: 'none'
        };
        const npmGroovyLintExecParam = {};
        // Request formatting
        if (format) {
            npmGroovyLintConfig.format = true;
            npmGroovyLintConfig.parse = false;
        }
        else if (fix) {
            // Request fixing
            npmGroovyLintConfig.fix = true;
            npmGroovyLintConfig.parse = false;
            // Request fixing only some rules
            if (opts.fixrules) {
                npmGroovyLintConfig.rulesets = opts.fixrules.join(',');
                npmGroovyLintConfig.fixrules = opts.fixrules.join(',');
            }
        }
        else {
            // Calculate requestKey (used to cancel current lint when a duplicate new one is incoming) only if not format or fix
            const requestKey = npmGroovyLintConfig.sourcefilepath + '-' + npmGroovyLintConfig.output;
            npmGroovyLintExecParam.requestKey = requestKey;
        }
        let linter;
        // Use generic config file if defined in VsCode
        if (settings.basic.config) {
            npmGroovyLintConfig.config = settings.basic.config;
        }
        // Add Indent size provided by VsCode API
        if (settings.tabSize && settings.format.useDocumentIndentSize === true) {
            npmGroovyLintConfig.rulesets = `Indentation{"spacesPerIndentLevel":${settings.tabSize}}`;
            npmGroovyLintConfig.rulesetsoverridetype = "appendConfig";
        }
        // Disable Indentation rule if Indent size setting is not found
        else if (settings.format.useDocumentIndentSize === true) {
            npmGroovyLintConfig.rulesets = `Indentation{"enabled":false}`;
            npmGroovyLintConfig.rulesetsoverridetype = "appendConfig";
        }
        // Java & options override
        if (settings.java.executable) {
            npmGroovyLintConfig.javaexecutable = settings.java.executable;
        }
        if (settings.java.options) {
            npmGroovyLintConfig.javaoptions = settings.java.options;
        }
        // If source has not changed, do not lint again
        if (isSimpleLintIdenticalSource === true) {
            debug(`Ignoring new analyze of ${textDocument.uri} as its content has not changed since previous lint`);
            linter = prevLinter;
        }
        else {
            // Run npm-groovy-lint linter/fixer
            docManager.deleteDocLinter(textDocument.uri);
            console.info(`Start ${verb} ${textDocument.uri}`);
            linter = new NpmGroovyLint(npmGroovyLintConfig, npmGroovyLintExecParam);
            try {
                debug(`Run npm-groovy-lint ${verb} for ${textDocument.uri}`);
                trace(`Config: ${JSON.stringify(npmGroovyLintConfig, null, 2)}\nExecParam: ${JSON.stringify(npmGroovyLintExecParam, null, 2)}`);
                yield linter.run();
                debug(`Done npm-groovy-lint ${verb} for ${textDocument.uri}`);
                if (!format) {
                    docManager.setDocLinter(textDocument.uri, linter);
                }
                trace(`Lint result: ${JSON.stringify(linter.lintResult)}`);
                // Managed cancelled lint case
                if (linter.status === 9) {
                    docManager.connection.sendNotification(types_1.StatusNotification.type, {
                        id: linterTaskId,
                        state: 'lint.cancel',
                        documents: [{ documentUri: textDocument.uri }],
                        lastFileName: fileNm
                    });
                    return Promise.resolve([]);
                }
                if (linter.status !== 0 && linter.error && linter.error.msg) {
                    // Fatal unexpected error: display in console
                    console.error('===========================================================================');
                    console.error('===========================================================================');
                    console.error('npm-groovy-lint error: ' + linter.error.msg + '\n' + linter.error.stack);
                    console.error(`If you still have an error, post an issue to get help: ${issuesUrl}`);
                    console.error('===========================================================================');
                    console.error('===========================================================================');
                    // Notify UI of the error
                    docManager.connection.sendNotification(types_1.StatusNotification.type, {
                        id: linterTaskId,
                        state: 'lint.error',
                        documents: [{ documentUri: textDocument.uri }],
                        lastFileName: fileNm
                    });
                    // If user decided so, do not display future crashes
                    if (docManager.ignoreNotifyCrashes === true) {
                        return Promise.resolve([]);
                    }
                    // Display message to user
                    const doNotDisplayAgain = 'Do not display again';
                    const reportErrorLabel = 'Report error';
                    let errorMessageForUser = `There has been an unexpected error while calling npm-groovy-lint. Please join the end of the logs in Output/GroovyLint if you report the issue`;
                    yield new Promise(resolve => {
                        require("find-java-home")((err) => {
                            if (err) {
                                errorMessageForUser = "Java is required to use VsCode Groovy Lint, as CodeNarc is written in Java/Groovy. Please install Java (version 8 minimum) https://www.java.com/en/download/ ,then type \"java -version\" in command line to verify that the installation is correct";
                            }
                            resolve(true);
                        });
                    });
                    const msg = {
                        type: vscode_languageserver_1.MessageType.Error,
                        message: errorMessageForUser,
                        actions: [
                            { title: reportErrorLabel },
                            { title: doNotDisplayAgain }
                        ]
                    };
                    const res = yield docManager.connection.sendRequest(vscode_languageserver_1.ShowMessageRequest.type, msg);
                    // Open repo issues page if use clicks on Report
                    if ((res === null || res === void 0 ? void 0 : res.title) === reportErrorLabel) {
                        docManager.connection.sendNotification(types_1.OpenNotification.type, { url: issuesUrl });
                    }
                    else if ((res === null || res === void 0 ? void 0 : res.title) === doNotDisplayAgain) {
                        docManager.ignoreNotifyCrashes = true;
                    }
                    return Promise.resolve([]);
                }
            }
            catch (e) {
                // If error, send notification to client
                const ex = e;
                console.error('VsCode Groovy Lint error: ' + ex.message + '\n' + ex.stack);
                debug(`Error processing ${textDocument.uri}` + ex.message + '\n' + ex.stack);
                docManager.connection.sendNotification(types_1.StatusNotification.type, {
                    id: linterTaskId,
                    state: 'lint.error',
                    documents: [{ documentUri: textDocument.uri }],
                    lastFileName: fileNm
                });
                return Promise.resolve([]);
            }
            console.info(`Completed ${verb} ${textDocument.uri} in ${(performance.now() - perfStart).toFixed(0)} ms found ${((_c = (_b = linter === null || linter === void 0 ? void 0 : linter.lintResult) === null || _b === void 0 ? void 0 : _b.summary) === null || _c === void 0 ? void 0 : _c.totalFoundNumber) || 0} results`);
        }
        // Parse results
        const lintResults = linter.lintResult || {};
        const { diagnostics, fixFailures } = (0, linterParser_1.parseLinterResults)(lintResults, source, textDocument, docManager);
        // Store rules descriptions if returned
        if (lintResults.rules) {
            debug(`Store rule descriptions from NpmGroovyLint`);
            docManager.setRuleDescriptions(lintResults.rules);
        }
        textDocument = docManager.getUpToDateTextDocument(textDocument);
        const sourceAfterLintButBeforeApply = textDocument.getText();
        let textEdits = [];
        // Check if the document has been manually updated during the format or fix
        if ([format, fix].includes(true) && sourceAfterLintButBeforeApply !== source) {
            // Show message to user and propose to process again the format or fix action
            debug(`Source of ${textDocument.uri} has been updated: updates not applied`);
            const processAgainTitle = 'Process Again';
            const msg = {
                type: vscode_languageserver_1.MessageType.Warning,
                message: `GroovyLint did not update the sources of ${path.parse(textDocument.uri).name} as it has been manually during the request`,
                actions: [
                    { title: processAgainTitle }
                ]
            };
            docManager.connection.sendRequest('window/showMessageRequest', msg).then((rqstResp) => __awaiter(this, void 0, void 0, function* () {
                // If user clicked Process Again, run again the related command
                if ((rqstResp === null || rqstResp === void 0 ? void 0 : rqstResp.title) === processAgainTitle) {
                    const commandAgain = (format) ? 'vscode.executeFormatDocumentProvider' : (fix) ? commands_1.COMMAND_LINT_FIX.command : '';
                    debug(`Process again command ${commandAgain} after user clicked on message`);
                    yield docManager.connection.client.executeCommand(commandAgain, [textDocument.uri], {});
                }
            }));
        }
        // Send updated sources to client if format mode
        else if (format === true && linter.status === 0 && linter.lintResult.summary.totalFixedNumber > 0) {
            const updatedSource = (0, clientUtils_1.getUpdatedSource)(linter, source);
            const textEdit = (0, clientUtils_1.createTextEditReplaceAll)(source, updatedSource);
            if (opts.applyNow) {
                yield (0, clientUtils_1.applyTextDocumentEditOnWorkspace)(docManager, textDocument, textEdit);
            }
            else {
                textEdits.push(textEdit);
            }
            // Display fix failures if existing
            yield (0, clientUtils_1.notifyFixFailures)(fixFailures, docManager);
        }
        // Send updated sources to client if fix mode
        else if (fix === true && linter.status === 0 && linter.lintResult.summary.totalFixedNumber > 0) {
            const updatedSource = (0, clientUtils_1.getUpdatedSource)(linter, source);
            const textEdit = (0, clientUtils_1.createTextEditReplaceAll)(source, updatedSource);
            yield (0, clientUtils_1.applyTextDocumentEditOnWorkspace)(docManager, textDocument, textEdit);
            // Display fix failures if existing
            yield (0, clientUtils_1.notifyFixFailures)(fixFailures, docManager);
        }
        // Call if from lintFolder: open document and display diagnostics if
        if (opts.showDocumentIfErrors == true && diagnostics.length > 0) {
            yield docManager.connection.sendNotification(types_1.OpenNotification.type, { uri: textDocument.uri, preview: false });
            debug(`updateDiagnostics: lintFolder ${textDocument.uri} count: ${diagnostics.length}`);
            yield docManager.updateDiagnostics(textDocument.uri, diagnostics);
        }
        // Remove diagnostics in case the file has been closed since the lint request
        else if (!docManager.isDocumentOpenInClient(textDocument.uri) && !(opts.displayErrorsEvenIfDocumentClosed === true)) {
            debug(`updateDiagnostics: closed file ${textDocument.uri} count: 0`);
            yield docManager.updateDiagnostics(textDocument.uri, []);
        }
        // Update diagnostics if this is not a format or fix calls (for format & fix, a lint is called just after)
        else if (![format, fix].includes(true)) {
            debug(`updateDiagnostics: not format or fix ${textDocument.uri} count: ${diagnostics.length}`);
            yield docManager.updateDiagnostics(textDocument.uri, diagnostics);
        }
        // Notify client of end of linting
        docManager.connection.sendNotification(types_1.StatusNotification.type, {
            id: linterTaskId,
            state: 'lint.end' + (fix ? '.fix' : format ? '.format' : ''),
            documents: [{
                    documentUri: textDocument.uri
                }],
            lastFileName: fileNm,
            lastLintTimeMs: performance.now() - perfStart
        });
        // Return textEdits only in case of formatting request
        return Promise.resolve(textEdits);
    });
}
exports.executeLinter = executeLinter;
// If necessary, fix source before sending it to CodeNarc
function manageFixSourceBeforeCallingLinter(source, textDocument, docManager) {
    return __awaiter(this, void 0, void 0, function* () {
        if (source.includes("\t") && docManager.neverFixTabs === false) {
            let fixTabs = false;
            if (docManager.autoFixTabs === false) {
                const msg = {
                    type: vscode_languageserver_1.MessageType.Info,
                    message: "CodeNarc linter doesn't like tabs, let's replace them by spaces ?",
                    actions: [
                        { title: "Always (recommended)" },
                        { title: "Yes" },
                        { title: "No" },
                        { title: "Never" }
                    ]
                };
                let req;
                let msgResponseReceived = false;
                // When message box closes after no action, Promise is never fulfilled, so track that case to unlock linter queue
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    if (msgResponseReceived === false) {
                        yield docManager.cancelDocumentValidation(textDocument.uri);
                    }
                }), 10000);
                try {
                    req = yield docManager.connection.sendRequest('window/showMessageRequest', msg);
                    msgResponseReceived = true;
                }
                catch (e) {
                    const ex = e;
                    debug('No response from showMessageRequest: ' + ex.message);
                    req = null;
                }
                if (req == null) {
                    return 'cancel';
                }
                else if ((req === null || req === void 0 ? void 0 : req.title) === "Always (recommended)") {
                    docManager.autoFixTabs = true;
                }
                else if ((req === null || req === void 0 ? void 0 : req.title) === "Yes") {
                    fixTabs = true;
                }
                else if ((req === null || req === void 0 ? void 0 : req.title) === "Never") {
                    docManager.neverFixTabs = true;
                }
            }
            // Get indent length from config file then apply it on file instead of tabs
            if (docManager.autoFixTabs || fixTabs) {
                let indentLength = 4; // Default
                const textDocumentFilePath = vscode_uri_1.URI.parse(textDocument.uri).fsPath;
                const tmpLinter = new NpmGroovyLint({
                    sourcefilepath: textDocumentFilePath,
                    output: 'none',
                    failon: 'none'
                }, {});
                const tmpStartPath = path.dirname(textDocumentFilePath);
                let tmpConfigFilePath = yield tmpLinter.getConfigFilePath(tmpStartPath);
                if (tmpConfigFilePath) {
                    const configUser = yield tmpLinter.loadConfig(tmpConfigFilePath, 'format');
                    if (configUser.rules && configUser.rules['Indentation'] && configUser.rules['Indentation']["spacesPerIndentLevel"]) {
                        indentLength = configUser.rules['Indentation']["spacesPerIndentLevel"];
                    }
                }
                const replaceChars = " ".repeat(indentLength);
                const newSources = source.replace(/\t/g, replaceChars);
                if (newSources !== source) {
                    const textEdit = (0, clientUtils_1.createTextEditReplaceAll)(source, newSources);
                    yield (0, clientUtils_1.applyTextDocumentEditOnWorkspace)(docManager, textDocument, textEdit);
                    debug(`Replaced tabs with spaces in ${textDocument.uri}`);
                    return 'updated';
                }
            }
        }
        return source;
    });
}
//# sourceMappingURL=linter.js.map