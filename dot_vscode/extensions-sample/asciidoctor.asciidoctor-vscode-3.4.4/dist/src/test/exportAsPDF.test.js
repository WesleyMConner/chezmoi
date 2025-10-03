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
const assert = __importStar(require("assert"));
require("mocha");
const vscode = __importStar(require("vscode"));
const exportAsPDF_1 = require("../commands/exportAsPDF");
const asciidoctor = require('@asciidoctor/core');
const processor = asciidoctor();
suite('asciidoc.exportAsPDF', async () => {
    test('Should create an HTML cover page without title page logo', async () => {
        const document = processor.load(`= The Intrepid Chronicles
Kismet R. Lee <kismet@asciidoctor.org>`);
        const coverHtmlContent = (0, exportAsPDF_1._generateCoverHtmlContent)(undefined, __dirname, document, vscode.Uri.parse(''));
        assert.strictEqual(coverHtmlContent, `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <link rel="stylesheet" type="text/css" href="file:///media/all-centered.css">
  </head>
  <body>
  <div class="outer">
    <div class="middle">
      <div class="inner">

        <h1>The Intrepid Chronicles</h1>
        p>Kismet R. Lee &lt;kismet@asciidoctor.org&gt;</p>
      </div>
    </div>
  </div>
  </body>
  </html>`);
    });
});
//# sourceMappingURL=exportAsPDF.test.js.map