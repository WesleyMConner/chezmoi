"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
const vscode_1 = require("vscode");
const chai_1 = __importDefault(require("chai"));
const workspace_1 = require("../util/workspace");
const expect = chai_1.default.expect;
suite('Normalize URI', () => {
    test('Should lowercase drive letter on Windows', async () => {
        if (os_1.default.platform() === 'win32') {
            const result = (0, workspace_1.normalizeUri)(vscode_1.Uri.parse('file:///C:/path/WITH/camelCase/A/b/C/index.adoc'));
            expect(result.path).to.equal('/c:/path/WITH/camelCase/A/b/C/index.adoc');
        }
    });
    test('Should do nothing since the drive letter is already lowercase', async () => {
        if (os_1.default.platform() === 'win32') {
            const result = (0, workspace_1.normalizeUri)(vscode_1.Uri.parse('file:///c:/path/WITH/camelCase/A/b/C/index.adoc'));
            expect(result.path).to.equal('/c:/path/WITH/camelCase/A/b/C/index.adoc');
        }
    });
    test('Should do nothing on Linux', async () => {
        if (os_1.default.platform() !== 'win32') {
            const result = (0, workspace_1.normalizeUri)(vscode_1.Uri.parse('/C/path/WITH/camelCase/A/b/C/index.adoc'));
            expect(result.path).to.equal('/C/path/WITH/camelCase/A/b/C/index.adoc');
        }
    });
});
//# sourceMappingURL=workspace.test.js.map