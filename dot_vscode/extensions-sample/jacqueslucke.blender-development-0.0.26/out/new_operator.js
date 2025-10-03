"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMAND_newOperator = COMMAND_newOperator;
const vscode = require("vscode");
const path = require("path");
const paths_1 = require("./paths");
const utils_1 = require("./utils");
async function COMMAND_newOperator() {
    let editor = vscode.window.activeTextEditor;
    if (editor === undefined)
        return;
    let operatorName = await vscode.window.showInputBox({
        placeHolder: 'Name',
    });
    if (operatorName === undefined)
        return Promise.reject((0, utils_1.cancel)());
    let group = 'object';
    await insertOperator(editor, operatorName, group);
}
async function insertOperator(editor, name, group) {
    let className = (0, utils_1.nameToClassIdentifier)(name) + 'Operator';
    let idname = group + '.' + (0, utils_1.nameToIdentifier)(name);
    let text = await (0, utils_1.readTextFile)(path.join(paths_1.templateFilesDir, 'operator_simple.py'));
    text = (0, utils_1.multiReplaceText)(text, {
        CLASS_NAME: className,
        OPERATOR_CLASS: 'bpy.types.Operator',
        IDNAME: idname,
        LABEL: name,
    });
    let workspaceEdit = new vscode.WorkspaceEdit();
    if (!hasImportBpy(editor.document)) {
        workspaceEdit.insert(editor.document.uri, new vscode.Position(0, 0), 'import bpy\n');
    }
    workspaceEdit.replace(editor.document.uri, editor.selection, '\n' + text + '\n');
    await vscode.workspace.applyEdit(workspaceEdit);
}
function hasImportBpy(document) {
    for (let i = 0; i < document.lineCount; i++) {
        let line = document.lineAt(i);
        if (line.text.match(/import.*\bbpy\b/)) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=new_operator.js.map