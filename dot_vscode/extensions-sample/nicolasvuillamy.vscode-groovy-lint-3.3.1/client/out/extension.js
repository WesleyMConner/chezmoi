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
exports.deactivate = exports.activate = void 0;
const path = require("path");
const vscode = require("vscode");
const node_1 = require("vscode-languageclient/node");
const types_1 = require("./types");
const DIAGNOSTICS_COLLECTION_NAME = 'GroovyLint';
let diagnosticsCollection;
let client;
let statusBarItem;
let statusList = [];
let outputChannelShowedOnce = false;
function activate(context) {
    // Create diagnostics collection
    diagnosticsCollection = vscode.languages.createDiagnosticCollection(DIAGNOSTICS_COLLECTION_NAME);
    ///////////////////////////////////////////////
    /////////////// Server + client ///////////////
    ///////////////////////////////////////////////
    // The server is implemented in node
    let serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used.
    let serverOptions = {
        run: {
            module: serverModule,
            transport: node_1.TransportKind.ipc,
        },
        debug: {
            module: serverModule,
            transport: node_1.TransportKind.ipc,
            options: {
                execArgv: ['--nolazy', '--inspect=6009'],
                env: { "DEBUG": "vscode-groovy-lint,npm-groovy-lint" }
            }
        }
    };
    // Options to control the language client
    let clientOptions = {
        // Register the server for groovy documents
        documentSelector: [{ scheme: 'file', language: 'groovy' }],
        diagnosticCollectionName: DIAGNOSTICS_COLLECTION_NAME,
        progressOnInitialization: true,
        synchronize: {
            // Notify the server about file changes to '.clientrc files contained in the workspace
            fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
        }
    };
    // Create the language client and start the client.
    client = new node_1.LanguageClient('groovyLint', 'Groovy Lint', serverOptions, clientOptions);
    // Manage status bar item (with loading icon)
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'groovyLint.lint';
    statusBarItem.text = 'GroovyLint $(clock~spin)';
    statusBarItem.show();
    client.registerProposedFeatures();
    // Start the client. This will also launch the server
    client.start().then(() => {
        // Show status bar item to display & run groovy lint
        refreshStatusBar();
        // Manage status notifications
        client.onNotification(types_1.StatusNotification.type, (status) => __awaiter(this, void 0, void 0, function* () {
            yield updateStatus(status);
        }));
        // Open file in workspace when language server requests it
        client.onNotification(types_1.OpenNotification.type, (notifParams) => __awaiter(this, void 0, void 0, function* () {
            // Open textDocument from file path
            if (notifParams.file) {
                const openPath = vscode.Uri.parse("file:///" + notifParams.file); //A request file path
                const doc = yield vscode.workspace.openTextDocument(openPath);
                yield vscode.window.showTextDocument(doc, {
                    preserveFocus: true,
                    // eslint-disable-next-line eqeqeq
                    preview: (notifParams.preview != null) ? notifParams.preview : true
                });
            }
            // Open textDocument from URI
            else if (notifParams.uri) {
                const openPath = vscode.Uri.parse(notifParams.uri); //A request file path
                const doc = yield vscode.workspace.openTextDocument(openPath);
                yield vscode.window.showTextDocument(doc, {
                    preserveFocus: true,
                    // eslint-disable-next-line eqeqeq
                    preview: (notifParams.preview != null) ? notifParams.preview : true
                });
            }
            // Open url in external browser
            else if (notifParams.url) {
                yield vscode.env.openExternal(notifParams.url);
            }
        }));
        // Refresh status bar when active tab changes
        vscode.window.onDidChangeActiveTextEditor(() => __awaiter(this, void 0, void 0, function* () {
            yield refreshStatusBar();
            yield notifyDocumentToServer();
        }));
    });
}
exports.activate = activate;
// Stop client when extension is deactivated
function deactivate() {
    if (!client) {
        return undefined;
    }
    // Remove status bar
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    return client.stop();
}
exports.deactivate = deactivate;
// Update status list
function updateStatus(status) {
    return __awaiter(this, void 0, void 0, function* () {
        const incomingStatusDocUri = getStatusParamUri(status);
        // Start analyzing / formatting / fixing
        if (status.state.startsWith('lint.start')) {
            // Remove doublons on same document
            statusList = statusList.filter(statusObj => incomingStatusDocUri !== getStatusParamUri(statusObj));
            statusList.push(status);
            // Really open document previewed documents, so tab will not be replaced by next preview
            for (const docDef of status.documents) {
                const documentTextEditors = vscode.window.visibleTextEditors.filter(txtDoc => txtDoc.document.uri.toString() === docDef.documentUri);
                if (documentTextEditors && documentTextEditors[0]) {
                    yield vscode.window.showTextDocument(documentTextEditors[0].document, { preview: false, preserveFocus: true });
                }
            }
        }
        // End linting/fixing: remove from status list, and remove previous errors on same file if necessary
        else if (status.state.startsWith('lint.end')) {
            // Update status list
            statusList = statusList.filter(statusObj => statusObj.id !== status.id);
            // Show Problems panel just once (if user didn't choose otherwise)
            if (outputChannelShowedOnce === false && vscode.workspace.getConfiguration('groovyLint').get('showProblemsView', true) === true) {
                vscode.commands.executeCommand('workbench.panel.markers.view.focus');
                outputChannelShowedOnce = true;
            }
        }
        // Technical Error: display it for a minute, then remove it
        else if (status.state.startsWith('lint.error')) {
            statusList.push(status);
            setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                statusList = statusList.filter(statusObj => statusObj.id !== status.id);
                yield refreshStatusBar();
            }), 20000);
        }
        // Cancelled NPM Groovy Lint request
        else if (status.state.startsWith('lint.cancel')) {
            statusList = statusList.filter(statusObj => statusObj.id !== status.id);
        }
        // Refresh status bar content (icon + tooltip)
        yield refreshStatusBar();
    });
}
// Get URI from StatusParams
function getStatusParamUri(status) {
    return (status.documents && status.documents[0]) ? status.documents[0].documentUri : null;
}
// Notify language server of the currently viewed document
function notifyDocumentToServer() {
    return __awaiter(this, void 0, void 0, function* () {
        const textEditor = vscode.window.activeTextEditor;
        const docUri = (textEditor && textEditor.document && textEditor.document.uri) ? textEditor.document.uri.toString() : '';
        client.sendNotification(types_1.ActiveDocumentNotification.type, {
            uri: docUri
        });
    });
}
// Update text editor & status bar
function refreshStatusBar() {
    return __awaiter(this, void 0, void 0, function* () {
        // Fix running
        if (statusList.filter(status => status.state === 'lint.start.fix').length > 0) {
            statusBarItem.text = `GroovyLint $(gear~spin)`;
            statusBarItem.color = new vscode.ThemeColor('statusBar.debuggingForeground');
        }
        // Format running
        else if (statusList.filter(status => status.state === 'lint.start.format').length > 0) {
            statusBarItem.text = `GroovyLint $(smiley~spin)`;
            statusBarItem.color = new vscode.ThemeColor('statusBar.debuggingForeground');
        }
        // Lint running
        else if (statusList.filter(status => status.state === 'lint.start').length > 0) {
            statusBarItem.text = 'GroovyLint $(sync~spin)';
            statusBarItem.color = new vscode.ThemeColor('statusBar.debuggingForeground');
        }
        // No lint running but pending error(s)
        else if (statusList.filter(status => status.state === 'lint.error').length > 0) {
            statusBarItem.text = 'GroovyLint $(error)';
            statusBarItem.color = new vscode.ThemeColor('errorForeground');
        }
        else {
            statusBarItem.text = 'GroovyLint $(zap)';
            statusBarItem.color = new vscode.ThemeColor('statusBarItem.prominentForeground');
        }
        // Compute and display job statuses
        const tooltips = statusList.map((status) => {
            return (status.state === 'lint.start') ? '• analyzing ' + status.lastFileName + ' ...' :
                (status.state === 'lint.start.fix') ? '• auto-fixing ' + status.lastFileName + ' ...' :
                    (status.state === 'lint.start.format') ? '• formatting ' + status.lastFileName + ' ...' :
                        (status.state === 'lint.error') ? '• Error while processing ' + status.lastFileName :
                            `ERROR in GroovyLint: unknown status ${status.state} (plz contact developers if you see that`;
        });
        if (tooltips.length > 0) {
            statusBarItem.tooltip = tooltips.join('\n');
        }
        else {
            statusBarItem.tooltip = 'No current task';
        }
        // Show/Hide status bar depending on file type and current tasks
        const textEditor = vscode.window.activeTextEditor;
        const isGroovy = textEditor && textEditor.document && textEditor.document.languageId === 'groovy';
        if (statusList.length > 0 && !isGroovy) {
            statusBarItem.show();
            statusBarItem.command = null;
        }
        else if (isGroovy) {
            statusBarItem.show();
            statusBarItem.command = 'groovyLint.lint';
        }
        else {
            statusBarItem.hide();
        }
    });
}
//# sourceMappingURL=extension.js.map