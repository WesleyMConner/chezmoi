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
exports.AsciidocPreviewManager = void 0;
const vscode = __importStar(require("vscode"));
const dispose_1 = require("../util/dispose");
const topmostLineMonitor_1 = require("../util/topmostLineMonitor");
const preview_1 = require("./preview");
const previewConfig_1 = require("./previewConfig");
class AsciidocPreviewManager {
    constructor(_contentProvider, _logger, _contributionProvider) {
        this._contentProvider = _contentProvider;
        this._logger = _logger;
        this._contributionProvider = _contributionProvider;
        this._topmostLineMonitor = new topmostLineMonitor_1.AsciidocFileTopmostLineMonitor();
        this._previewConfigurations = new previewConfig_1.AsciidocPreviewConfigurationManager();
        this._previews = [];
        this._activePreview = undefined;
        this._disposables = [];
        this._disposables.push(vscode.window.registerWebviewPanelSerializer(preview_1.AsciidocPreview.viewType, this));
    }
    dispose() {
        (0, dispose_1.disposeAll)(this._disposables);
        (0, dispose_1.disposeAll)(this._previews);
    }
    refresh(forceUpdate = false) {
        for (const preview of this._previews) {
            preview.refresh(forceUpdate);
        }
    }
    updateConfiguration() {
        for (const preview of this._previews) {
            preview.updateConfiguration();
        }
    }
    preview(resource, previewSettings) {
        let preview = this.getExistingPreview(resource, previewSettings);
        if (preview) {
            preview.reveal(previewSettings.previewColumn);
        }
        else {
            preview = this.createNewPreview(resource, previewSettings);
        }
        preview.update(resource);
    }
    get activePreviewResource() {
        return this._activePreview && this._activePreview.resource;
    }
    get activePreviewResourceColumn() {
        return this._activePreview && this._activePreview.resourceColumn;
    }
    toggleLock() {
        const preview = this._activePreview;
        if (preview) {
            preview.toggleLock();
            // Close any previews that are now redundant, such as having two dynamic previews in the same editor group
            for (const otherPreview of this._previews) {
                if (otherPreview !== preview && preview.matches(otherPreview)) {
                    otherPreview.dispose();
                }
            }
        }
    }
    async deserializeWebviewPanel(webview, state) {
        const preview = await preview_1.AsciidocPreview.revive(webview, state, this._contentProvider, this._previewConfigurations, this._logger, this._topmostLineMonitor, this._contributionProvider);
        this.registerPreview(preview);
    }
    getExistingPreview(resource, previewSettings) {
        return this._previews.find((preview) => preview.matchesResource(resource, previewSettings.previewColumn, previewSettings.locked));
    }
    createNewPreview(resource, previewSettings) {
        const preview = preview_1.AsciidocPreview.create(resource, previewSettings.resourceColumn, previewSettings.previewColumn, previewSettings.locked, this._contentProvider, this._previewConfigurations, this._logger, this._topmostLineMonitor, this._contributionProvider);
        this.setPreviewActiveContext(true);
        this._activePreview = preview;
        return this.registerPreview(preview);
    }
    registerPreview(preview) {
        this._previews.push(preview);
        preview.onDispose(() => {
            const existing = this._previews.indexOf(preview);
            if (existing === -1) {
                return;
            }
            this._previews.splice(existing, 1);
            if (this._activePreview === preview) {
                this.setPreviewActiveContext(false);
                this._activePreview = undefined;
            }
        });
        preview.onDidChangeViewState(({ webviewPanel }) => {
            (0, dispose_1.disposeAll)(this._previews.filter((otherPreview) => preview !== otherPreview && preview.matches(otherPreview)));
            this.setPreviewActiveContext(webviewPanel.active);
            this._activePreview = webviewPanel.active ? preview : undefined;
        });
        return preview;
    }
    setPreviewActiveContext(value) {
        vscode.commands.executeCommand('setContext', AsciidocPreviewManager.asciidocPreviewActiveContextKey, value);
    }
}
exports.AsciidocPreviewManager = AsciidocPreviewManager;
AsciidocPreviewManager.asciidocPreviewActiveContextKey = 'asciidocPreviewFocus';
//# sourceMappingURL=previewManager.js.map