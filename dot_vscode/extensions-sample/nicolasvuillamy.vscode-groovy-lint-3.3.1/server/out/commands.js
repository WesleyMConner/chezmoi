"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commands = exports.COMMAND_LINT_FOLDER = exports.COMMAND_SHOW_RULE_DOCUMENTATION = exports.COMMAND_DISABLE_ERROR_FOR_PROJECT = exports.COMMAND_DISABLE_ERROR_FOR_FILE = exports.COMMAND_DISABLE_ERROR_FOR_LINE = exports.COMMAND_LINT_QUICKFIX_FILE = exports.COMMAND_LINT_QUICKFIX = exports.COMMAND_LINT_FIX = exports.COMMAND_LINT = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
// Create commands
exports.COMMAND_LINT = vscode_languageserver_1.Command.create('Analyze code', 'groovyLint.lint');
exports.COMMAND_LINT_FIX = vscode_languageserver_1.Command.create('Fix all auto-fixable problems', 'groovyLint.lintFix');
exports.COMMAND_LINT_QUICKFIX = vscode_languageserver_1.Command.create('Quick fix this line', 'groovyLint.quickFix');
exports.COMMAND_LINT_QUICKFIX_FILE = vscode_languageserver_1.Command.create('Quick fix rule in this entire file', 'groovyLint.quickFixFile');
exports.COMMAND_DISABLE_ERROR_FOR_LINE = vscode_languageserver_1.Command.create('Disable rule for this line', 'groovyLint.disableRule');
exports.COMMAND_DISABLE_ERROR_FOR_FILE = vscode_languageserver_1.Command.create('Disable rule for this entire file', 'groovyLint.disableRuleInFile');
exports.COMMAND_DISABLE_ERROR_FOR_PROJECT = vscode_languageserver_1.Command.create('Disable rule for this entire project', 'groovyLint.disableRuleInProject');
exports.COMMAND_SHOW_RULE_DOCUMENTATION = vscode_languageserver_1.Command.create('Show documentation for rule', 'groovyLint.showDocumentationForRule');
exports.COMMAND_LINT_FOLDER = vscode_languageserver_1.Command.create('Analyze groovy files in this folder', 'groovyLint.lintFolder');
exports.commands = [
    exports.COMMAND_LINT,
    exports.COMMAND_LINT_FIX,
    exports.COMMAND_LINT_QUICKFIX,
    exports.COMMAND_LINT_QUICKFIX_FILE,
    exports.COMMAND_DISABLE_ERROR_FOR_LINE,
    exports.COMMAND_DISABLE_ERROR_FOR_FILE,
    exports.COMMAND_DISABLE_ERROR_FOR_PROJECT,
    exports.COMMAND_SHOW_RULE_DOCUMENTATION,
    exports.COMMAND_LINT_FOLDER
];
//# sourceMappingURL=commands.js.map