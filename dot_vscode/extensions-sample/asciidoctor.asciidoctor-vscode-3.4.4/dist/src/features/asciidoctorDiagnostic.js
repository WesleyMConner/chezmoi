"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsciidoctorDiagnostic = void 0;
const vscode_1 = __importDefault(require("vscode"));
class AsciidoctorDiagnostic {
    constructor(name) {
        this.errorCollection = vscode_1.default.languages.createDiagnosticCollection(name);
    }
    delete(textDocumentUri) {
        this.errorCollection.delete(textDocumentUri);
    }
    clearAll() {
        this.errorCollection.clear();
    }
    reportErrors(memoryLogger, textDocument) {
        const asciidocDebugConfig = vscode_1.default.workspace.getConfiguration('asciidoc.debug', null);
        if (asciidocDebugConfig.get('enableErrorDiagnostics')) {
            const diagnostics = [];
            memoryLogger.getMessages().forEach((error) => {
                let errorMessage = error.getText();
                let sourceLine = 0;
                let relatedFile = null;
                const diagnosticSource = 'asciidoctor.js';
                // allocate to line 0 in the absence of information
                let sourceRange = textDocument.lineAt(0).range;
                const location = error.getSourceLocation();
                if (location) { //There is a source location
                    if (location.getPath() === '<stdin>') { //error is within the file we are parsing
                        sourceLine = location.getLineNumber() - 1;
                        // ensure errors are always associated with a valid line
                        sourceLine = sourceLine >= textDocument.lineCount ? textDocument.lineCount - 1 : sourceLine;
                        sourceRange = textDocument.lineAt(sourceLine).range;
                    }
                    else { //error is coming from an included file
                        relatedFile = error.getSourceLocation();
                        // try to find the 'include' directive responsible from the info provided by Asciidoctor.js
                        sourceLine = textDocument.getText().split('\n').indexOf(textDocument.getText().split('\n').find((str) => str.startsWith('include') && str.includes(relatedFile.path)));
                        if (sourceLine !== -1) {
                            sourceRange = textDocument.lineAt(sourceLine).range;
                        }
                    }
                }
                else {
                    // generic error (e.g. :source-highlighter: coderay)
                    errorMessage = error.message;
                }
                let severity = vscode_1.default.DiagnosticSeverity.Information;
                if (error.getSeverity() === 'WARN') {
                    severity = vscode_1.default.DiagnosticSeverity.Warning;
                }
                else if (error.getSeverity() === 'ERROR') {
                    severity = vscode_1.default.DiagnosticSeverity.Error;
                }
                else if (error.getSeverity() === 'DEBUG') {
                    severity = vscode_1.default.DiagnosticSeverity.Information;
                }
                let diagnosticRelated = null;
                if (relatedFile) {
                    diagnosticRelated = [
                        new vscode_1.default.DiagnosticRelatedInformation(new vscode_1.default.Location(vscode_1.default.Uri.file(relatedFile.file), new vscode_1.default.Position(0, 0)), errorMessage),
                    ];
                    errorMessage = 'There was an error in an included file';
                }
                const diagnosticError = new vscode_1.default.Diagnostic(sourceRange, errorMessage, severity);
                diagnosticError.source = diagnosticSource;
                if (diagnosticRelated) {
                    diagnosticError.relatedInformation = diagnosticRelated;
                }
                diagnostics.push(diagnosticError);
            });
            this.errorCollection.set(textDocument.uri, diagnostics);
        }
    }
}
exports.AsciidoctorDiagnostic = AsciidoctorDiagnostic;
//# sourceMappingURL=asciidoctorDiagnostic.js.map