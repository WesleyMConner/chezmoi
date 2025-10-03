"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisableAntoraSupport = exports.EnableAntoraSupport = exports.antoraSupportEnabledContextKey = void 0;
const vscode_1 = require("vscode");
exports.antoraSupportEnabledContextKey = 'antoraSupportEnabled';
class EnableAntoraSupport {
    constructor(workspaceState, asciidocPreviewManager) {
        this.workspaceState = workspaceState;
        this.asciidocPreviewManager = asciidocPreviewManager;
        this.id = 'asciidoc.enableAntoraSupport';
    }
    execute() {
        this.workspaceState.update('antoraSupportSetting', true)
            .then(() => {
            vscode_1.commands.executeCommand('setContext', exports.antoraSupportEnabledContextKey, true).then(() => {
                this.asciidocPreviewManager.refresh(true);
            });
        });
    }
}
exports.EnableAntoraSupport = EnableAntoraSupport;
class DisableAntoraSupport {
    constructor(workspaceState, asciidocPreviewManager) {
        this.workspaceState = workspaceState;
        this.asciidocPreviewManager = asciidocPreviewManager;
        this.id = 'asciidoc.disableAntoraSupport';
    }
    execute() {
        this.workspaceState.update('antoraSupportSetting', false)
            .then(() => {
            vscode_1.commands.executeCommand('setContext', exports.antoraSupportEnabledContextKey, false).then(() => {
                this.asciidocPreviewManager.refresh(true);
            });
        });
    }
}
exports.DisableAntoraSupport = DisableAntoraSupport;
//# sourceMappingURL=antoraSupport.js.map