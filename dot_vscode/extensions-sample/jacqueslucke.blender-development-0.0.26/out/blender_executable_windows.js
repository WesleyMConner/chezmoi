"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlenderWindows = getBlenderWindows;
const path = require("path");
const fs = require("fs");
const util = require("util");
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
async function getDirectories(path_) {
    let filesAndDirectories = await readdir(path_);
    let directories = [];
    await Promise.all(filesAndDirectories.map(async (name) => {
        const stats = await stat(path.join(path_, name));
        if (stats.isDirectory())
            directories.push(name);
    }));
    return directories;
}
// todo read from registry Blender installation path
const typicalWindowsBlenderFoundationPaths = [
    path.join(process.env.ProgramFiles || "C:\\Program Files", "Blender Foundation"),
    path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Blender Foundation"),
];
async function getBlenderWindows() {
    let blenders = [];
    let dirs_to_check = [];
    for (const typicalPath of typicalWindowsBlenderFoundationPaths) {
        const dirs = await getDirectories(typicalPath).catch((err) => []);
        dirs_to_check.push(...dirs.map((dir) => path.join(typicalPath, dir)));
    }
    const exe = "blender.exe";
    for (const p of dirs_to_check) {
        const executable = path.join(p, exe);
        const stats = await stat(executable).catch((err) => undefined);
        if (stats === undefined)
            continue;
        if (stats.isFile()) {
            blenders.push(executable);
        }
    }
    return blenders;
}
//# sourceMappingURL=blender_executable_windows.js.map