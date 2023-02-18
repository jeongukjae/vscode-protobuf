import { isLineBreak, isWhitespace } from "./utils";

export enum Char {
    slash = "/".charCodeAt(0),
    backSlash = "\\".charCodeAt(0),
    asterisk = "*".charCodeAt(0),
}

export class CharacterStream {
    private _text: string;
    private _position: number;
    private _currentChar: number;

    constructor(text: string) {
        this._text = text;
        this._position = 0;
        this._currentChar = text.length > 0 ? text.charCodeAt(0) : 0;
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

    get currentChar(): number {
        return this._currentChar;
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
            this._currentChar = this.charCodeAt(this._position);
            return true;
        }

        this.advance(1);
        return !this.isEndOfStream();
    }

    isAtWhitespace(): boolean {
        return isWhitespace(this._currentChar);
    }

    isAtLineBreak(): boolean {
        return isLineBreak(this._currentChar);
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
        while (!this.isEndOfStream() && (this.isAtWhitespace() || this.isAtLineBreak())) {
            this.moveNext();
        }
    }

    get length(): number {
        return this._text.length;
    }
}
