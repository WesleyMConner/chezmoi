"use strict";
/* --------------------
 * Copyright(C) Matthias Behr, 2020 - 2021.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeViewProvider = exports.TreeViewNode = void 0;
const vscode = require("vscode");
let _nextUniqueId = 1;
function createUniqueId() {
    const toRet = _nextUniqueId.toString();
    _nextUniqueId++;
    return toRet;
}
class TreeViewNode {
    constructor(label, parent, icon = null) {
        this.uri = null; // index provided as fragment #<index>
        this.children = [];
        this.id = createUniqueId();
        this.label = label;
        this.parent = parent;
        if (icon) {
            this.icon = new vscode.ThemeIcon(icon);
        }
    }
}
exports.TreeViewNode = TreeViewNode;
;
class TreeViewProvider {
    constructor() {
        this.treeRootNodes = [];
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.treeView = undefined;
    }
    updateNode(node, reveal = false, updateParent = false) {
        if (updateParent && node) {
            this._onDidChangeTreeData.fire(node.parent);
        }
        this._onDidChangeTreeData.fire(node);
        if (reveal && node !== null && this.treeView !== undefined) {
            // console.log(`TreeViewProvider.updateNode revealing`);
            this.treeView.reveal(node, { select: false, focus: false, expand: true }); // todo make options accessible
        }
    }
    getTreeItem(element) {
        // console.log(`dlt-logs.getTreeItem(${element.label}, ${element.uri?.toString()}) called.`);
        return {
            id: element.id,
            // uri?
            label: element.label.length ? element.label : "<treeview empty>",
            contextValue: element.contextValue,
            command: element.command,
            collapsibleState: element.children.length ? vscode.TreeItemCollapsibleState.Collapsed : void 0,
            iconPath: element.icon
        };
    }
    getChildren(element) {
        // console.log(`dlt-logs.getChildren(${element?.label}, ${element?.uri?.toString()}) this=${this} called (#treeRootNode=${this._treeRootNodes.length}).`);
        if (!element) { // if no element we have to return the root element.
            // console.log(`dlt-logs.getChildren(undefined), returning treeRootNodes`);
            return this.treeRootNodes;
        }
        else {
            // console.log(`dlt-logs.getChildren(${element?.label}, returning children = ${element.children.length}`);
            return element.children;
        }
    }
    getParent(element) {
        // console.log(`dlt-logs.getParent(${element.label}, ${element.uri?.toString()}) = ${element.parent?.label} called.`);
        return element.parent;
    }
    dispose() {
        console.log(`TreeViewProvider.dispose called...`);
    }
}
exports.TreeViewProvider = TreeViewProvider;
//# sourceMappingURL=treeViewProvider.js.map