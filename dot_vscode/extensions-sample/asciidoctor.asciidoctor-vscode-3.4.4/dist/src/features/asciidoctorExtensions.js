"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsciidoctorExtensions = void 0;
const vscode_1 = __importDefault(require("vscode"));
const mermaid_1 = require("./mermaid");
const findFiles_1 = require("../util/findFiles");
class AsciidoctorExtensions {
    constructor(asciidoctorExtensionsSecurityPolicy) {
        this.asciidoctorExtensionsSecurityPolicy = asciidoctorExtensionsSecurityPolicy;
    }
    async activate(registry) {
        const enableKroki = vscode_1.default.workspace.getConfiguration('asciidoc.extensions', null).get('enableKroki');
        if (enableKroki) {
            const kroki = require('asciidoctor-kroki');
            kroki.register(registry);
        }
        else {
            registry.block('mermaid', (0, mermaid_1.mermaidJSProcessor)());
        }
        await this.registerExtensionsInWorkspace(registry);
    }
    async confirmAsciidoctorExtensionsTrusted() {
        if (!this.isAsciidoctorExtensionsRegistrationEnabled()) {
            return false;
        }
        const extensionFiles = await this.getExtensionFilesInWorkspace();
        const extensionsCount = extensionFiles.length;
        if (extensionsCount === 0) {
            return false;
        }
        return this.asciidoctorExtensionsSecurityPolicy.confirmAsciidoctorExtensionsTrustMode(extensionsCount);
    }
    async getExtensionFilesInWorkspace() {
        return (0, findFiles_1.findFiles)('.asciidoctor/lib/**/*.js');
    }
    isAsciidoctorExtensionsRegistrationEnabled() {
        return vscode_1.default.workspace.getConfiguration('asciidoc.extensions', null).get('registerWorkspaceExtensions');
    }
    async registerExtensionsInWorkspace(registry) {
        const extensionsTrusted = await this.confirmAsciidoctorExtensionsTrusted();
        if (!extensionsTrusted) {
            return;
        }
        const extfiles = await this.getExtensionFilesInWorkspace();
        for (const extfile of extfiles) {
            const extPath = extfile.fsPath;
            try {
                delete require.cache[extPath];
                const extjs = require(extPath);
                extjs.register(registry);
            }
            catch (e) {
                vscode_1.default.window.showErrorMessage(extPath + ': ' + e.toString());
            }
        }
    }
}
exports.AsciidoctorExtensions = AsciidoctorExtensions;
//# sourceMappingURL=asciidoctorExtensions.js.map