"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsciidoctorIncludeItems = void 0;
const asciidoctorProcessor_1 = require("../asciidoctorProcessor");
class AsciidoctorIncludeItems {
    constructor() {
        const asciidoctorProcessor = asciidoctorProcessor_1.AsciidoctorProcessor.getInstance();
        this.findIncludeProcessorExtension = asciidoctorProcessor.processor.Extensions.createIncludeProcessor('FindIncludeProcessorExtension', {
            postConstruct: function () {
                this.includeItems = [];
                this.includeIndex = 0;
            },
            // @ts-ignore
            handles: function (_target) {
                return true;
            },
            process: function (doc, reader, target, attrs) {
                // We don't meaningfully process the includes, we just want to identify
                // their line number and path if they belong in the base document
                // @ts-ignore
                if (reader.path === '<stdin>') {
                    this.includeItems.push({
                        index: this.includeIndex,
                        name: target,
                        // @ts-ignore
                        position: reader.lineno - 1,
                        length: target.length,
                    });
                    this.includeIndex += 1;
                }
                return reader.pushInclude(['nothing'], target, target, 1, attrs);
            },
        }).$new();
    }
    activate(registry) {
        registry.includeProcessor(this.findIncludeProcessorExtension);
    }
    get() {
        return this.findIncludeProcessorExtension.includeItems;
    }
    reset() {
        this.findIncludeProcessorExtension.includeIndex = 0;
        this.findIncludeProcessorExtension.includeItems = [];
    }
}
exports.AsciidoctorIncludeItems = AsciidoctorIncludeItems;
//# sourceMappingURL=asciidoctorIncludeItems.js.map