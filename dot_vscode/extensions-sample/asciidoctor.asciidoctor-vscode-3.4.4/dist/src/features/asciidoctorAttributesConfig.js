"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsciidoctorAttributesConfig = void 0;
const vscode_1 = __importDefault(require("vscode"));
const workspace_1 = require("../util/workspace");
class AsciidoctorAttributesConfig {
    static getPreviewAttributes() {
        const asciidocPreviewConfig = vscode_1.default.workspace.getConfiguration('asciidoc.preview', null);
        const attributes = asciidocPreviewConfig.get('asciidoctorAttributes', {});
        const workspacePath = (0, workspace_1.findDefaultWorkspaceFolderUri)()?.path;
        Object.keys(attributes).forEach((key) => {
            const attributeValue = attributes[key];
            if (typeof attributeValue === 'string') {
                attributes[key] = workspacePath === undefined
                    ? attributeValue
                    // eslint-disable-next-line no-template-curly-in-string
                    : attributeValue.replace('${workspaceFolder}', workspacePath);
            }
        });
        return {
            'env-vscode': '',
            env: 'vscode',
            'relfilesuffix@': '.adoc',
            ...attributes,
        };
    }
}
exports.AsciidoctorAttributesConfig = AsciidoctorAttributesConfig;
//# sourceMappingURL=asciidoctorAttributesConfig.js.map