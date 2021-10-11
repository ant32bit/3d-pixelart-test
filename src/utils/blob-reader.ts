export class ArrayBufferReader {
    
    private _buffer: ArrayBuffer;
    private _ptr: number = 0;

    constructor (buffer: ArrayBuffer) {
        this._buffer = buffer;
    }

    public get eof(): boolean { return this._ptr >= this._buffer.byteLength }

    public readASCIIFixedLengthString(length: number): string {
        return new TextDecoder("ascii").decode(this.slice(length));
    }

    public readASCIIZeroTerminatedString(length: number): string {
        const extract = this.slice(length);
        var end = new Uint8Array(extract).indexOf(0);
        if (end <= 0) return '';
        return new TextDecoder("ascii").decode(extract.slice(0, end));
    }

    public readShiftJISZeroTerminatedString(length: number): string {
        const extract = this.slice(length);
        var end = new Uint8Array(extract).indexOf(0);
        if (end <= 0) return '';
        return new TextDecoder("shift-jis").decode(extract.slice(0, end));
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