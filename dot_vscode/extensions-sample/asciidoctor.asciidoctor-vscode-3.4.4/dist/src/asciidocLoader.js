"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsciidocIncludeItemsLoader = exports.AsciidocLoader = void 0;
const asciidocTextDocument_1 = require("./asciidocTextDocument");
const asciidoctorProcessor_1 = require("./asciidoctorProcessor");
const asciidoctorAttributesConfig_1 = require("./features/asciidoctorAttributesConfig");
const antoraDocument_1 = require("./features/antora/antoraDocument");
const includeProcessor_1 = require("./features/antora/includeProcessor");
const resolveIncludeFile_1 = require("./features/antora/resolveIncludeFile");
class AsciidocLoader {
    constructor(asciidoctorConfigProvider, asciidoctorExtensionsProvider, asciidoctorDiagnosticProvider, context) {
        this.asciidoctorConfigProvider = asciidoctorConfigProvider;
        this.asciidoctorExtensionsProvider = asciidoctorExtensionsProvider;
        this.asciidoctorDiagnosticProvider = asciidoctorDiagnosticProvider;
        this.context = context;
        this.processor = asciidoctorProcessor_1.AsciidoctorProcessor.getInstance().processor;
    }
    async load(textDocument) {
        const { memoryLogger, registry, } = await this.prepare(textDocument);
        const baseDir = asciidocTextDocument_1.AsciidocTextDocument.fromTextDocument(textDocument).baseDir;
        const attributes = asciidoctorAttributesConfig_1.AsciidoctorAttributesConfig.getPreviewAttributes();
        const doc = this.processor.load(textDocument.getText(), this.getOptions(attributes, registry, baseDir));
        this.asciidoctorDiagnosticProvider.reportErrors(memoryLogger, textDocument);
        return doc;
    }
    getOptions(attributes, registry, baseDir) {
        return {
            attributes,
            extension_registry: registry,
            sourcemap: true,
            safe: 'unsafe',
            parse: true,
            ...(baseDir && { base_dir: baseDir }),
        };
    }
    async prepare(textDocument) {
        const processor = this.processor;
        const memoryLogger = processor.MemoryLogger.create();
        processor.LoggerManager.setLogger(memoryLogger);
        const registry = processor.Extensions.create();
        await this.asciidoctorExtensionsProvider.activate(registry);
        const textDocumentUri = textDocument.uri;
        await this.asciidoctorConfigProvider.activate(registry, textDocumentUri);
        const antoraDocumentContext = await (0, antoraDocument_1.getAntoraDocumentContext)(textDocument.uri, this.context.workspaceState);
        if (antoraDocumentContext !== undefined) {
            const antoraConfig = await (0, antoraDocument_1.getAntoraConfig)(textDocumentUri);
            registry.includeProcessor(includeProcessor_1.IncludeProcessor.$new((_, target, cursor) => (0, resolveIncludeFile_1.resolveIncludeFile)(target, {
                src: antoraDocumentContext.resourceContext,
            }, cursor, antoraDocumentContext.getContentCatalog(), antoraConfig)));
        }
        this.asciidoctorDiagnosticProvider.delete(textDocumentUri);
        return {
            memoryLogger,
            registry,
        };
    }
}
exports.AsciidocLoader = AsciidocLoader;
class AsciidocIncludeItemsLoader extends AsciidocLoader {
    constructor(asciidoctorIncludeItemsProvider, asciidoctorConfigProvider, asciidoctorExtensionsProvider, asciidoctorDiagnosticProvider, context) {
        super(asciidoctorConfigProvider, asciidoctorExtensionsProvider, asciidoctorDiagnosticProvider, context);
        this.asciidoctorIncludeItemsProvider = asciidoctorIncludeItemsProvider;
        this.asciidoctorConfigProvider = asciidoctorConfigProvider;
        this.asciidoctorExtensionsProvider = asciidoctorExtensionsProvider;
        this.asciidoctorDiagnosticProvider = asciidoctorDiagnosticProvider;
        this.context = context;
    }
    async getIncludeItems(textDocument) {
        const { memoryLogger, registry, } = await this.prepare(textDocument);
        this.asciidoctorIncludeItemsProvider.activate(registry);
        const baseDir = asciidocTextDocument_1.AsciidocTextDocument.fromTextDocument(textDocument).baseDir;
        const attributes = asciidoctorAttributesConfig_1.AsciidoctorAttributesConfig.getPreviewAttributes();
        this.asciidoctorIncludeItemsProvider.reset();
        this.processor.load(textDocument.getText(), this.getOptions(attributes, registry, baseDir));
        this.asciidoctorDiagnosticProvider.reportErrors(memoryLogger, textDocument);
        return this.asciidoctorIncludeItemsProvider.get();
    }
}
exports.AsciidocIncludeItemsLoader = AsciidocIncludeItemsLoader;
//# sourceMappingURL=asciidocLoader.js.map