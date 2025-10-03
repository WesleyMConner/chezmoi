"use strict";
/* --------------------
 * Copyright(C) Matthias Behr, 2020 - 2021.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterPcap = filterPcap;
exports.extractDlt = extractDlt;
exports.removeTecmp = removeTecmp;
const vscode = require("vscode");
const fs = require("fs");
const tshark = require("./tshark");
const quickPick_1 = require("./quickPick");
const path = require("path");
const dltFileWriter_1 = require("./dltFileWriter");
const platformWin32 = process.platform === "win32";
const separator = platformWin32 ? '"' : "'"; // win cmd uses ", unix sh uses '
async function filterPcap(uris) {
    const confSteps = vscode.workspace.getConfiguration().get('vsc-webshark.filterSteps');
    console.log(`filterPcap(${uris.map(v => v.toString()).join(',')}) with ${confSteps?.length} steps...`);
    if (confSteps === undefined || confSteps.length === 0) {
        vscode.window.showErrorMessage('please check your vsc-webshark.filterSteps configuration! None defined.', { modal: true });
        return;
    }
    const steps = [...confSteps];
    const execFunction = function (steps, saveUri) {
        let tsharkArgs = getTSharkArgs(steps);
        if (tsharkArgs.length) {
            vscode.window.withProgress({ cancellable: true, location: vscode.ProgressLocation.Notification, title: `filtering file to ${saveUri.toString()}` }, async (progress, cancelToken) => {
                // run tshark:
                let receivedData = [];
                const tp = new tshark.TSharkProcess(tsharkArgs, (data) => {
                    receivedData.push(data);
                }, uris.map(v => v.fsPath), saveUri.fsPath);
                let wasCancelled = false;
                cancelToken.onCancellationRequested(() => {
                    console.log(`filtering cancelled.`);
                    wasCancelled = true;
                    tp.dispose();
                });
                progress.report({ message: `Applying ${tsharkArgs.length} filter...` });
                let interval = setInterval(() => {
                    var stats = fs.statSync(saveUri.fsPath);
                    const fileSize = stats["size"] / (1000 * 1000);
                    progress.report({ message: `Applying ${tsharkArgs.length} filter... generated ${Math.round(fileSize)}MB` });
                }, 1000); // todo could add number of seconds running as well
                await tp.done().then((res) => {
                    if (res === 0) {
                        vscode.window.showInformationMessage(`successfully filtered file '${saveUri.toString()}'`);
                        const receivedStrs = receivedData.join('').split('\n');
                        console.log(`done receivedStrs=${receivedStrs.length}`);
                        for (let i = 0; i < receivedStrs.length; ++i) {
                            const line = receivedStrs[i];
                            console.log(line);
                        }
                    }
                    else {
                        if (!wasCancelled) {
                            vscode.window.showErrorMessage(`filtering file failed with res=${res}`, { modal: true });
                        }
                    }
                }).catch((err) => {
                    console.log(`got err:${err}`);
                    vscode.window.showErrorMessage(`filtering file failed with err=${err}`, { modal: true });
                });
                clearInterval(interval);
            });
        }
    };
    return execFilterPcap(uris, '_filtered.pcap', steps, execFunction);
}
async function extractDlt(uris) {
    const confMethods = vscode.workspace.getConfiguration().get('vsc-webshark.extractDltMethods');
    if (confMethods === undefined || !Array.isArray(confMethods) || confMethods.length === 0) {
        vscode.window.showErrorMessage('please check your vsc-webshark.exportDltMethods configuration! None defined.', { modal: true });
        return;
    }
    if (confMethods.length > 1) {
        // show quickPick: todo
        const quickPick = quickPick_1.QuickInputHelper.createQuickPick("select DLT extract method:", undefined, undefined);
        quickPick.canSelectMany = false;
        quickPick.ignoreFocusOut = false;
        const items = confMethods.map((cm) => { const pi = new quickPick_1.PickItem(); pi.name = cm.name; pi.data = cm; return pi; });
        quickPick.items = items;
        await quickPick_1.QuickInputHelper.show(quickPick).then((value) => {
            if (Array.isArray(value) && value.length === 1) {
                quickPick.dispose();
                return extractDltMethod(uris, value[0].data);
            }
            else {
                console.warn(`can't handle selected method:`, value);
            }
        }, () => {
            console.log(`aborted selection of method`);
        });
    }
    else {
        return extractDltMethod(uris, confMethods[0]);
    }
}
async function extractDltMethod(uris, confMethod) {
    const confSteps = typeof confMethod.steps === 'string' ? vscode.workspace.getConfiguration().get(confMethod.steps) : confMethod.steps;
    const extractArgs = typeof confMethod.tSharkArgs === 'string' ? vscode.workspace.getConfiguration().get(confMethod.tSharkArgs) : confMethod.tSharkArgs;
    console.log(`extractDlt(${uris.map(v => v.toString()).join(',')}) with method:'${confMethod.name}' ${confSteps?.length} steps...`);
    if (extractArgs === undefined || extractArgs.length === 0) {
        vscode.window.showErrorMessage('please check your vsc-webshark.exportDltArgs/.extractDltMethods.tSharkArgs configuration! None defined.', { modal: true });
        return;
    }
    const steps = Array.isArray(confSteps) ? [...confSteps] : [];
    return execFilterPcap(uris, '_extracted.dlt', steps, (steps, saveUri) => {
        let tsharkArgs = getTSharkArgs(steps);
        // we add the specific args here:
        tsharkArgs.push(extractArgs);
        if (tsharkArgs.length) {
            vscode.window.withProgress({ cancellable: true, location: vscode.ProgressLocation.Notification, title: `extracting DLT to ${saveUri.toString()}` }, async (progress, cancelToken) => {
                let nrMsgs = 0;
                // create the file writer:
                const dltFileWriter = new dltFileWriter_1.DltFileWriter('pcap', saveUri.fsPath);
                // run tshark:
                const tp = new tshark.TSharkDataProvider(tsharkArgs, uris.map(v => v.fsPath));
                const [payLoadInByteModulus, payloadInByteSize] = confMethod?.options?.payloadInByte || [0, 1];
                const processRawPayload = (lines) => {
                    // console.log(`processRawPayload.onDidChangeData(lines.length=${lines.length}) payLoadInByteSize=${payloadInByteSize} payLoadInByteModulus=${payLoadInByteModulus}`);
                    for (let i = 0; i < lines.length; ++i) {
                        const line = lines[i].split('\t');
                        const [strSeconds, strMicros] = line[0].split('.');
                        const seconds = Number(strSeconds);
                        const micros = Number(strMicros.slice(0, 6).padEnd(6, '0'));
                        const bufPayload = Buffer.from(line[1], "hex");
                        // console.log(` line ${i}: bufPayload.length=${bufPayload.length}`);
                        nrMsgs += dltFileWriter.parseAndWriteRaw(seconds, micros, payloadInByteSize > 1 ? Buffer.from(bufPayload.filter((v, i) => i % payloadInByteSize === payLoadInByteModulus)) : bufPayload);
                    }
                };
                let dltMsgBuffer;
                const processDlsPayload = (lines) => {
                    let lastSeconds = 0;
                    let lastMicros = 0;
                    //console.log(`onDidChangeData(lines.length=${lines.length}`);
                    for (let i = 0; i < lines.length; ++i) {
                        const line = lines[i].split('\t');
                        const [strSeconds, strMicros] = line[0].split('.');
                        const seconds = Number(strSeconds);
                        const micros = Number(strMicros.slice(0, 6).padEnd(6, '0'));
                        lastSeconds = seconds; // todo time from tecmp? but not really needed as the dlt has timestamp anyhow...
                        lastMicros = micros;
                        const bufPayload = Buffer.from(line[1], "hex");
                        // the UART/RS232_RAW data is weirdly stored:
                        if (payloadInByteSize > 1) {
                            // payloadInByteSize bytes per byte
                            const bufPayload2 = Buffer.from(bufPayload.filter((v, i) => i % payloadInByteSize === payLoadInByteModulus));
                            dltMsgBuffer = Buffer.concat(dltMsgBuffer ? [dltMsgBuffer, bufPayload2] : [bufPayload2]);
                        }
                        else {
                            dltMsgBuffer = Buffer.concat(dltMsgBuffer ? [dltMsgBuffer, bufPayload] : [bufPayload]);
                        }
                    }
                    // now process as many messages from the buffer as possible:
                    // messages are again weirdly stored: 
                    // DLS1 (dlt serial header), then no storage header but directly the standard header:
                    // search for DLS header first:
                    // skip data until next DLS header:
                    if (dltMsgBuffer) {
                        let skipped = 0;
                        while (dltMsgBuffer.length >= 4 + 4) { // dlt serial header + standard header:
                            if (dltMsgBuffer.readUInt32BE(0) === 0x444c5301) {
                                if (skipped) {
                                    console.log(`extractDlt found DLS header (skipped=${skipped})`);
                                }
                                skipped = 0;
                                // now we expect a standard header:
                                const stdHdrLen = dltMsgBuffer.readUInt16BE(4 + 2);
                                // do we have this len as well?
                                if (dltMsgBuffer.length >= 4 + 2 + 2 + stdHdrLen) {
                                    dltFileWriter.writeRaw(lastSeconds, lastMicros, dltMsgBuffer.slice(4, 4 + stdHdrLen));
                                    nrMsgs++;
                                    dltMsgBuffer = dltMsgBuffer?.slice(4 + stdHdrLen);
                                }
                                else {
                                    break;
                                }
                            }
                            else {
                                dltMsgBuffer = dltMsgBuffer?.slice(1);
                                ++skipped;
                            }
                        }
                    }
                };
                tp.onDidChangeData(confMethod?.options?.searchDls ? processDlsPayload : processRawPayload);
                let wasCancelled = false;
                cancelToken.onCancellationRequested(() => {
                    console.log(`extracting cancelled.`);
                    wasCancelled = true;
                    tp.dispose();
                    dltFileWriter.dispose();
                });
                progress.report({ message: `Extracting DLT...` });
                let interval = setInterval(() => {
                    var stats = fs.statSync(saveUri.fsPath);
                    const fileSize = stats["size"] / (1000 * 1000);
                    progress.report({ message: `Extracting DLT generated ${nrMsgs} msgs and ${Math.round(fileSize)}MB` });
                }, 1000); // todo could add number of seconds running as well
                await tp.done().then((res) => {
                    dltFileWriter.dispose();
                    vscode.window.showInformationMessage(`successfully extracted ${nrMsgs} DLT msgs to file '${saveUri.toString()}'`);
                }).catch((err) => {
                    dltFileWriter.dispose();
                    console.log(`got err:${err}`);
                    vscode.window.showErrorMessage(`extracting DLT failed with err=${err}`, { modal: true });
                });
                clearInterval(interval);
            });
        }
    }, true);
}
function getFilterExpr(stepData, items) {
    // return a tshark filter expression to be used with -Y ...
    let filter = '';
    if (Array.isArray(items)) {
        for (let i = 0; i < items.length; ++i) {
            const item = items[i];
            console.log(` getFilterExpr item=${JSON.stringify(item)}`);
            if (item.data.key.length === 0) {
                continue;
            } // skip
            if (filter.length > 0) {
                filter += ' or ';
            }
            if (item.data.data?.filterField !== undefined) {
                filter += item.data.data.filterField;
            }
            else {
                filter += stepData.filterField;
            }
            filter += `${stepData.filterOp ? stepData.filterOp : '=='}${item.data.key}`;
        }
        if (stepData.filterNegate !== undefined && stepData.filterNegate && filter.length > 0) {
            filter = `!(${filter})`;
        }
    }
    else {
        filter = items;
    }
    return filter;
}
;
function getTSharkArgs(steps) {
    let tsharkArgs = [];
    for (let s = 0; s < steps.length; ++s) {
        const stepData = steps[s];
        const filterExpr = getFilterExpr(stepData, stepData.results);
        let stepArgs = stepData.filterArgs ? [...stepData.filterArgs] : [];
        if (filterExpr.length) {
            stepArgs.push(`-Y ${separator}${filterExpr}${separator}`);
        }
        console.log(`got filter from step ${s}: '${filterExpr}'`);
        console.log(`got tsharkArgs from step ${s}: '${stepArgs.join(' ')}'`);
        if (stepArgs.length) {
            tsharkArgs.push(stepArgs);
        }
    }
    return tsharkArgs;
}
;
async function execFilterPcap(uris, saveFileExt, steps, execFunction, noSteps = false) {
    console.log(`execFilterPcap(${uris.map(v => v.toString()).join(',')}) with ${steps?.length} steps...`);
    // clear any prev. results:
    for (let s = 0; s < steps.length; ++s) {
        const step = steps[s];
        step.listProviderFinished = undefined;
        step.listProviderData = undefined;
        step.results = undefined;
    }
    const updatePickItem = function (item, data, key, listDescription) {
        item.name = key;
        if (data.icon) {
            item.icon = data.icon;
        }
        item.data = { key: key, data: data };
        let descString = '';
        if (listDescription) {
            for (let i = 0; i < listDescription.length; ++i) {
                descString += data[listDescription[i]];
            }
        }
        item.description = descString;
    };
    const updateQuickPick = function (stepData, data, items, quickPick, selectedItems = undefined) {
        stepData.listProviderData = data; // store in case we'd like to go back
        //console.log(`got ListData map.size=${data.map.size}`);
        data.map.forEach((value, mapKey) => {
            const key = value._firstKey || mapKey;
            const oldItemIdx = items.findIndex((value) => {
                if (value?.data?.key === key) {
                    return true;
                }
                return false;
            });
            if (oldItemIdx !== -1) {
                updatePickItem(items[oldItemIdx], value, key, stepData.listDescription);
            }
            else {
                console.log(`got new ListData: key='${key}', data='${JSON.stringify(value)}'`);
                const newItem = new quickPick_1.PickItem();
                if (stepData.listIcon) {
                    value.icon = stepData.listIcon;
                }
                updatePickItem(newItem, value, key, stepData.listDescription);
                items.push(newItem);
            }
        });
        // as we can only overwrite the full set we need to mark the selected ones:
        const newSelItems = [];
        const selectedItemsToUse = selectedItems ? selectedItems : quickPick.selectedItems;
        selectedItemsToUse.forEach((selItem) => {
            const itemIdx = items.findIndex((newVal) => {
                if (newVal?.data?.key === selItem?.data?.key) {
                    return true;
                }
                return false;
            });
            if (itemIdx !== -1) {
                newSelItems.push(items[itemIdx]);
            }
        });
        quickPick.items = items;
        quickPick.selectedItems = newSelItems;
    };
    for (let s = 0; s < steps.length; ++s) {
        const stepData = steps[s];
        const items = [];
        if (stepData.staticItems) {
            for (let i = 0; i < stepData.staticItems.length; ++i) {
                const staticData = stepData.staticItems[i];
                const staticItem = new quickPick_1.PickItem();
                updatePickItem(staticItem, staticData, staticData.key, stepData.listDescription);
                items.push(staticItem);
            }
        }
        // create quickpick but don't show yet:
        const quickPick = quickPick_1.QuickInputHelper.createQuickPick('filter pcap...', s + 1, steps.length + 1); // last step is save...
        quickPick.placeholder = stepData.title;
        quickPick.items = items;
        quickPick.selectedItems = items; // the static items are pre-selected
        if (stepData.listProviderData !== undefined) {
            // we got some data already:
            updateQuickPick(stepData, stepData.listProviderData, items, quickPick, stepData.results);
        }
        // do a search in the background?
        let tsharkLP = undefined;
        if (stepData["listProvider"] && !stepData.listProviderFinished) {
            // add the tsharkArgs from previous steps:
            let tsharkArgs = getTSharkArgs(steps.slice(0, s));
            tsharkArgs = tsharkArgs.concat(stepData.listProvider);
            tsharkLP = new tshark.TSharkListProvider(tsharkArgs, stepData.listProviderOptions || null, uris.map(u => u.fsPath));
            quickPick.busy = true;
            tsharkLP.onDidChangeData((data) => {
                updateQuickPick(stepData, data, items, quickPick);
            });
            tsharkLP.done().then(value => {
                console.log(`tsharkLP.done(value=${value})`);
                quickPick.busy = false;
                if (value === 0) {
                    stepData.listProviderFinished = true;
                }
            });
        }
        let doCancel = false;
        let doBack = false;
        await quickPick_1.QuickInputHelper.show(quickPick).then((selectedItems) => {
            console.log(`got selectedItems.length=${selectedItems?.length}`);
            // if the results lead to a changed filterExpr we have to invalidate the listProvider for next steps (if any):
            if (stepData.results !== undefined) {
                // do we have another step with listProviderFinished?
                if (s + 1 < steps.length) {
                    const nextStepData = steps[s + 1];
                    if (nextStepData.listProviderFinished !== undefined && nextStepData.listProviderFinished) {
                        // are the filterExpr different?
                        const oldFilterExpr = getFilterExpr(stepData, stepData.results);
                        const newFilterExpr = getFilterExpr(stepData, selectedItems);
                        if (oldFilterExpr !== newFilterExpr) {
                            console.log(`invalidated next steps listProvider`);
                            nextStepData.listProviderFinished = undefined;
                        }
                    }
                }
            }
            stepData.results = selectedItems;
        }).catch(err => {
            if (err === vscode.QuickInputButtons.Back) {
                doBack = true;
            }
            else {
                console.log(`step loop got err:${err}`);
                doCancel = true;
            }
        });
        console.log(`step ${s} done. `);
        if (tsharkLP !== undefined) {
            tsharkLP.dispose();
        }
        quickPick.dispose();
        if (doCancel) {
            break;
        }
        if (doBack) {
            s -= 2;
        }
    }
    // steps done. now save (if last step has results)
    if (steps.length > 0 || noSteps) {
        const lastStep = noSteps ? { results: true } : steps[steps.length - 1];
        if (lastStep.results !== undefined) {
            let doRetry;
            do {
                doRetry = false;
                await vscode.window.showSaveDialog({ defaultUri: uris[0].with({ path: uris[0].path + saveFileExt }), saveLabel: 'save filtered pcap as ...' }).then(async (saveUri) => {
                    if (saveUri) {
                        console.log(`save as uri=${saveUri?.toString()}`);
                        if (uris.map(u => u.toString()).includes(saveUri.toString())) {
                            vscode.window.showErrorMessage('Filtering into same file not possible. Please choose a different one.', { modal: true });
                            doRetry = true;
                        }
                        else {
                            execFunction(steps, saveUri);
                        }
                    }
                });
            } while (doRetry);
        }
    }
    console.log(`filterPcap() done`);
}
async function removeTecmp(uris) {
    const confSteps = vscode.workspace.getConfiguration().get('vsc-webshark.removeTecmpSteps');
    const extractArgs = vscode.workspace.getConfiguration().get('vsc-webshark.removeTecmpArgs');
    const extension = vscode.extensions.getExtension('mbehr1.vsc-webshark');
    console.log(`removeTecmp(${uris.map(v => v.toString()).join(',')}) with ${confSteps?.length} steps... ext path=${extension?.extensionPath}`);
    if (confSteps === undefined || confSteps.length < 0) {
        vscode.window.showErrorMessage('please check your vsc-webshark.removeTecmpSteps configuration! None defined.', { modal: true });
        return;
    }
    if (extractArgs === undefined || extractArgs.length === 0) {
        vscode.window.showErrorMessage('please check your vsc-webshark.removeTecmpArgs configuration! None defined.', { modal: true });
        return;
    }
    // check whether extractArgs contain:
    // ${{media/tecmpraw.lua}}"  and replace with path to media/tecmpraw.lua
    for (let i = 0; i < extractArgs.length; ++i) {
        let arg = extractArgs[i];
        arg = arg.replace(/\$\{\{(.*?)\}\}/g, (sub, p) => {
            return path.join(extension ? extension.extensionPath : '.', p);
        });
        if (arg !== extractArgs[i]) {
            console.log(` replaced '${extractArgs[i]}' with '${arg}'`);
            extractArgs[i] = arg;
        }
    }
    const steps = [...confSteps];
    return execFilterPcap(uris, '_woTecmp.pcap', steps, (steps, saveUri) => {
        let tsharkArgs = getTSharkArgs(steps);
        // we add the specific args here:
        tsharkArgs.push(extractArgs);
        if (tsharkArgs.length) {
            vscode.window.withProgress({ cancellable: true, location: vscode.ProgressLocation.Notification, title: `removing TECMP to ${saveUri.toString()}` }, async (progress, cancelToken) => {
                let nrMsgs = 0;
                // create the file:
                let saveFile = fs.openSync(saveUri.fsPath, 'w'); // todo rmove for exportDlt???,  fs.createWriteStream(saveUri.fsPath, { encoding: "binary" });
                // run tshark:
                const tp = new tshark.TSharkDataProvider(tsharkArgs, uris.map(v => v.fsPath));
                // global pcap header:
                /* typedef struct pcap_hdr_s {
                    guint32 magic_number;    magic number
                    guint16 version_major;   major version number
                    guint16 version_minor;   minor version number
                    gint32  thiszone;        GMT to local correction
                    guint32 sigfigs;         accuracy of timestamps
                    guint32 snaplen;         max length of captured packets, in octets
                    guint32 network;         data link type
                    } pcap_hdr_t; */
                const globalHeader = Buffer.allocUnsafe(6 * 4);
                globalHeader.writeUInt32LE(0xa1b2c3d4, 0); // microsec header
                globalHeader.writeUInt16LE(0x2, 4);
                globalHeader.writeUInt16LE(0x4, 6);
                globalHeader.writeUInt32LE(0x0, 8);
                globalHeader.writeUInt32LE(0x0, 12);
                globalHeader.writeUInt32LE(65535, 16);
                globalHeader.writeUInt32LE(0x1, 20);
                fs.writeSync(saveFile, globalHeader);
                /* record (packet) header
                typedef struct pcaprec_hdr_s {
                    guint32 ts_sec;         timestamp seconds
                    guint32 ts_usec;        timestamp microseconds
                    guint32 incl_len;       number of octets of packet saved in file
                    guint32 orig_len;       actual length of packet
                } pcaprec_hdr_t; */
                const recordHeader = Buffer.alloc(4 * 4);
                tp.onDidChangeData((lines) => {
                    //console.log(`onDidChangeData(lines.length=${lines.length}`);
                    for (let i = 0; i < lines.length; ++i) {
                        // console.log(`onDidChangeData line='${lines[i]}'`);
                        const line = lines[i].split('\t');
                        const [strSeconds, strMicros] = line[0].split('.');
                        const seconds = Number(strSeconds);
                        const micros = Number(strMicros.slice(0, 6).padEnd(6, '0'));
                        if (line[1].length > 1) {
                            // or optimize to avoid constant reallocs.
                            const bufPayload = Buffer.from(line[1], "hex");
                            // console.log(`onDidChangeData line1.length='${line[1].length}', buyPayload.length=${bufPayload.length}`);
                            // Timestamp: uint32 seconds uint32 micros
                            recordHeader.writeUInt32LE(seconds, 0); // todo secs
                            recordHeader.writeUInt32LE(micros, 4); // nsecs
                            recordHeader.writeUInt32LE(bufPayload.length, 8);
                            recordHeader.writeUInt32LE(bufPayload.length, 12);
                            const res = fs.writeSync(saveFile, recordHeader);
                            const res2 = fs.writeSync(saveFile, bufPayload);
                            console.assert(res === recordHeader.length && res2 === bufPayload.length, 'packet writeSync failed');
                            nrMsgs++;
                        }
                    }
                });
                let wasCancelled = false;
                cancelToken.onCancellationRequested(() => {
                    console.log(`extracting cancelled.`);
                    wasCancelled = true;
                    tp.dispose();
                });
                progress.report({ message: `Removing TECMP headers...` });
                let interval = setInterval(() => {
                    var stats = fs.statSync(saveUri.fsPath);
                    const fileSize = stats["size"] / (1000 * 1000);
                    progress.report({ message: `Removing TECMP ... generated ${nrMsgs} frames and ${Math.round(fileSize)}MB` });
                }, 1000); // todo could add number of seconds running as well
                await tp.done().then((res) => {
                    fs.closeSync(saveFile);
                    saveFile = -1;
                    vscode.window.showInformationMessage(`successfully extracted ${nrMsgs} frames to file '${saveUri.toString()}'`);
                }).catch((err) => {
                    console.log(`got err:${err}`);
                    vscode.window.showErrorMessage(`Removing TECMP failed with err=${err}`, { modal: true });
                    fs.closeSync(saveFile);
                    saveFile = -1;
                });
                clearInterval(interval);
            });
        }
    }, true);
}
//# sourceMappingURL=filterPcap.js.map