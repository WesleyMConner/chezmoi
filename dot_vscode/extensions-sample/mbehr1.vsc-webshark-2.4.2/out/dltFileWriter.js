"use strict";
/* --------------------
 * Copyright(C) Matthias Behr, 2021.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DltFileWriter = void 0;
const console_1 = require("console");
const fs = require("fs");
class DltFileWriter {
    constructor(storageHeaderECU, fsPath) {
        this.storageHeaderECU = storageHeaderECU;
        this.fsPath = fsPath;
        console.log(`DltFileWriter(ecu='${storageHeaderECU}' fsPath='${fsPath}')`);
        (0, console_1.assert)(storageHeaderECU.length === 4, "storageHeaderEcu length needs to be exactly 4 bytes/chars");
        this.fileHandle = fs.openSync(fsPath, 'w');
        (0, console_1.assert)(this.fileHandle > 0, "couldn't open file for writing");
        this.bufStorageHeader = Buffer.alloc(16);
        this.bufStorageHeader.writeUInt32LE(0x01544c44, 0); // DLT+0x01 (0x44 0x4c 0x54 0x01)
        this.bufStorageHeader.write(storageHeaderECU, 12, 4, "ascii"); // ECU ID
    }
    /**
     * dispose closes the file
     */
    dispose() {
        console.log(`DltFileWriter.dispose() fileHandle=${this.fileHandle}`);
        if (this.fileHandle !== -1) {
            fs.closeSync(this.fileHandle);
            this.fileHandle = -1;
        }
    }
    /**
     * write a dlt message storage header (SH) plus raw payload from buffer
     * @param seconds seconds to use for the SH
     * @param micros microseconds to use for the SH
     * @param rawMsgData buffer with data reflecting a dlt message
     */
    writeRaw(seconds, micros, rawMsgData) {
        (0, console_1.assert)(this.fileHandle !== -1, "DltFileWriter.writeRaw fileHandle invalid!");
        // Timestamp: uint32 seconds sint32 micros
        this.bufStorageHeader.writeUInt32LE(seconds, 4);
        this.bufStorageHeader.writeInt32LE(micros, 8);
        fs.writeFileSync(this.fileHandle, this.bufStorageHeader);
        fs.writeFileSync(this.fileHandle, rawMsgData);
    }
    /**
     * write potentially multiple dlt messages with storage header from a raw payload buffer
     *
     * A udp dlt message can contain in one udp packet multiple packets. We're parsing the
     * payload buffer for the length and then writing multiple messages.
     *
     * @param seconds seconds to use for the SH
     * @param micros microseconds to use for the SH
     * @param rawMsgData buffer with data reflecting a dlt message
     * @returns number of messages parsed/written
     */
    parseAndWriteRaw(seconds, micros, rawMsgsData) {
        let nrMsgs = 0;
        (0, console_1.assert)(this.fileHandle !== -1, "DltFileWriter.parseAndWriteRaw fileHandle invalid!");
        let lenAvail = rawMsgsData.length;
        let processed = 0;
        while (lenAvail > 4) {
            // StandardHeader: 1 byte HTYP, 1 byte MCNT, 2 byte (BE) len:
            // len includes the standardheader
            const msgLen = rawMsgsData.readUInt16BE(processed + 2);
            if (msgLen >= 4 && msgLen <= lenAvail) {
                // write that msg:
                this.bufStorageHeader.writeUInt32LE(seconds, 4);
                this.bufStorageHeader.writeInt32LE(micros, 8);
                fs.writeFileSync(this.fileHandle, this.bufStorageHeader);
                fs.writeFileSync(this.fileHandle, rawMsgsData.slice(processed, processed + msgLen));
                nrMsgs += 1;
                processed += msgLen;
                lenAvail -= msgLen;
            }
            else {
                console.warn(`DltFileWriter.parseAndWriteRaw msgLen ${msgLen} invalid at offset ${processed}! (lenAvail=${lenAvail})`);
                lenAvail = 0;
            }
        }
        if (processed < rawMsgsData.length) {
            console.warn(`DltFileWriter.parseAndWriteRaw ignored data, processed=${processed}/${rawMsgsData.length}!`);
        }
        return nrMsgs;
    }
}
exports.DltFileWriter = DltFileWriter;
//# sourceMappingURL=dltFileWriter.js.map