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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsciidocEngine = void 0;
const vscode = __importStar(require("vscode"));
const asciidoctorWebViewConverter_1 = require("./asciidoctorWebViewConverter");
const security_1 = require("./security");
const previewConfig_1 = require("./features/previewConfig");
const antoraDocument_1 = require("./features/antora/antoraDocument");
const antoraContext_1 = require("./features/antora/antoraContext");
const asciidocTextDocument_1 = require("./asciidocTextDocument");
const asciidoctorProcessor_1 = require("./asciidoctorProcessor");
const asciidoctorAttributesConfig_1 = require("./features/asciidoctorAttributesConfig");
const includeProcessor_1 = require("./features/antora/includeProcessor");
const resolveIncludeFile_1 = require("./features/antora/resolveIncludeFile");
const highlightjsAdapter = require('./highlightjs-adapter');
const previewConfigurationManager = new previewConfig_1.AsciidocPreviewConfigurationManager();
class AsciidocEngine {
    constructor(contributionProvider, asciidoctorConfigProvider, asciidoctorExtensionsProvider, asciidoctorDiagnosticProvider) {
        this.contributionProvider = contributionProvider;
        this.asciidoctorConfigProvider = asciidoctorConfigProvider;
        this.asciidoctorExtensionsProvider = asciidoctorExtensionsProvider;
        this.asciidoctorDiagnosticProvider = asciidoctorDiagnosticProvider;
    }
    // Export
    async export(textDocument, backend, asciidoctorAttributes = {}) {
        this.asciidoctorDiagnosticProvider.delete(textDocument.uri);
        const asciidoctorProcessor = asciidoctorProcessor_1.AsciidoctorProcessor.getInstance();
        const memoryLogger = asciidoctorProcessor.activateMemoryLogger();
        const processor = asciidoctorProcessor.processor;
        const registry = processor.Extensions.create();
        await this.asciidoctorExtensionsProvider.activate(registry);
        const textDocumentUri = textDocument.uri;
        await this.asciidoctorConfigProvider.activate(registry, textDocumentUri);
        asciidoctorProcessor.restoreBuiltInSyntaxHighlighter();
        const baseDir = asciidocTextDocument_1.AsciidocTextDocument.fromTextDocument(textDocument).baseDir;
        const options = {
            attributes: {
                'env-vscode': '',
                env: 'vscode',
                ...asciidoctorAttributes,
            },
            backend,
            extension_registry: registry,
            header_footer: true,
            safe: 'unsafe',
            ...(baseDir && { base_dir: baseDir }),
        };
        const templateDirs = this.getTemplateDirs();
        if (templateDirs.length !== 0) {
            options.template_dirs = templateDirs;
        }
        const document = processor.load(textDocument.getText(), options);
        const output = document.convert(options);
        this.asciidoctorDiagnosticProvider.reportErrors(memoryLogger, textDocument);
        return {
            output,
            document,
        };
    }
    // Convert (preview)
    async convertFromUri(documentUri, context, editor, line) {
        const textDocument = await vscode.workspace.openTextDocument(documentUri);
        const { html, document, } = await this.convertFromTextDocument(textDocument, context, editor, line);
        return {
            html,
            document,
        };
    }
    async convertFromTextDocument(textDocument, context, editor, line) {
        this.asciidoctorDiagnosticProvider.delete(textDocument.uri);
        const asciidoctorProcessor = asciidoctorProcessor_1.AsciidoctorProcessor.getInstance();
        const memoryLogger = asciidoctorProcessor.activateMemoryLogger();
        const processor = asciidoctorProcessor.processor;
        // load the Asciidoc header only to get kroki-server-url attribute
        const text = textDocument.getText();
        const attributes = asciidoctorAttributesConfig_1.AsciidoctorAttributesConfig.getPreviewAttributes();
        const document = processor.load(text, {
            attributes,
            header_only: true,
        });
        const isRougeSourceHighlighterEnabled = document.isAttribute('source-highlighter', 'rouge');
        if (isRougeSourceHighlighterEnabled) {
            // Force the source highlighter to Highlight.js (since Rouge is not supported)
            document.setAttribute('source-highlighter', 'highlight.js');
        }
        const krokiServerUrl = document.getAttribute('kroki-server-url') || 'https://kroki.io';
        // Antora Resource Identifiers resolution
        const antoraDocumentContext = await (0, antoraDocument_1.getAntoraDocumentContext)(textDocument.uri, context.workspaceState);
        const cspArbiter = new security_1.ExtensionContentSecurityPolicyArbiter(context.globalState, context.workspaceState);
        const asciidoctorWebViewConverter = new asciidoctorWebViewConverter_1.AsciidoctorWebViewConverter(textDocument, editor, cspArbiter.getSecurityLevelForResource(textDocument.uri), cspArbiter.shouldDisableSecurityWarnings(), this.contributionProvider.contributions, previewConfigurationManager.loadAndCacheConfiguration(textDocument.uri), antoraDocumentContext, line, null, krokiServerUrl);
        processor.ConverterFactory.register(asciidoctorWebViewConverter, ['webview-html5']);
        const registry = processor.Extensions.create();
        await this.asciidoctorExtensionsProvider.activate(registry);
        const textDocumentUri = textDocument.uri;
        await this.asciidoctorConfigProvider.activate(registry, textDocumentUri);
        if (antoraDocumentContext !== undefined) {
            const antoraConfig = await (0, antoraDocument_1.getAntoraConfig)(textDocumentUri);
            registry.includeProcessor(includeProcessor_1.IncludeProcessor.$new((_, target, cursor) => (0, resolveIncludeFile_1.resolveIncludeFile)(target, {
                src: antoraDocumentContext.resourceContext,
            }, cursor, antoraDocumentContext.getContentCatalog(), antoraConfig)));
        }
        if (context && editor) {
            highlightjsAdapter.register(asciidoctorProcessor.highlightjsBuiltInSyntaxHighlighter, context, editor);
        }
        else {
            asciidoctorProcessor.restoreBuiltInSyntaxHighlighter();
        }
        const antoraSupport = antoraContext_1.AntoraSupportManager.getInstance(context.workspaceState);
        const antoraAttributes = await antoraSupport.getAttributes(textDocumentUri);
        const asciidocTextDocument = asciidocTextDocument_1.AsciidocTextDocument.fromTextDocument(textDocument);
        const baseDir = asciidocTextDocument.baseDir;
        const documentDirectory = asciidocTextDocument.dirName;
        const documentBasename = asciidocTextDocument.fileName;
        const documentExtensionName = asciidocTextDocument.extensionName;
        const documentFilePath = asciidocTextDocument.filePath;
        const templateDirs = this.getTemplateDirs();
        const options = {
            attributes: {
                ...attributes,
                ...antoraAttributes,
                // The following attributes are "intrinsic attributes" but they are not set when the input is a string
                // like we are doing, in that case it is expected that the attributes are set here for the API:
                // https://docs.asciidoctor.org/asciidoc/latest/attributes/document-attributes-ref/#intrinsic-attributes
                // this can be set since safe mode is 'UNSAFE'
                ...(documentDirectory && { docdir: documentDirectory }),
                ...(documentFilePath && { docfile: documentFilePath }),
                ...(documentBasename && { docname: documentBasename }),
                docfilesuffix: documentExtensionName,
                filetype: asciidoctorWebViewConverter.outfilesuffix.substring(1),
                '!data-uri': '', // disable data-uri since Asciidoctor.js is unable to read files from a VS Code workspace.
            },
            backend: 'webview-html5',
            extension_registry: registry,
            header_footer: true,
            safe: 'unsafe',
            sourcemap: true,
            ...(baseDir && { base_dir: baseDir }),
        };
        if (templateDirs.length !== 0) {
            options.template_dirs = templateDirs;
        }
        try {
            const document = processor.load(text, options);
            const blocksWithLineNumber = document.findBy(function (b) {
                return typeof b.getLineNumber() !== 'undefined';
            });
            blocksWithLineNumber.forEach(function (block) {
                block.addRole('data-line-' + block.getLineNumber());
            });
            const html = document.convert(options);
            this.asciidoctorDiagnosticProvider.reportErrors(memoryLogger, textDocument);
            return {
                html,
                document,
            };
        }
        catch (e) {
            vscode.window.showErrorMessage(e.toString());
            throw e;
        }
    }
    /**
     * Get user defined template directories from configuration.
     * @private
     */
    getTemplateDirs() {
        return vscode.workspace.getConfiguration('asciidoc.preview', null).get('templates', []);
    }
}
exports.AsciidocEngine = AsciidocEngine;
//# sourceMappingURL=asciidocEngine.js.map