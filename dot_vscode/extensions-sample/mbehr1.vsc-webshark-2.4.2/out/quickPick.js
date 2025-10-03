"use strict";
/* --------------------
 * Copyright(C) Matthias Behr, 2020 - 2021.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickInputHelper = exports.PickItem = void 0;
const vscode = require("vscode");
class PickItem {
    constructor() { this.name = '<noname>'; }
    get label() {
        if (this.icon) {
            return `${this.icon} ${this.name}`;
        }
        else {
            return this.name;
        }
    }
    get alwaysShow() { return true; }
}
exports.PickItem = PickItem;
;
class QuickInputHelper {
    static createQuickPick(title, step, totalSteps) {
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = title;
        quickPick.ignoreFocusOut = true; // todo add cancel button?
        quickPick.canSelectMany = true;
        quickPick.matchOnDescription = true;
        quickPick.step = step;
        quickPick.totalSteps = totalSteps;
        if (step !== undefined && step > 1) {
            // add back button:
            quickPick.buttons = [vscode.QuickInputButtons.Back];
        }
        return quickPick;
    }
    static async show(quickPick) {
        const disposables = [];
        try {
            return await new Promise((resolve, reject) => {
                disposables.push(quickPick.onDidAccept(() => {
                    quickPick.busy = true;
                    console.log(`show onDidAccept() got selectedItems.length=${quickPick.selectedItems.length} and value='${quickPick.value}'`);
                    quickPick.enabled = false; // no hide here. done by dispose
                    resolve(quickPick.selectedItems.length ? quickPick.selectedItems : quickPick.value);
                }));
                // todo add support for validation of entered filter text
                disposables.push(quickPick.onDidTriggerButton(button => {
                    if (button === vscode.QuickInputButtons.Back) {
                        reject(vscode.QuickInputButtons.Back);
                    }
                }));
                disposables.push(quickPick.onDidHide(() => {
                    console.log(`show onDidHide()...`);
                    reject();
                }));
                quickPick.show();
            });
        }
        finally {
            disposables.forEach(d => d.dispose());
        }
    }
}
exports.QuickInputHelper = QuickInputHelper;
//# sourceMappingURL=quickPick.js.map