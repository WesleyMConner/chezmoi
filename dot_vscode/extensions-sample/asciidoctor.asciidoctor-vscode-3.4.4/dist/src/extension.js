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
exports.activate = void 0;
// This must be the first import in the main entry file
require("./i18n");
const vscode = __importStar(require("vscode"));
const commandManager_1 = require("./commandManager");
const commands = __importStar(require("./commands/index"));
const documentLinkProvider_1 = __importDefault(require("./features/documentLinkProvider"));
const documentSymbolProvider_1 = __importDefault(require("./features/documentSymbolProvider"));
const previewContentProvider_1 = require("./features/previewContentProvider");
const previewManager_1 = require("./features/previewManager");
const workspaceSymbolProvider_1 = __importDefault(require("./features/workspaceSymbolProvider"));
const logger_1 = require("./logger");
const asciidocExtensions_1 = require("./asciidocExtensions");
const security_1 = require("./security");
const includeAutoCompletion_1 = require("./util/includeAutoCompletion");
const attributeReferenceProvider_1 = require("./features/attributeReferenceProvider");
const builtinDocumentAttributeProvider_1 = require("./features/builtinDocumentAttributeProvider");
const foldingProvider_1 = __importDefault(require("./features/foldingProvider"));
const antoraContext_1 = require("./features/antora/antoraContext");
const dropIntoEditor_1 = require("./features/dropIntoEditor");
const asciidoctorConfig_1 = require("./features/asciidoctorConfig");
const asciidoctorExtensions_1 = require("./features/asciidoctorExtensions");
const asciidoctorDiagnostic_1 = require("./features/asciidoctorDiagnostic");
const asciidocEngine_1 = require("./asciidocEngine");
const asciidocLoader_1 = require("./asciidocLoader");
const asciidoctorIncludeItems_1 = require("./features/asciidoctorIncludeItems");
const antoraSupport_1 = require("./commands/antoraSupport");
async function activate(context) {
    // Set context as a global as some tests depend on it
    global.testExtensionContext = context;
    const contributionProvider = (0, asciidocExtensions_1.getAsciidocExtensionContributions)(context);
    const asciidoctorExtensionsSecurityPolicy = security_1.AsciidoctorExtensionsSecurityPolicyArbiter.activate(context);
    const extensionContentSecurityPolicy = new security_1.ExtensionContentSecurityPolicyArbiter(context.globalState, context.workspaceState);
    const asciidoctorExtensionsTrustModeSelector = new security_1.AsciidoctorExtensionsTrustModeSelector();
    const asciidocEngineDiagnostic = new asciidoctorDiagnostic_1.AsciidoctorDiagnostic('asciidoc-engine');
    const asciidocEngine = new asciidocEngine_1.AsciidocEngine(contributionProvider, new asciidoctorConfig_1.AsciidoctorConfig(), new asciidoctorExtensions_1.AsciidoctorExtensions(asciidoctorExtensionsSecurityPolicy), asciidocEngineDiagnostic);
    const asciidocLoaderDiagnostic = new asciidoctorDiagnostic_1.AsciidoctorDiagnostic('asciidoc-loader');
    const asciidocLoader = new asciidocLoader_1.AsciidocLoader(new asciidoctorConfig_1.AsciidoctorConfig(), new asciidoctorExtensions_1.AsciidoctorExtensions(asciidoctorExtensionsSecurityPolicy), asciidocLoaderDiagnostic, context);
    const asciidocIncludeDiagnostic = new asciidoctorDiagnostic_1.AsciidoctorDiagnostic('asciidoc-include');
    const asciidocIncludeItemsLoader = new asciidocLoader_1.AsciidocIncludeItemsLoader(new asciidoctorIncludeItems_1.AsciidoctorIncludeItems(), new asciidoctorConfig_1.AsciidoctorConfig(), new asciidoctorExtensions_1.AsciidoctorExtensions(asciidoctorExtensionsSecurityPolicy), asciidocIncludeDiagnostic, context);
    const logger = new logger_1.Logger();
    logger.log('Extension was started');
    const selector = [
        {
            language: 'asciidoc',
            scheme: 'file',
        },
        {
            language: 'asciidoc',
            scheme: 'untitled',
        },
    ];
    const contentProvider = new previewContentProvider_1.AsciidocContentProvider(asciidocEngine, context);
    const symbolProvider = new documentSymbolProvider_1.default(null, asciidocLoader);
    const previewManager = new previewManager_1.AsciidocPreviewManager(contentProvider, logger, contributionProvider);
    context.subscriptions.push(previewManager);
    context.subscriptions.push(new includeAutoCompletion_1.AsciidocTargetPathAutoCompletionMonitor(asciidocLoader));
    context.subscriptions.push(antoraContext_1.AntoraSupportManager.getInstance(context.workspaceState));
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(selector, symbolProvider));
    context.subscriptions.push(vscode.languages.registerDocumentLinkProvider(selector, new documentLinkProvider_1.default(asciidocIncludeItemsLoader)));
    context.subscriptions.push(vscode.languages.registerWorkspaceSymbolProvider(new workspaceSymbolProvider_1.default(symbolProvider)));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(selector, new attributeReferenceProvider_1.AttributeReferenceProvider(asciidocLoader), '{'));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(selector, new builtinDocumentAttributeProvider_1.BuiltinDocumentAttributeProvider(), ':'));
    context.subscriptions.push(vscode.languages.registerFoldingRangeProvider(selector, new foldingProvider_1.default(asciidocLoader)));
    context.subscriptions.push(vscode.languages.registerDocumentDropEditProvider(selector, new dropIntoEditor_1.DropImageIntoEditorProvider(asciidocLoader)));
    const previewSecuritySelector = new security_1.PreviewSecuritySelector(extensionContentSecurityPolicy, previewManager);
    const commandManager = new commandManager_1.CommandManager();
    context.subscriptions.push(commandManager);
    commandManager.register(new commands.ShowPreviewCommand(previewManager));
    commandManager.register(new commands.ShowPreviewToSideCommand(previewManager));
    commandManager.register(new commands.ShowLockedPreviewToSideCommand(previewManager));
    commandManager.register(new commands.ShowSourceCommand(previewManager));
    commandManager.register(new commands.RefreshPreviewCommand(previewManager));
    commandManager.register(new commands.MoveCursorToPositionCommand());
    commandManager.register(new commands.ShowPreviewSecuritySelectorCommand(previewSecuritySelector, previewManager));
    commandManager.register(new commands.ShowAsciidoctorExtensionsTrustModeSelectorCommand(asciidoctorExtensionsTrustModeSelector));
    commandManager.register(new commands.OpenDocumentLinkCommand(asciidocLoader));
    commandManager.register(new commands.ExportAsPDF(asciidocEngine, context));
    commandManager.register(new commands.PasteImage(asciidocLoader));
    commandManager.register(new commands.ToggleLockCommand(previewManager));
    commandManager.register(new commands.ShowPreviewCommand(previewManager));
    commandManager.register(new commands.SaveHTML(asciidocEngine));
    commandManager.register(new commands.SaveDocbook(asciidocEngine));
    commandManager.register(new commands.EnableAntoraSupport(context.workspaceState, previewManager));
    commandManager.register(new commands.DisableAntoraSupport(context.workspaceState, previewManager));
    const antoraSupportSetting = context.workspaceState.get('antoraSupportSetting');
    if (antoraSupportSetting === true || antoraSupportSetting === false) {
        await vscode.commands.executeCommand('setContext', antoraSupport_1.antoraSupportEnabledContextKey, antoraSupportSetting);
        previewManager.refresh(true);
    }
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('asciidoc.registerAsciidoctorExtensions')) {
            if (vscode.workspace.getConfiguration('asciidoc', null).get('registerAsciidoctorExtensions') === false) {
                // reset
                await context.workspaceState.update(asciidoctorExtensionsSecurityPolicy.trustAsciidoctorExtensionsAuthorsKey, undefined);
            }
        }
        logger.updateConfiguration();
        previewManager.updateConfiguration();
    }));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
        asciidocEngineDiagnostic.clearAll();
        asciidocLoaderDiagnostic.clearAll();
        asciidocIncludeDiagnostic.clearAll();
    }));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((e) => {
        // when the workspace configuration is updated, the file .vscode/settings.json since we are also listening onDidChangeConfiguration we can safely ignore this event
        if (!e.uri.path.endsWith('.vscode/settings.json')) {
            previewManager.refresh(true);
        }
    }));
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map