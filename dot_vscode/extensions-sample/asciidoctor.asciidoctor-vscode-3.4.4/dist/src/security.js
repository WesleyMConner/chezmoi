"use strict";
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
exports.AsciidoctorExtensionsTrustModeSelector = exports.AsciidoctorExtensionsSecurityPolicyArbiter = exports.PreviewSecuritySelector = exports.ExtensionContentSecurityPolicyArbiter = void 0;
const vscode = __importStar(require("vscode"));
const nls = __importStar(require("vscode-nls"));
const workspace_1 = require("./util/workspace");
const localize = nls.loadMessageBundle(__filename);
class ExtensionContentSecurityPolicyArbiter {
    constructor(globalState, workspaceState) {
        this.globalState = globalState;
        this.workspaceState = workspaceState;
        this.oldTrustedWorkspaceKey = 'trusted_preview_workspace:';
        this.securityLevelKey = 'preview_security_level:';
        this.shouldDisableSecurityWarningKey = 'preview_should_show_security_warning:';
        this.globalState = globalState;
        this.workspaceState = workspaceState;
    }
    getSecurityLevelForResource(resource) {
        // Use new security level setting first
        const level = this.globalState.get(this.securityLevelKey + this.getRoot(resource), undefined);
        if (typeof level !== 'undefined') {
            return level;
        }
        // Fallback to old trusted workspace setting
        if (this.globalState.get(this.oldTrustedWorkspaceKey + this.getRoot(resource), false)) {
            return 2 /* AsciidocPreviewSecurityLevel.AllowScriptsAndAllContent */;
        }
        return 0 /* AsciidocPreviewSecurityLevel.Strict */;
    }
    async setSecurityLevelForResource(resource, level) {
        return this.globalState.update(this.securityLevelKey + this.getRoot(resource), level);
    }
    shouldAllowSvgsForResource(resource) {
        const securityLevel = this.getSecurityLevelForResource(resource);
        return securityLevel === 1 /* AsciidocPreviewSecurityLevel.AllowInsecureContent */ || securityLevel === 2 /* AsciidocPreviewSecurityLevel.AllowScriptsAndAllContent */;
    }
    shouldDisableSecurityWarnings() {
        return this.workspaceState.get(this.shouldDisableSecurityWarningKey, false);
    }
    async setShouldDisableSecurityWarning(disabled) {
        return this.workspaceState.update(this.shouldDisableSecurityWarningKey, disabled);
    }
    getRoot(resource) {
        const workspaceFolder = (0, workspace_1.getWorkspaceFolders)();
        if (workspaceFolder) {
            const folderForResource = (0, workspace_1.getWorkspaceFolder)(resource);
            if (folderForResource) {
                return folderForResource.uri;
            }
            if (workspaceFolder.length) {
                return workspaceFolder[0].uri;
            }
        }
        return resource;
    }
}
exports.ExtensionContentSecurityPolicyArbiter = ExtensionContentSecurityPolicyArbiter;
class PreviewSecuritySelector {
    constructor(cspArbiter, webviewManager) {
        this.cspArbiter = cspArbiter;
        this.webviewManager = webviewManager;
        this.cspArbiter = cspArbiter;
        this.webviewManager = webviewManager;
    }
    async showSecuritySelectorForResource(resource) {
        function markActiveWhen(when) {
            return when ? '• ' : '';
        }
        const currentSecurityLevel = this.cspArbiter.getSecurityLevelForResource(resource);
        const selection = await vscode.window.showQuickPick([
            {
                type: 0 /* AsciidocPreviewSecurityLevel.Strict */,
                label: markActiveWhen(currentSecurityLevel === 0 /* AsciidocPreviewSecurityLevel.Strict */) + localize(0, null),
                description: localize(1, null),
            }, {
                type: 3 /* AsciidocPreviewSecurityLevel.AllowInsecureLocalContent */,
                label: markActiveWhen(currentSecurityLevel === 3 /* AsciidocPreviewSecurityLevel.AllowInsecureLocalContent */) + localize(2, null),
                description: localize(3, null),
            }, {
                type: 1 /* AsciidocPreviewSecurityLevel.AllowInsecureContent */,
                label: markActiveWhen(currentSecurityLevel === 1 /* AsciidocPreviewSecurityLevel.AllowInsecureContent */) + localize(4, null),
                description: localize(5, null),
            }, {
                type: 2 /* AsciidocPreviewSecurityLevel.AllowScriptsAndAllContent */,
                label: markActiveWhen(currentSecurityLevel === 2 /* AsciidocPreviewSecurityLevel.AllowScriptsAndAllContent */) + localize(6, null),
                description: localize(7, null),
            }, {
                type: 'toggle',
                label: this.cspArbiter.shouldDisableSecurityWarnings()
                    ? localize(8, null)
                    : localize(9, null),
                description: localize(10, null),
            },
        ], {
            placeHolder: localize(11, null),
        });
        if (!selection) {
            return;
        }
        if (selection.type === 'moreinfo') {
            vscode.commands.executeCommand('vscode.open', vscode.Uri.parse('https://go.microsoft.com/fwlink/?linkid=854414'));
            return;
        }
        if (selection.type === 'toggle') {
            await this.cspArbiter.setShouldDisableSecurityWarning(!this.cspArbiter.shouldDisableSecurityWarnings());
            return;
        }
        await this.cspArbiter.setSecurityLevelForResource(resource, selection.type);
        this.webviewManager.refresh();
    }
}
exports.PreviewSecuritySelector = PreviewSecuritySelector;
class AsciidoctorExtensionsSecurityPolicyArbiter {
    constructor(context) {
        this.context = context;
        this.allowAsciidoctorExtensionsKey = 'asciidoc.allow_asciidoctor_extensions';
        this.trustAsciidoctorExtensionsAuthorsKey = 'asciidoc.trust_asciidoctor_extensions_authors';
        this.context = context;
    }
    static activate(context) {
        AsciidoctorExtensionsSecurityPolicyArbiter.instance = new AsciidoctorExtensionsSecurityPolicyArbiter(context);
        return AsciidoctorExtensionsSecurityPolicyArbiter.instance;
    }
    static getInstance() {
        if (!AsciidoctorExtensionsSecurityPolicyArbiter.instance) {
            throw new Error('AsciidoctorExtensionsSecurityPolicyArbiter must be activated by calling #activate()');
        }
        return AsciidoctorExtensionsSecurityPolicyArbiter.instance;
    }
    async enableAsciidoctorExtensions() {
        return this.setAllowAsciidoctorExtensions(true);
    }
    asciidoctorExtensionsAuthorsTrusted() {
        return this.context.workspaceState.get(this.trustAsciidoctorExtensionsAuthorsKey, undefined);
    }
    async denyAsciidoctorExtensionsAuthors() {
        return this.setTrustAsciidoctorExtensionsAuthors(false);
    }
    async trustAsciidoctorExtensionsAuthors() {
        return this.setTrustAsciidoctorExtensionsAuthors(true);
    }
    async confirmAsciidoctorExtensionsTrustMode(extensionsCount) {
        const extensionsTrusted = this.asciidoctorExtensionsAuthorsTrusted();
        if (extensionsTrusted !== undefined) {
            // Asciidoctor.js extensions authors are already trusted or not, do not ask again.
            return extensionsTrusted;
        }
        return this.showTrustAsciidoctorExtensionsDialog(extensionsCount);
    }
    async showTrustAsciidoctorExtensionsDialog(extensionsCount) {
        const userChoice = await vscode.window.showWarningMessage(`This feature will execute ${extensionsCount} JavaScript ${extensionsCount > 1 ? 'files' : 'file'} from .asciidoctor/lib/**/*.js.
      Do you trust the authors of ${extensionsCount > 1 ? 'these files' : 'this file'}?`, 
        // "modal" is disabled. Because, I couldn't control the button's order in Linux when "modal" is enabled.
        { title: 'Yes, I trust the authors', value: true }, { title: 'No, I don\'t trust the authors', value: false });
        // if userChoice is undefined, no choice was selected, consider that we don't trust authors.
        const trustGranted = userChoice?.value || false;
        await this.setTrustAsciidoctorExtensionsAuthors(trustGranted);
        return trustGranted;
    }
    async setAllowAsciidoctorExtensions(value) {
        return this.context.workspaceState.update(this.allowAsciidoctorExtensionsKey, value);
    }
    async setTrustAsciidoctorExtensionsAuthors(value) {
        return this.context.workspaceState.update(this.trustAsciidoctorExtensionsAuthorsKey, value);
    }
}
exports.AsciidoctorExtensionsSecurityPolicyArbiter = AsciidoctorExtensionsSecurityPolicyArbiter;
class AsciidoctorExtensionsTrustModeSelector {
    async showSelector() {
        const aespArbiter = AsciidoctorExtensionsSecurityPolicyArbiter.getInstance();
        const asciidoctorExtensionsAuthorsTrusted = aespArbiter.asciidoctorExtensionsAuthorsTrusted();
        function markActiveWhen(when) {
            return when ? '• ' : '';
        }
        const userChoice = await vscode.window.showQuickPick([
            {
                type: 'deny_asciidoctor_extensions_authors',
                label: markActiveWhen(asciidoctorExtensionsAuthorsTrusted === false) + localize(12, null),
                description: localize(13, null),
            }, {
                type: 'trust_asciidoctor_extensions_authors',
                label: markActiveWhen(asciidoctorExtensionsAuthorsTrusted === true) + localize(14, null),
                description: localize(15, null),
            },
        ], {
            placeHolder: localize(16, null),
        });
        if (!userChoice) {
            return;
        }
        if (userChoice.type === 'deny_asciidoctor_extensions_authors') {
            await aespArbiter.denyAsciidoctorExtensionsAuthors();
        }
        if (userChoice.type === 'trust_asciidoctor_extensions_authors') {
            await aespArbiter.enableAsciidoctorExtensions(); // make sure that Asciidoctor.js extensions are enabled
            await aespArbiter.trustAsciidoctorExtensionsAuthors();
        }
    }
}
exports.AsciidoctorExtensionsTrustModeSelector = AsciidoctorExtensionsTrustModeSelector;
//# sourceMappingURL=security.js.map