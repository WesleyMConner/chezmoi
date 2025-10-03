"use strict";
/*---------------------------------------------------------------------------------------------
  *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
exports.getAsciidocExtensionContributions = exports.AsciidocContributions = void 0;
const vscode = __importStar(require("vscode"));
const arrays = __importStar(require("./util/arrays"));
const dispose_1 = require("./util/dispose");
const resolveExtensionResource = (extension, resourcePath) => {
    return vscode.Uri.joinPath(extension.extensionUri, resourcePath);
};
const resolveExtensionResources = (extension, resourcePaths) => {
    const result = [];
    if (Array.isArray(resourcePaths)) {
        for (const resource of resourcePaths) {
            try {
                result.push(resolveExtensionResource(extension, resource));
            }
            catch (e) {
                // noop
            }
        }
    }
    return result;
};
// eslint-disable-next-line no-redeclare
var AsciidocContributions;
(function (AsciidocContributions) {
    AsciidocContributions.Empty = {
        previewScripts: [],
        previewStyles: [],
        previewResourceRoots: [],
    };
    function merge(a, b) {
        return {
            previewScripts: [...a.previewScripts, ...b.previewScripts],
            previewStyles: [...a.previewStyles, ...b.previewStyles],
            previewResourceRoots: [...a.previewResourceRoots, ...b.previewResourceRoots],
        };
    }
    AsciidocContributions.merge = merge;
    function uriEqual(a, b) {
        return a.toString() === b.toString();
    }
    function equal(a, b) {
        return arrays.equals(a.previewScripts, b.previewScripts, uriEqual) &&
            arrays.equals(a.previewStyles, b.previewStyles, uriEqual) &&
            arrays.equals(a.previewResourceRoots, b.previewResourceRoots, uriEqual);
    }
    AsciidocContributions.equal = equal;
    function fromExtension(extension) {
        const contributions = extension.packageJSON && extension.packageJSON.contributes;
        if (!contributions) {
            return AsciidocContributions.Empty;
        }
        const previewStyles = getContributedStyles(contributions, extension);
        const previewScripts = getContributedScripts(contributions, extension);
        const previewResourceRoots = previewStyles.length || previewScripts.length ? [extension.extensionUri] : [];
        return {
            previewScripts,
            previewStyles,
            previewResourceRoots,
        };
    }
    AsciidocContributions.fromExtension = fromExtension;
    function getContributedScripts(contributes, extension) {
        return resolveExtensionResources(extension, contributes['asciidoc.previewScripts']);
    }
    function getContributedStyles(contributes, extension) {
        return resolveExtensionResources(extension, contributes['asciidoc.previewStyles']);
    }
})(AsciidocContributions = exports.AsciidocContributions || (exports.AsciidocContributions = {}));
class VSCodeExtensionAsciidocContributionProvider extends dispose_1.Disposable {
    constructor(_extensionContext) {
        super();
        this._extensionContext = _extensionContext;
        this._onContributionsChanged = this._register(new vscode.EventEmitter());
        this.onContributionsChanged = this._onContributionsChanged.event;
        vscode.extensions.onDidChange(() => {
            const currentContributions = this.getCurrentContributions();
            const existingContributions = this._contributions || AsciidocContributions.Empty;
            if (!AsciidocContributions.equal(existingContributions, currentContributions)) {
                this._contributions = currentContributions;
                this._onContributionsChanged.fire(this);
            }
        }, undefined, this._disposables);
    }
    get extensionUri() { return this._extensionContext.extensionUri; }
    get contributions() {
        if (!this._contributions) {
            this._contributions = this.getCurrentContributions();
        }
        return this._contributions;
    }
    getCurrentContributions() {
        return vscode.extensions.all
            .map(AsciidocContributions.fromExtension)
            .reduce(AsciidocContributions.merge, AsciidocContributions.Empty);
    }
}
function getAsciidocExtensionContributions(context) {
    return new VSCodeExtensionAsciidocContributionProvider(context);
}
exports.getAsciidocExtensionContributions = getAsciidocExtensionContributions;
//# sourceMappingURL=asciidocExtensions.js.map