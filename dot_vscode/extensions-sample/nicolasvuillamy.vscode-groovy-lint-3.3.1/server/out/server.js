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
/* eslint-disable eqeqeq */
const node_1 = require("vscode-languageserver/node");
const { performance } = require('perf_hooks');
const codeActions_1 = require("./codeActions");
const DocumentsManager_1 = require("./DocumentsManager");
const commands_1 = require("./commands");
const types_1 = require("./types");
const debug = require("debug")("vscode-groovy-lint");
const trace = require("debug")("vscode-groovy-lint-trace");
const NpmGroovyLint = require("npm-groovy-lint/lib/groovy-lint.js");
const onTypeDelayBeforeLint = 3000;
// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
// Doc manager is a live instance managing the extension all along its execution
const docManager = new DocumentsManager_1.DocumentsManager(connection);
// Return language server capabilities
connection.onInitialize((params) => {
    debug('GroovyLint: initializing server');
    return {
        capabilities: {
            textDocumentSync: {
                change: node_1.TextDocumentSyncKind.Incremental,
                openClose: true,
                willSaveWaitUntil: true
            },
            documentFormattingProvider: true,
            executeCommandProvider: {
                commands: commands_1.commands.map(command => command.command),
                dynamicRegistration: true
            },
            codeActionProvider: {
                codeActionKinds: [node_1.CodeActionKind.QuickFix]
            }
        }
    };
});
// Register workspace actions when server is initialized
connection.onInitialized(() => __awaiter(void 0, void 0, void 0, function* () {
    // Register for the client notifications we can use
    connection.client.register(node_1.DidChangeConfigurationNotification.type);
    connection.client.register(node_1.DidSaveTextDocumentNotification.type);
    //connection.client.register(ActiveDocumentNotification.type);
    debug('GroovyLint: initialized server');
    yield docManager.refreshDebugMode(true);
}));
// Kill CodeNarcServer when closing VsCode or deactivate extension
connection.onShutdown(() => __awaiter(void 0, void 0, void 0, function* () {
    yield new NpmGroovyLint({ killserver: true }, {}).run();
}));
connection.onExit(() => __awaiter(void 0, void 0, void 0, function* () {
    yield new NpmGroovyLint({ killserver: true }, {}).run();
}));
// Lint again all opened documents in configuration changed
// wait N seconds in case a new config change arrive, run just after the last one
connection.onDidChangeConfiguration((change) => __awaiter(void 0, void 0, void 0, function* () {
    debug(`change configuration event received: restart server and lint again all open documents ${JSON.stringify(change, null, 2)}`);
    yield docManager.cancelAllDocumentValidations();
    yield new NpmGroovyLint({ killserver: true }, {}).run();
    yield docManager.lintAgainAllOpenDocuments();
}));
// Handle command requests from client
connection.onExecuteCommand((params) => __awaiter(void 0, void 0, void 0, function* () {
    yield docManager.executeCommand(params);
}));
// Handle formatting request from client
connection.onDocumentFormatting((params) => __awaiter(void 0, void 0, void 0, function* () {
    const { textDocument } = params;
    debug(`Formatting request received from client for ${textDocument.uri} with params ${JSON.stringify(params)}`);
    if (params && params.options.tabSize) {
        yield docManager.updateDocumentSettings(textDocument.uri, { tabSize: params.options.tabSize });
    }
    const document = docManager.getDocumentFromUri(textDocument.uri);
    return yield docManager.formatTextDocument(document);
}));
// Manage to provide code actions (QuickFixes) when the user selects a part of the source code containing diagnostics
connection.onCodeAction((codeActionParams) => __awaiter(void 0, void 0, void 0, function* () {
    if (!codeActionParams.context.diagnostics.length) {
        return [];
    }
    debug(`Code action request received from client for ${codeActionParams.textDocument.uri}`);
    trace(`codeActionParams: ${JSON.stringify(codeActionParams, null, 2)}`);
    const document = docManager.getDocumentFromUri(codeActionParams.textDocument.uri);
    if (document == null) {
        return [];
    }
    const docQuickFixes = docManager.getDocQuickFixes(codeActionParams.textDocument.uri);
    return (0, codeActions_1.provideQuickFixCodeActions)(document, codeActionParams, docQuickFixes);
}));
// Notification from client that active window has changed
connection.onNotification(types_1.ActiveDocumentNotification.type, (params) => __awaiter(void 0, void 0, void 0, function* () {
    docManager.setCurrentDocumentUri(params.uri);
    yield docManager.setCurrentWorkspaceFolder(params.uri);
}));
// Lint groovy doc on open
docManager.documents.onDidOpen((event) => __awaiter(void 0, void 0, void 0, function* () {
    debug(`File open event received for ${event.document.uri}`);
    const textDocument = docManager.getDocumentFromUri(event.document.uri, true);
    yield docManager.setCurrentWorkspaceFolder(event.document.uri);
    yield docManager.validateTextDocument(textDocument);
}));
// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
let lastCall;
docManager.documents.onDidChangeContent((change) => __awaiter(void 0, void 0, void 0, function* () {
    if (change.document.languageId !== 'groovy') {
        return;
    }
    docManager.setCurrentDocumentUri(change.document.uri);
    docManager.deleteDocLinter(change.document.uri);
    const settings = yield docManager.getDocumentSettings(change.document.uri);
    if (settings.lint.next) {
        // Previous requested lint.
        docManager.updateDocumentSettings(change.document.uri, { lint: { next: false } });
        yield docManager.validateTextDocument(change.document);
        return;
    }
    if (settings.lint.trigger === 'onType') {
        // Wait to request linting.
        lastCall = `${change.document.uri}-${performance.now()}`;
        const lastCallLocal = lastCall + '';
        setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
            if (lastCall === lastCallLocal) {
                yield docManager.validateTextDocument(change.document);
            }
        }), onTypeDelayBeforeLint);
    }
}));
// Lint on save if it has been configured
docManager.documents.onDidSave((event) => __awaiter(void 0, void 0, void 0, function* () {
    debug(`Save event received for: ${event.document.uri}`);
    const textDocument = docManager.getDocumentFromUri(event.document.uri, true);
    const settings = yield docManager.getDocumentSettings(textDocument.uri);
    if (settings.fix.trigger === 'onSave') {
        debug(`Save trigger fix for: ${textDocument.uri}`);
        yield docManager.validateTextDocument(textDocument, { fix: true });
    }
    else if (settings.lint.trigger === 'onSave') {
        debug(`Save trigger lint for: ${textDocument.uri}`);
        yield docManager.validateTextDocument(textDocument);
    }
    else {
        debug(`Save no action for: ${textDocument.uri}`);
    }
}));
// Only keep settings for open documents
docManager.documents.onDidClose((event) => __awaiter(void 0, void 0, void 0, function* () {
    yield docManager.deleteDiagnostics(event.document.uri);
    docManager.removeDocumentSettings(event.document.uri);
    yield docManager.cancelDocumentValidation(event.document.uri);
}));
// Make the text document manager listen on the connection
// for open, change and close text document events
docManager.documents.listen(connection);
// Listen on the connection
connection.listen();
//# sourceMappingURL=server.js.map