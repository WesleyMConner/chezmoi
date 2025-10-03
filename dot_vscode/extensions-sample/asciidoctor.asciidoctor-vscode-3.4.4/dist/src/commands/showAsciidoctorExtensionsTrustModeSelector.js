"use strict";
/*---------------------------------------------------------------------------------------------
  *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShowAsciidoctorExtensionsTrustModeSelectorCommand = void 0;
class ShowAsciidoctorExtensionsTrustModeSelectorCommand {
    constructor(asciidocExtensionScriptsSecuritySelector) {
        this.asciidocExtensionScriptsSecuritySelector = asciidocExtensionScriptsSecuritySelector;
        this.id = 'asciidoc.showAsciidoctorExtensionsTrustModeSelector';
        this.asciidocExtensionScriptsSecuritySelector = asciidocExtensionScriptsSecuritySelector;
    }
    execute() {
        this.asciidocExtensionScriptsSecuritySelector.showSelector();
    }
}
exports.ShowAsciidoctorExtensionsTrustModeSelectorCommand = ShowAsciidoctorExtensionsTrustModeSelectorCommand;
//# sourceMappingURL=showAsciidoctorExtensionsTrustModeSelector.js.map