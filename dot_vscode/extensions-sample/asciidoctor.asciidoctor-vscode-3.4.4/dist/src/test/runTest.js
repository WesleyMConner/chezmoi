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
const path = __importStar(require("path"));
const test_electron_1 = require("@vscode/test-electron");
async function main() {
    try {
        // from dist/src/test/index.js
        const projectRootPath = path.join(__dirname, '..', '..', '..');
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = projectRootPath;
        // The path to the extension test script
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.join(__dirname, 'suite', 'index');
        // The path to the extension test workspace directory
        const testsWorkspaceDirectoryPath = path.join(projectRootPath, 'test-workspace');
        const testOptions = {
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [testsWorkspaceDirectoryPath],
        };
        console.log('Run tests with options: ', testOptions);
        // Download VS Code, unzip it and run the integration test
        const exitCode = await (0, test_electron_1.runTests)(testOptions);
        console.log('Exit code: ', exitCode);
        process.exit(exitCode);
    }
    catch (err) {
        console.error('Failed to run tests');
        process.exit(1);
    }
}
main();
//# sourceMappingURL=runTest.js.map