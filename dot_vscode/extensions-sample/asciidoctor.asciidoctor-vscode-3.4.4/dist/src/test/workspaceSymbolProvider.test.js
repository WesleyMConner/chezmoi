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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
require("mocha");
const vscode = __importStar(require("vscode"));
const documentSymbolProvider_1 = __importDefault(require("../features/documentSymbolProvider"));
const workspaceSymbolProvider_1 = __importDefault(require("../features/workspaceSymbolProvider"));
const asciidocLoader_1 = require("../asciidocLoader");
const asciidoctorConfig_1 = require("../features/asciidoctorConfig");
const asciidoctorExtensions_1 = require("../features/asciidoctorExtensions");
const asciidoctorDiagnostic_1 = require("../features/asciidoctorDiagnostic");
const helper_1 = require("./helper");
const security_1 = require("../security");
const symbolProvider = new documentSymbolProvider_1.default(null, new asciidocLoader_1.AsciidocLoader(new asciidoctorConfig_1.AsciidoctorConfig(), new asciidoctorExtensions_1.AsciidoctorExtensions(security_1.AsciidoctorExtensionsSecurityPolicyArbiter.activate(helper_1.extensionContext)), new asciidoctorDiagnostic_1.AsciidoctorDiagnostic('text'), helper_1.extensionContext));
suite('asciidoc.WorkspaceSymbolProvider', () => {
    test('Should not return anything for empty workspace', async () => {
        const provider = new workspaceSymbolProvider_1.default(symbolProvider, new InMemoryWorkspaceAsciidocDocumentProvider([]));
        assert.deepEqual(await provider.provideWorkspaceSymbols(''), []);
    });
});
class InMemoryWorkspaceAsciidocDocumentProvider {
    constructor(documents) {
        this._documents = new Map();
        this._onDidChangeAsciidocDocumentEmitter = new vscode.EventEmitter();
        this.onDidChangeAsciidocDocument = this._onDidChangeAsciidocDocumentEmitter.event;
        this._onDidCreateAsciidocDocumentEmitter = new vscode.EventEmitter();
        this.onDidCreateAsciidocDocument = this._onDidCreateAsciidocDocumentEmitter.event;
        this._onDidDeleteAsciidocDocumentEmitter = new vscode.EventEmitter();
        this.onDidDeleteAsciidocDocument = this._onDidDeleteAsciidocDocumentEmitter.event;
        for (const doc of documents) {
            this._documents.set(doc.fileName, doc);
        }
    }
    async getAllAsciidocDocuments() {
        return Array.from(this._documents.values());
    }
    updateDocument(document) {
        this._documents.set(document.fileName, document);
        this._onDidChangeAsciidocDocumentEmitter.fire(document);
    }
    createDocument(document) {
        assert.ok(!this._documents.has(document.uri.fsPath));
        this._documents.set(document.uri.fsPath, document);
        this._onDidCreateAsciidocDocumentEmitter.fire(document);
    }
    deleteDocument(resource) {
        this._documents.delete(resource.fsPath);
        this._onDidDeleteAsciidocDocumentEmitter.fire(resource);
    }
}
//# sourceMappingURL=workspaceSymbolProvider.test.js.map