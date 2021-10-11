
let files: {[filename: string]: string} = null;
const fileCache: {[filename: string]: ArrayBuffer} = {};

function initFiles() {
    if (files == null) {
        files = {};
        const nodes = document.querySelectorAll('.file');
        for(const node of nodes) {
            const el = node as HTMLElement;
            const name = el.dataset.name;
            const location = el.dataset.location;
            files[name] = location;
        }
    }
}

export function getFilename(name: string): string {
    initFiles();
    return files[name];
}

export async function readFile(name: string): Promise<ArrayBuffer> {
    initFiles();
    if (files[name] != null) {
        const serverFileName = files[name];
        if (fileCache[serverFileName] == null) {
            var response = await fetch(serverFileName);
            var fileContent = await response.blob();
            fileCache[serverFileName] = await fileContent.arrayBuffer();
        }

        return fileCache[serverFileName];
    }
    return null;
}

interface IFileCache {
    location: string;
    content: ArrayBuffer;
}

export class ArrayBufferReader {
    
    private _buffer: ArrayBuffer;
    private _ptr: number = 0;
    private _shiftjisDecoder = new TextDecoder('shift-jis');
    private _asciiDecoder = new TextDecoder('ascii');

    constructor (buffer: ArrayBuffer) {
        this._buffer = buffer;
    }

    public get eof(): boolean { return this._ptr >= this._buffer.byteLength }

    public readASCIIFixedLengthString(length: number): string {
        return this._asciiDecoder.decode(this.slice(length));
    }

    public readASCIIZeroTerminatedString(length: number): string {
        const extract = this.slice(length);
        var end = new Uint8Array(extract).indexOf(0);
        if (end <= 0) return '';
        return this._asciiDecoder.decode(extract.slice(0, end));
    }

    public readShiftJISZeroTerminatedString(length: number): string {
        const extract = this.slice(length);
        var end = new Uint8Array(extract).indexOf(0);
        if (end <= 0) return '';
        return this._shiftjisDecoder.decode(extract.slice(0, end));
    }

    public readFloat(): number {
        return new Float32Array(this.slice(4))[0]
    }

    public readFloatArray(length: number): Float32Array {
        return new Float32Array(this.slice(4 * length));
    }

    public readInt16(): number {
        return new Int16Array(this.slice(2))[0];
    }

    public readInt16Array(length: number): Int16Array {
        return new Int16Array(this.slice(2 * length));
    }

    public readUint32Array(length: number): Uint32Array {
        return new Uint32Array(this.slice(4 * length));
    }

    public readUint32(): number {
        return new Uint32Array(this.slice(4))[0];
    }

    public readUint16(): number {
        return new Uint16Array(this.slice(2))[0];
    }

    public readUint16Array(length: number): Uint16Array {
        return new Uint16Array(this.slice(2 * length));
    }

    public readUint8(): number {
        return new Uint8Array(this.slice(1))[0];
    }

    public readUint8Array(length: number): Uint8Array {
        return new Uint8Array(this.slice(length));
    }

    private slice(size: number): ArrayBuffer {
        const slice = this._buffer.slice(this._ptr, this._ptr + size);
        this._ptr += size;
        return slice;
    }
}
