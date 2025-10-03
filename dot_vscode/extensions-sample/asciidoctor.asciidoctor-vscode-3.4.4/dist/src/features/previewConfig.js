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
exports.AsciidocPreviewConfigurationManager = exports.AsciidocPreviewConfiguration = void 0;
const vscode = __importStar(require("vscode"));
const workspace_1 = require("../util/workspace");
class AsciidocPreviewConfiguration {
    static getForResource(resource) {
        return new AsciidocPreviewConfiguration(resource);
    }
    constructor(resource) {
        const editorConfig = vscode.workspace.getConfiguration('editor', resource);
        const asciidocConfig = vscode.workspace.getConfiguration('asciidoc', resource);
        const asciidocEditorConfig = vscode.workspace.getConfiguration('[asciidoc]', resource);
        this.scrollBeyondLastLine = editorConfig.get('scrollBeyondLastLine', false);
        this.wordWrap = editorConfig.get('wordWrap', 'off') !== 'off';
        if (asciidocEditorConfig && asciidocEditorConfig['editor.wordWrap']) {
            this.wordWrap = asciidocEditorConfig['editor.wordWrap'] !== 'off';
        }
        this.scrollPreviewWithEditor = !!asciidocConfig.get('preview.scrollPreviewWithEditor', true);
        this.scrollEditorWithPreview = !!asciidocConfig.get('preview.scrollEditorWithPreview', true);
        this.doubleClickToSwitchToEditor = !!asciidocConfig.get('preview.doubleClickToSwitchToEditor', true);
        this.markEditorSelection = !!asciidocConfig.get('preview.markEditorSelection', true);
        this.preservePreviewWhenHidden = !!asciidocConfig.get('preview.preservePreviewWhenHidden', false);
        this.fontFamily = asciidocConfig.get('preview.fontFamily', undefined);
        this.fontSize = Math.max(8, +asciidocConfig.get('preview.fontSize', NaN));
        this.lineHeight = Math.max(0.6, +asciidocConfig.get('preview.lineHeight', NaN));
        this.styles = asciidocConfig.get('styles', []); // REMIND: unused, we should either use it or remove it!
        this.useEditorStylesheet = asciidocConfig.get('preview.useEditorStyle', false);
        this.previewStyle = asciidocConfig.get('preview.style', '');
        this.previewTemplates = asciidocConfig.get('preview.templates', []);
        this.refreshInterval = Math.max(0.6, +asciidocConfig.get('preview.refreshInterval', NaN));
    }
    isEqualTo(otherConfig) {
        // eslint-disable-next-line prefer-const
        for (let key in this) {
            if (Object.prototype.hasOwnProperty.call(this, key) && key !== 'styles') {
                if (this[key] !== otherConfig[key]) {
                    return false;
                }
            }
        }
        // Check styles
        if (this.styles.length !== otherConfig.styles.length) {
            return false;
        }
        for (let i = 0; i < this.styles.length; ++i) {
            if (this.styles[i] !== otherConfig.styles[i]) {
                return false;
            }
        }
        return true;
    }
}
exports.AsciidocPreviewConfiguration = AsciidocPreviewConfiguration;
class AsciidocPreviewConfigurationManager {
    constructor() {
        this.previewConfigurationsForWorkspaces = new Map();
    }
    loadAndCacheConfiguration(resource) {
        const config = AsciidocPreviewConfiguration.getForResource(resource);
        this.previewConfigurationsForWorkspaces.set(this.getKey(resource), config);
        return config;
    }
    hasConfigurationChanged(resource) {
        const key = this.getKey(resource);
        const currentConfig = this.previewConfigurationsForWorkspaces.get(key);
        const newConfig = AsciidocPreviewConfiguration.getForResource(resource);
        return (!currentConfig || !currentConfig.isEqualTo(newConfig));
    }
    getKey(resource) {
        return (0, workspace_1.getWorkspaceFolder)(resource)?.uri?.path || '';
    }
}
exports.AsciidocPreviewConfigurationManager = AsciidocPreviewConfigurationManager;
//# sourceMappingURL=previewConfig.js.map