import { isLineBreak, isWhitespace } from "./utils";

export class CharacterStream {
    private _text: string;
    private _position: number;

    constructor(text: string) {
        this._text = text;
        this._position = 0;
    }

    get text(): string {
        return this._text;
    }

    get position(): number {
        return this._position;
    }

    set position(value: number) {
        this._position = value;
    }

    getCurrentChar(): number {
        if (this._position >= this._text.length) {
            return 0;
        }
        return this.text.charCodeAt(this._position);
    }

    get nextChar(): number {
        if (this._position >= this._text.length - 1) {
            return 0;
        }
        return this.text.charCodeAt(this._position + 1);
    }

    isEndOfStream(): boolean {
        return this._position >= this._text.length;
    }

    lookAhead(offset: number): number {
        const pos = this._position + offset;
        if (pos >= this._text.length || pos < 0) {
            return 0;
        }
        return this.charCodeAt(pos);
    }

    advance(offset: number) {
        this._position += offset;
    }

    moveNext(): boolean {
        if (this._position < this._text.length - 1) {
            this._position++;
            return true;
        }

        this.advance(1);
        return !this.isEndOfStream();
    }

    isAtWhitespace(): boolean {
        return isWhitespace(this.getCurrentChar());
    }

    isAtLineBreak(): boolean {
        return isLineBreak(this.getCurrentChar());
    }

    charCodeAt(index: number): number {
        return this._text.charCodeAt(index);
    }

    skipToLineBreak() {
        while (!this.isEndOfStream() && !this.isAtLineBreak()) {
            this.moveNext();
        }
    }

    skipWhitespace() {
        while (!this.isEndOfStream() && this.isAtWhitespace()) {
            this.moveNext();
        }
    }

    get length(): number {
        return this._text.length;
    }
}
