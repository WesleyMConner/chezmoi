"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mermaidJSProcessor = void 0;
function mermaidJSProcessor() {
    return function () {
        const self = this;
        self.onContext(['listing', 'literal']);
        self.process((parent, reader, attrs) => {
            const diagramText = reader.$read();
            return this.createPassBlock(parent, `<pre class='mermaid'>${diagramText}</pre>`, attrs);
        });
    };
}
exports.mermaidJSProcessor = mermaidJSProcessor;
//# sourceMappingURL=mermaid.js.map