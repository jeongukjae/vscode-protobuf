import { isLineBreak, isWhitespace } from "./utils";

// CharacterStream is a wrapper around a string that allows for
// convenient access to the current character and look ahead
// functionality.
export class CharacterStream {
  private _text: string;
  private _position: number;

  // Create a new CharacterStream for the given text.
  constructor(text: string) {
    this._text = text;
    this._position = 0;
  }

  // Get the original text.
  get text(): string {
    return this._text;
  }

  // Get the length of the original text.
  get length(): number {
    return this._text.length;
  }

  // Get the current position.
  get position(): number {
    return this._position;
  }

  // Set the current position.
  set position(value: number) {
    this._position = value;
  }

  // Get the current character code.
  getCurrentChar(): number {
    if (this._position >= this._text.length) {
      return 0;
    }
    return this.text.charCodeAt(this._position);
  }

  // Get the next character code.
  getNextChar(): number {
    if (this._position >= this._text.length - 1) {
      return 0;
    }
    return this.text.charCodeAt(this._position + 1);
  }

  // Check if the current position is at the end of the stream.
  isEndOfStream(): boolean {
    return this._position >= this._text.length;
  }

  // Look ahead at the next character code.
  lookAhead(offset: number): number {
    const pos = this._position + offset;
    if (pos >= this._text.length || pos < 0) {
      return 0;
    }
    return this.charCodeAt(pos);
  }

  // Get the character code at the given index.
  charCodeAt(index: number): number {
    return this._text.charCodeAt(index);
  }

  // Advance the current position by the given offset.
  advance(offset: number) {
    this._position += offset;
  }

  // Move to the next character code.
  moveNext(): boolean {
    if (this._position < this._text.length - 1) {
      this._position++;
      return true;
    }

    this.advance(1);
    return !this.isEndOfStream();
  }

  // === Helper functions ===

  // Helper functions for check the current character code is whitespace.
  isAtWhitespace(): boolean {
    return isWhitespace(this.getCurrentChar());
  }

  // Helper functions for check the current character code is line break.
  isAtLineBreak(): boolean {
    return isLineBreak(this.getCurrentChar());
  }

  // Move next until the current character code is line break.
  skipToLineBreak() {
    while (!this.isEndOfStream() && !this.isAtLineBreak()) {
      this.moveNext();
    }
  }

  // Move next until the current character code is not whitespace.
  skipWhitespace() {
    while (!this.isEndOfStream() && this.isAtWhitespace()) {
      this.moveNext();
    }
  }
}
