"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deduplicateSameHardLinks = deduplicateSameHardLinks;
const fs = require("fs");
const util = require("util");
const stat = util.promisify(fs.stat);
async function deduplicateSameHardLinks(blenderPathsToReduce, removeMissingFiles = true, additionalBlenderPaths = []) {
    let missingItem = -1;
    const additionalBlenderPathsInodes = new Set();
    for (const item of additionalBlenderPaths) {
        if (item.linuxInode === undefined) {
            const stats = await stat(item.path).catch((err) => undefined);
            if (stats === undefined) {
                continue;
            }
            item.linuxInode = stats.ino;
        }
        additionalBlenderPathsInodes.add(item.linuxInode);
    }
    const deduplicateHardLinks = new Map();
    for (const item of blenderPathsToReduce) {
        if (item.linuxInode === undefined) {
            // try to find missing information
            const stats = await stat(item.path).catch((err) => undefined);
            if (stats === undefined) {
                if (removeMissingFiles) {
                    deduplicateHardLinks.set(missingItem, item);
                    missingItem -= 1;
                }
                continue;
            }
            item.linuxInode = stats.ino;
        }
        if (deduplicateHardLinks.has(item.linuxInode))
            continue;
        if (additionalBlenderPathsInodes.has(item.linuxInode))
            continue;
        deduplicateHardLinks.set(item.linuxInode, item);
    }
    return Array.from(deduplicateHardLinks.values());
}
//# sourceMappingURL=blender_executable_linux.js.map