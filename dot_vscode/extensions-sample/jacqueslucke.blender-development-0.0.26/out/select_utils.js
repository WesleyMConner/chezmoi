"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.letUserPickItem = letUserPickItem;
const vscode = require("vscode");
const utils_1 = require("./utils");
async function letUserPickItem(items, placeholder = undefined) {
    let quickPick = vscode.window.createQuickPick();
    quickPick.items = items;
    quickPick.placeholder = placeholder;
    return new Promise((resolve, reject) => {
        quickPick.onDidAccept(() => {
            resolve(quickPick.activeItems[0]);
            quickPick.hide();
        });
        quickPick.onDidHide(() => {
            reject((0, utils_1.cancel)());
            quickPick.dispose();
        });
        quickPick.show();
    });
}
//# sourceMappingURL=select_utils.js.map