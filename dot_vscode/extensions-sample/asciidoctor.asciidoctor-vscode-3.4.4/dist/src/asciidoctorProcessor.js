"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsciidoctorProcessor = void 0;
const core_1 = __importDefault(require("@asciidoctor/core"));
const docbook_converter_1 = __importDefault(require("@asciidoctor/docbook-converter"));
class AsciidoctorProcessor {
    constructor() {
        this.processor = (0, core_1.default)();
        this.highlightjsBuiltInSyntaxHighlighter = this.processor.SyntaxHighlighter.for('highlight.js');
        docbook_converter_1.default.register();
    }
    static getInstance() {
        if (!AsciidoctorProcessor.instance) {
            AsciidoctorProcessor.instance = new AsciidoctorProcessor();
        }
        return AsciidoctorProcessor.instance;
    }
    activateMemoryLogger() {
        const memoryLogger = this.processor.MemoryLogger.create();
        this.processor.LoggerManager.setLogger(memoryLogger);
        return memoryLogger;
    }
    restoreBuiltInSyntaxHighlighter() {
        this.highlightjsBuiltInSyntaxHighlighter.$register_for('highlight.js', 'highlightjs');
    }
}
exports.AsciidoctorProcessor = AsciidoctorProcessor;
//# sourceMappingURL=asciidoctorProcessor.js.map