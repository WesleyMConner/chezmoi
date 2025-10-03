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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsciidocPreview = void 0;
const vscode = __importStar(require("vscode"));
const uri = __importStar(require("vscode-uri"));
const path = __importStar(require("path"));
const dispose_1 = require("../util/dispose");
const topmostLineMonitor_1 = require("../util/topmostLineMonitor");
const file_1 = require("../util/file");
const openDocumentLink_1 = require("../commands/openDocumentLink");
const nls = __importStar(require("vscode-nls"));
const workspace_1 = require("../util/workspace");
const localize = nls.loadMessageBundle(__filename);
class AsciidocPreview extends dispose_1.Disposable {
    static async revive(webview, state, contentProvider, previewConfigurations, logger, topmostLineMonitor, contributionProvider) {
        const resource = vscode.Uri.parse(state.source);
        const locked = state.locked || false;
        const line = state.line;
        const preview = new AsciidocPreview(webview, resource, locked, contentProvider, previewConfigurations, logger, topmostLineMonitor, contributionProvider);
        preview.editor.webview.options = AsciidocPreview.getWebviewOptions(resource, contributionProvider, previewConfigurations.loadAndCacheConfiguration(resource));
        if (!isNaN(line)) {
            preview.line = line;
        }
        await preview.doUpdate();
        return preview;
    }
    static create(resource, resourceColumn, previewColumn, locked, contentProvider, previewConfigurations, logger, topmostLineMonitor, contributionProvider) {
        const retainContextWhenHidden = vscode.workspace
            .getConfiguration('asciidoc', null)
            .get('preview.preservePreviewWhenHidden', false);
        const webview = vscode.window.createWebviewPanel(AsciidocPreview.viewType, AsciidocPreview.getPreviewTitle(resource, locked), previewColumn, {
            enableFindWidget: true,
            retainContextWhenHidden,
            ...AsciidocPreview.getWebviewOptions(resource, contributionProvider, previewConfigurations.loadAndCacheConfiguration(resource)),
        });
        return new AsciidocPreview(webview, resource, locked, contentProvider, previewConfigurations, logger, topmostLineMonitor, contributionProvider);
    }
    constructor(webview, resource, locked, _contentProvider, _previewConfigurations, _logger, topmostLineMonitor, _contributionProvider) {
        super();
        this._contentProvider = _contentProvider;
        this._previewConfigurations = _previewConfigurations;
        this._logger = _logger;
        this._contributionProvider = _contributionProvider;
        this.line = undefined;
        this.disposables = [];
        this.firstUpdate = true;
        this.forceUpdate = false;
        this.isScrolling = false;
        this._disposed = false;
        this.imageInfo = [];
        this._onDisposeEmitter = new vscode.EventEmitter();
        this.onDispose = this._onDisposeEmitter.event;
        this._onDidChangeViewStateEmitter = new vscode.EventEmitter();
        this.onDidChangeViewState = this._onDidChangeViewStateEmitter.event;
        this._resource = resource;
        this._locked = locked;
        this.editor = webview;
        this.config = vscode.workspace.getConfiguration('asciidoc', this.resource);
        this.refreshInterval = this.config.get('preview.refreshInterval');
        this.editor.onDidDispose(() => {
            this.dispose();
        }, null, this.disposables);
        this.editor.onDidChangeViewState((e) => {
            this._onDidChangeViewStateEmitter.fire(e);
        }, null, this.disposables);
        this.editor.webview.onDidReceiveMessage((e) => {
            if (e.source !== this._resource.toString()) {
                return;
            }
            switch (e.type) {
                case 'cacheImageSizes':
                    this.onCacheImageSizes(e.body);
                    break;
                case 'revealLine':
                    this.onDidScrollPreview(e.body.line);
                    break;
                case 'clickLink':
                    this.onDidClickPreviewLink(e.body.href);
                    break;
                case 'showPreviewSecuritySelector':
                    vscode.commands.executeCommand('asciidoc.showPreviewSecuritySelector', e.body.source);
                    break;
                case 'previewStyleLoadError':
                    vscode.window.showWarningMessage(localize(0, null, e.body.unloadedStyles.join(', ')));
                    break;
            }
        }, null, this.disposables);
        vscode.workspace.onDidChangeTextDocument((event) => {
            if (this.isPreviewOf(event.document.uri)) {
                this.refresh();
            }
        }, null, this.disposables);
        topmostLineMonitor.onDidChangeTopmostLine((event) => {
            if (this.isPreviewOf(event.resource)) {
                this.updateForView(event.resource, event.line);
            }
        }, null, this.disposables);
        vscode.window.onDidChangeTextEditorSelection((event) => {
            if (this.isPreviewOf(event.textEditor.document.uri)) {
                const line = event.selections[0].active.line;
                this.line = line;
                this.postMessage({
                    type: 'onDidChangeTextEditorSelection',
                    line,
                    source: this.resource.toString(),
                });
            }
        }, null, this.disposables);
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor && (0, file_1.isAsciidocFile)(editor.document) && !this._locked) {
                this.update(editor.document.uri);
            }
        }, null, this.disposables);
    }
    get resource() {
        return this._resource;
    }
    get resourceColumn() {
        return this._resourceColumn || vscode.ViewColumn.One;
    }
    get state() {
        return {
            resource: this._resource.toString(),
            locked: this._locked,
            line: this.line,
            imageInfo: this.imageInfo,
        };
    }
    dispose() {
        super.dispose();
        this._disposed = true;
        this._onDisposeEmitter.fire();
        this._onDisposeEmitter.dispose();
        this._onDidChangeViewStateEmitter.dispose();
        this.editor.dispose();
        (0, dispose_1.disposeAll)(this.disposables);
        clearTimeout(this.throttleTimer);
        this.throttleTimer = undefined;
    }
    // This method is invoked evrytime there is a document update
    update(resource) {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.uri.fsPath === resource.fsPath) {
            this.line = (0, topmostLineMonitor_1.getVisibleLine)(editor);
        }
        // If we have changed resources, cancel any pending updates
        const isResourceChange = resource.fsPath !== this._resource.fsPath;
        if (isResourceChange) {
            clearTimeout(this.throttleTimer);
            this.throttleTimer = undefined;
        }
        this._resource = resource;
        // Schedule update if none is pending
        if (!this.throttleTimer) {
            if (isResourceChange || this.firstUpdate || this.forceUpdate) {
                this.doUpdate();
            }
            else {
                if (this.refreshInterval > 0) {
                    this.throttleTimer = setTimeout(() => this.doUpdate(), this.refreshInterval);
                }
            }
        }
        this.firstUpdate = false;
    }
    refresh(forceUpdate = false) {
        this.forceUpdate = forceUpdate;
        this.update(this._resource);
    }
    updateConfiguration() {
        if (this._previewConfigurations.hasConfigurationChanged(this._resource)) {
            this.config = vscode.workspace.getConfiguration('asciidoc', this.resource);
            this.refreshInterval = this.config.get('preview.refreshInterval');
            this.refresh();
        }
    }
    get position() {
        return this.editor.viewColumn;
    }
    matchesResource(otherResource, otherPosition, otherLocked) {
        if (this.position !== otherPosition) {
            return false;
        }
        if (this._locked) {
            return otherLocked && this.isPreviewOf(otherResource);
        }
        else {
            return !otherLocked;
        }
    }
    matches(otherPreview) {
        return this.matchesResource(otherPreview._resource, otherPreview.position, otherPreview._locked);
    }
    reveal(viewColumn) {
        this.editor.reveal(viewColumn);
    }
    toggleLock() {
        this._locked = !this._locked;
        this.editor.title = AsciidocPreview.getPreviewTitle(this._resource, this._locked);
    }
    get iconPath() {
        const root = vscode.Uri.joinPath(this._contributionProvider.extensionUri, 'media');
        return {
            light: vscode.Uri.joinPath(root, 'preview-light.svg'),
            dark: vscode.Uri.joinPath(root, 'preview-dark.svg'),
        };
    }
    isPreviewOf(resource) {
        return this._resource.fsPath === resource.fsPath;
    }
    static getPreviewTitle(resource, locked) {
        return locked
            ? localize(1, null, path.basename(resource.fsPath))
            : localize(2, null, path.basename(resource.fsPath));
    }
    updateForView(resource, topLine) {
        if (!this.isPreviewOf(resource)) {
            return;
        }
        if (this.isScrolling) {
            this.isScrolling = false;
            return;
        }
        if (typeof topLine === 'number') {
            this.line = topLine;
            this.postMessage({
                type: 'updateView',
                line: topLine,
                source: resource.toString(),
            });
        }
    }
    postMessage(msg) {
        if (!this._disposed) {
            this.editor.webview.postMessage(msg);
        }
    }
    // Do the preview content update
    async doUpdate() {
        this._logger.log('Updating the preview content');
        const resource = this._resource;
        clearTimeout(this.throttleTimer);
        this.throttleTimer = undefined;
        if (this._disposed) {
            return;
        }
        const document = await vscode.workspace.openTextDocument(resource);
        if (!this.forceUpdate && this.currentVersion &&
            this.currentVersion.resource.fsPath === resource.fsPath &&
            this.currentVersion.version === document.version) {
            if (this.line) {
                this.updateForView(resource, this.line);
            }
            return;
        }
        this.forceUpdate = false;
        this.currentVersion = { resource, version: document.version };
        // add webView
        if (this._resource === resource) {
            this.editor.title = AsciidocPreview.getPreviewTitle(this._resource, this._locked);
        }
        this.editor.iconPath = this.iconPath;
        const asciidocPreviewConfiguration = this._previewConfigurations.loadAndCacheConfiguration(resource);
        this.editor.webview.options = AsciidocPreview.getWebviewOptions(resource, this._contributionProvider, asciidocPreviewConfiguration);
        this.editor.webview.html = await this._contentProvider.providePreviewHTML(document, this._previewConfigurations, this, this.line);
    }
    static getWebviewOptions(resource, contributionProvider, asciidocPreviewConfiguration) {
        return {
            enableScripts: true,
            enableCommandUris: true,
            localResourceRoots: AsciidocPreview.getLocalResourceRoots(resource, contributionProvider, asciidocPreviewConfiguration),
        };
    }
    static getLocalResourceRoots(resource, contributionProvider, asciidocPreviewConfiguration) {
        const baseRoots = [
            vscode.Uri.joinPath(contributionProvider.extensionUri, 'media'),
            vscode.Uri.joinPath(contributionProvider.extensionUri, 'dist'),
        ];
        const previewStylePath = asciidocPreviewConfiguration.previewStyle;
        if (previewStylePath !== '') {
            const previewStyleUri = vscode.Uri.parse(previewStylePath);
            baseRoots.push(uri.Utils.dirname(previewStyleUri));
        }
        const folder = (0, workspace_1.getWorkspaceFolder)(resource);
        if (folder) {
            const workspaceRoots = (0, workspace_1.getWorkspaceFolders)()?.map((folder) => folder.uri);
            if (workspaceRoots) {
                baseRoots.push(...workspaceRoots);
            }
        }
        else {
            baseRoots.push(uri.Utils.dirname(resource));
        }
        return baseRoots;
    }
    onDidScrollPreview(line) {
        this.line = line;
        for (const editor of vscode.window.visibleTextEditors) {
            if (!this.isPreviewOf(editor.document.uri)) {
                continue;
            }
            this.isScrolling = true;
            const sourceLine = Math.floor(line);
            const fraction = line - sourceLine;
            const text = editor.document.lineAt(sourceLine).text;
            const start = Math.floor(fraction * text.length);
            editor.revealRange(new vscode.Range(sourceLine, start, sourceLine + 1, 0), vscode.TextEditorRevealType.AtTop);
        }
    }
    resolveDocumentLink(href) {
        let [hrefPath, fragment] = href.split('#').map((c) => decodeURIComponent(c));
        if (hrefPath.startsWith('file:///')) {
            hrefPath = hrefPath.replace('file://', '');
        }
        if (!hrefPath.startsWith('/')) {
            // Relative path. Resolve relative to the file
            hrefPath = path.join(path.dirname(this.resource.fsPath), hrefPath);
        }
        return { path: hrefPath, fragment };
    }
    async onDidClickPreviewLink(href) {
        const targetResource = this.resolveDocumentLink(href);
        const openLinks = this.config.get('preview.openLinksToAsciidocFiles', 'inPreview');
        if (openLinks === 'inPreview') {
            const asciidocLink = await (0, openDocumentLink_1.resolveLinkToAsciidocFile)(targetResource.path);
            if (asciidocLink) {
                this.update(asciidocLink);
                return;
            }
        }
        vscode.commands.executeCommand('_asciidoc.openDocumentLink', targetResource);
    }
    async onCacheImageSizes(imageInfo) {
        this.imageInfo = imageInfo;
    }
    asWebviewUri(resource) {
        return this.editor.webview.asWebviewUri(resource);
    }
    asMediaWebViewSrc(...pathSegments) {
        return this.escapeAttribute(this.asWebviewUri(vscode.Uri.joinPath(this._contributionProvider.extensionUri, ...pathSegments)));
    }
    get cspSource() {
        return this.editor.webview.cspSource;
    }
    escapeAttribute(value) {
        return value.toString().replace(/"/g, '&quot;');
    }
}
exports.AsciidocPreview = AsciidocPreview;
AsciidocPreview.viewType = 'asciidoc.preview';
//# sourceMappingURL=preview.js.map