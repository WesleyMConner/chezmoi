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
exports._generateCoverHtmlContent = exports.ExportAsPDF = void 0;
const vscode = __importStar(require("vscode"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const uuid_1 = require("uuid");
const asciidocTextDocument_1 = require("../asciidocTextDocument");
const asciidoctorConfig_1 = require("../features/asciidoctorConfig");
const workspace_1 = require("../util/workspace");
class ExportAsPDF {
    constructor(engine, context) {
        this.engine = engine;
        this.context = context;
        this.id = 'asciidoc.exportAsPDF';
        this.exportAsPdfStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    }
    async execute() {
        const editor = vscode.window.activeTextEditor;
        if (editor === null || editor === undefined) {
            return;
        }
        const doc = editor.document;
        const workspaceFolder = (0, workspace_1.getWorkspaceFolder)(doc.uri);
        if (workspaceFolder === undefined) {
            await vscode.window.showWarningMessage('Unable to get the workspace folder, aborting.');
            return;
        }
        const asciidocTextDocument = asciidocTextDocument_1.AsciidocTextDocument.fromTextDocument(doc);
        const baseDirectory = asciidocTextDocument.baseDir;
        const pdfFilename = vscode.Uri.file(path.join(baseDirectory, asciidocTextDocument.fileName + '.pdf'));
        const asciidocPdfConfig = vscode.workspace.getConfiguration('asciidoc.pdf');
        const pdfOutputUri = await vscode.window.showSaveDialog({ defaultUri: pdfFilename });
        if (!pdfOutputUri) {
            console.log('No output directory selected to save the PDF, aborting.');
            return;
        }
        const pdfOutputPath = pdfOutputUri.fsPath;
        const asciidoctorConfigContent = await (0, asciidoctorConfig_1.getAsciidoctorConfigContent)(doc.uri);
        let text = doc.getText();
        if (asciidoctorConfigContent !== undefined) {
            text = `${asciidoctorConfigContent}
${text}`;
        }
        const workspacePath = workspaceFolder.uri.fsPath;
        const pdfEngine = asciidocPdfConfig.get('engine');
        if (pdfEngine === 'asciidoctor-pdf') {
            const asciidoctorPdfCommand = await this.resolveAsciidoctorPdfCommand(asciidocPdfConfig, workspacePath);
            if (asciidoctorPdfCommand === undefined) {
                return;
            }
            const asciidoctorPdfCommandArgs = asciidocPdfConfig.get('asciidoctorPdfCommandArgs', []);
            const defaultArgs = [
                '-q',
                '-B',
                `"${baseDirectory.replace('"', '\\"')}"`,
                '-o',
                `"${pdfOutputPath.replace('"', '\\"')}"`,
                '-a',
                'allow-uri-read',
            ];
            const args = defaultArgs.concat(asciidoctorPdfCommandArgs)
                .concat(['-']); // read from stdin
            try {
                this.exportAsPdfStatusBarItem.name = 'Export As PDF';
                this.exportAsPdfStatusBarItem.text = '$(loading~spin) Generating a PDF using asciidoctor-pdf...';
                this.exportAsPdfStatusBarItem.show();
                await execute(asciidoctorPdfCommand.command, args, text, { shell: true, cwd: asciidoctorPdfCommand.cwd });
                this.exportAsPdfStatusBarItem.text = '$(pass) PDF has been successfully generated!';
                offerOpen(pdfOutputPath);
            }
            catch (err) {
                console.error('Unable to generate a PDF using asciidoctor-pdf: ', err);
                await vscode.window.showErrorMessage(`Unable to generate a PDF using asciidoctor-pdf: ${err}`);
            }
            finally {
                this.exportAsPdfStatusBarItem.hide();
            }
        }
        else if (pdfEngine === 'wkhtmltopdf') {
            let wkhtmltopdfCommandPath = asciidocPdfConfig.get('wkhtmltopdfCommandPath', '');
            if (wkhtmltopdfCommandPath === '') {
                wkhtmltopdfCommandPath = `wkhtmltopdf${process.platform === 'win32' ? '.exe' : ''}`;
            }
            else {
                /* eslint-disable-next-line no-template-curly-in-string */
                wkhtmltopdfCommandPath = wkhtmltopdfCommandPath.replace('${workspaceFolder}', workspacePath);
            }
            try {
                await commandExists(wkhtmltopdfCommandPath, { shell: true, cwd: workspacePath });
            }
            catch (error) {
                // command does not exist!
                console.error(error);
                const answer = await vscode.window.showInformationMessage('This feature requires wkhtmltopdf. Please download the latest version from https://wkhtmltopdf.org/downloads.html. If wkhtmltopdf is not available on your path, you can configure the path to wkhtmltopdf executable from the extension settings.', 'Download');
                if (answer === 'Download') {
                    vscode.env.openExternal(vscode.Uri.parse('https://wkhtmltopdf.org/downloads.html'));
                }
                return;
            }
            const wkhtmltopdfCommandArgs = asciidocPdfConfig.get('wkhtmltopdfCommandArgs', []);
            const defaultArgs = ['--enable-local-file-access', '--encoding', ' utf-8', '--javascript-delay', '1000'];
            const { output: html, document } = await this.engine.export(doc, 'html5', { 'data-uri@': '' });
            const footerCenter = document?.getAttribute('footer-center');
            if (footerCenter) {
                defaultArgs.push('--footer-center', footerCenter);
            }
            const objectArgs = [];
            const showTitlePage = document?.isAttribute('showTitlePage'); // incorrect type definition in Asciidoctor.js
            const titlePageLogo = document?.getAttribute('titlePageLogo');
            const coverFilePath = showTitlePage ? createCoverFile(titlePageLogo, baseDirectory, document) : undefined;
            if (coverFilePath) {
                objectArgs.push('cover', coverFilePath);
            }
            // wkhtmltopdf [GLOBAL OPTION]... [OBJECT]... <output file>
            const args = defaultArgs.concat(wkhtmltopdfCommandArgs)
                .concat(objectArgs)
                .concat(['-', pdfOutputPath]); // read from stdin and outputfile
            try {
                this.exportAsPdfStatusBarItem.name = 'Export As PDF';
                this.exportAsPdfStatusBarItem.text = '$(loading~spin) Generating a PDF using wkhtmltopdf...';
                this.exportAsPdfStatusBarItem.show();
                await execute(wkhtmltopdfCommandPath, args, html, { shell: true, cwd: workspacePath, stdio: ['pipe', 'ignore', 'pipe'] });
                this.exportAsPdfStatusBarItem.text = '$(pass) PDF has been successfully generated!';
                offerOpen(pdfOutputPath);
            }
            catch (err) {
                console.error('Unable to generate a PDF using wkhtmltopdf: ', err);
                await vscode.window.showErrorMessage(`Unable to generate a PDF using wkhtmltopdf: ${err}`);
            }
            finally {
                this.exportAsPdfStatusBarItem.hide();
                if (coverFilePath) {
                    // remove temporary file
                    fs.unlinkSync(coverFilePath);
                }
            }
        }
    }
    async resolveAsciidoctorPdfCommand(asciidocPdfConfig, workspacePath) {
        let asciidoctorPdfCommandPath = asciidocPdfConfig.get('asciidoctorPdfCommandPath', '');
        if (asciidoctorPdfCommandPath !== '') {
            /* eslint-disable-next-line no-template-curly-in-string */
            asciidoctorPdfCommandPath = asciidoctorPdfCommandPath.replace('${workspaceFolder}', workspacePath);
            // use the command specified
            return {
                cwd: workspacePath,
                command: asciidoctorPdfCommandPath,
            };
        }
        if (await this.isAsciidoctorPdfAvailable(workspacePath)) {
            // `asciidoctor-pdf` is available
            return {
                cwd: workspacePath,
                command: 'asciidoctor-pdf',
            };
        }
        if (await this.isBundlerAvailable()) {
            const globalStorageUri = this.context.globalStorageUri;
            const installDirectory = path.join(globalStorageUri.fsPath, 'asciidoctor-pdf-install');
            try {
                await commandExists('bundle exec asciidoctor-pdf', { shell: true, cwd: installDirectory });
                return {
                    cwd: installDirectory,
                    command: 'bundle exec asciidoctor-pdf',
                };
            }
            catch (bundleExecError) {
                console.info(`Error while trying to execute 'bundle exec asciidoctor-pdf' from '${installDirectory}', cause: `, bundleExecError);
                // `asciidoctor-pdf` is not available in global storage, offer to automatically install it
                const answer = await vscode.window.showInformationMessage('This feature requires asciidoctor-pdf. Do you want to install the latest version locally using Bundler? Alternatively, you can configure the path to the asciidoctor-pdf executable from the extension settings.', 'Install locally');
                if (answer === 'Install locally') {
                    this.exportAsPdfStatusBarItem.name = 'Asciidoctor PDF Installer';
                    this.exportAsPdfStatusBarItem.text = '$(loading~spin) Installing Asciidoctor PDF...';
                    this.exportAsPdfStatusBarItem.show();
                    try {
                        if (!fs.existsSync(installDirectory)) {
                            fs.mkdirSync(installDirectory, { recursive: true });
                        }
                        const gemfile = path.join(installDirectory, 'Gemfile');
                        await execute('bundle', ['config', '--local', 'path', '.bundle/gem'], undefined, { cwd: installDirectory });
                        fs.writeFileSync(gemfile, `source 'https://rubygems.org'

gem 'asciidoctor-pdf'`, { encoding: 'utf8' });
                        await execute('bundle', ['install'], undefined, { cwd: installDirectory });
                        this.exportAsPdfStatusBarItem.text = '$(pass) Asciidoctor PDF installed!';
                        const answer = await vscode.window.showInformationMessage(`Successfully installed Asciidoctor PDF in ${installDirectory}`, 'Continue');
                        if (answer === 'Continue') {
                            return {
                                command: 'bundle exec asciidoctor-pdf',
                                cwd: installDirectory,
                            };
                        }
                        else {
                            return undefined;
                        }
                    }
                    catch (err) {
                        await vscode.window.showErrorMessage(`Unable to install the latest version of asciidoctor-pdf using Bundler: ${err}`);
                        return undefined;
                    }
                    finally {
                        this.exportAsPdfStatusBarItem.hide();
                    }
                }
                else {
                    return undefined;
                }
            }
        }
        else {
            const answer = await vscode.window.showInformationMessage('This feature requires asciidoctor-pdf but the executable was not found on your PATH. Please install asciidoctor-pdf or configure the path to the executable from the extension settings.', 'Install', 'Configure');
            if (answer === 'Configure') {
                await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:asciidoctor.asciidoctor-vscode asciidoctorPdfCommand');
            }
            else if (answer === 'Install') {
                await vscode.env.openExternal(vscode.Uri.parse('https://docs.asciidoctor.org/pdf-converter/latest/install/'));
            }
            return undefined;
        }
    }
    async isBundlerAvailable() {
        try {
            await commandExists('bundle', { shell: true });
            return true;
        }
        catch (err) {
            // unable to find `bundle`, Bundler is probably not installed
            return false;
        }
    }
    async isAsciidoctorPdfAvailable(cwd) {
        try {
            await commandExists('asciidoctor-pdf', { shell: true, cwd });
            return true;
        }
        catch (err) {
            // command does not exist
            console.warn(err);
            return false;
        }
    }
}
exports.ExportAsPDF = ExportAsPDF;
function commandExists(command, options) {
    const childProcess = (0, child_process_1.spawn)(command, ['--version'], { env: process.env, ...options });
    return new Promise(function (resolve, reject) {
        const stdoutOutput = [];
        childProcess.stdout.on('data', (data) => {
            stdoutOutput.push(data);
        });
        childProcess.on('close', function (code) {
            if (code === 0) {
                resolve({
                    stdout: stdoutOutput.join('\n'),
                    code,
                });
            }
            else {
                reject(new Error(`command failed: ${command}`));
            }
        });
        childProcess.on('error', function (err) {
            reject(err);
        });
    });
}
function execute(command, args, input, options) {
    return new Promise(function (resolve, reject) {
        const childProcess = (0, child_process_1.spawn)(command, args, { env: process.env, ...options });
        const stderrOutput = [];
        childProcess.stderr.on('data', (data) => {
            stderrOutput.push(data);
        });
        childProcess.on('close', function (code) {
            if (code === 0) {
                resolve(true);
            }
            else {
                reject(new Error(`command failed: ${command} ${args.join(' ')}\n${stderrOutput.join('\n')}`));
            }
        });
        childProcess.on('error', function (err) {
            reject(err);
        });
        if (input !== undefined) {
            childProcess.stdin.write(input);
            childProcess.stdin.end();
        }
    });
}
function _generateCoverHtmlContent(titlePageLogo, baseDir, document, extensionUri) {
    let imageHTML = '';
    if (titlePageLogo) {
        const imageURL = titlePageLogo.startsWith('http') ? titlePageLogo : path.join(baseDir, titlePageLogo);
        imageHTML = `<img src="${imageURL}">`;
    }
    const styleHref = vscode.Uri.joinPath(extensionUri, 'media', 'all-centered.css');
    const doctitle = document?.getAttribute('doctitle', '');
    const author = document?.getAttribute('author', '');
    const email = document?.getAttribute('email', '');
    return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <link rel="stylesheet" type="text/css" href="${styleHref}">
  </head>
  <body>
  <div class="outer">
    <div class="middle">
      <div class="inner">
${imageHTML}
        <h1>${doctitle}</h1>
        p>${author} &lt;${email}&gt;</p>
      </div>
    </div>
  </div>
  </body>
  </html>`;
}
exports._generateCoverHtmlContent = _generateCoverHtmlContent;
function createCoverFile(titlePageLogo, baseDir, document) {
    const extensionContext = vscode.extensions.getExtension('asciidoctor.asciidoctor-vscode');
    const coverHtmlContent = _generateCoverHtmlContent(titlePageLogo, baseDir, document, extensionContext.extensionUri);
    const tmpFilePath = path.join(os.tmpdir(), (0, uuid_1.uuidv4)() + '.html');
    fs.writeFileSync(tmpFilePath, coverHtmlContent, 'utf-8');
    return tmpFilePath;
}
function offerOpen(destination) {
    // Saving the JSON that represents the document to a temporary JSON-file.
    vscode.window.showInformationMessage(('Successfully converted to ' + path.basename(destination)), 'Open File').then((label) => {
        if (label === 'Open File') {
            switch (process.platform) {
                // Use backticks for unix systems to run the open command directly
                // This avoids having to wrap the command AND path in quotes which
                // breaks if there is a single quote (') in the path
                case 'win32':
                    (0, child_process_1.exec)(`"${destination.replace('"', '\\"')}"`);
                    break;
                case 'darwin':
                    (0, child_process_1.exec)(`\`open "${destination.replace('"', '\\"')}" ; exit\``);
                    break;
                case 'linux':
                    (0, child_process_1.exec)(`\`xdg-open "${destination.replace('"', '\\"')}" ; exit\``);
                    break;
                default:
                    vscode.window.showWarningMessage('Output type is not supported');
                    break;
            }
        }
    });
}
//# sourceMappingURL=exportAsPDF.js.map