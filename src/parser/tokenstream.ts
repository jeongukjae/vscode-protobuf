export interface StreamUnit {
  start: number;
  length: number;
}

export class TokenStream<T extends StreamUnit> {
  private _text: string;
  private _tokens: T[];
  private _position: number;

  constructor(text: string, tokens: T[]) {
    this._text = text;
    this._tokens = tokens;
    this._position = 0;
  }

  get text(): string {
    return this._text;
  }

  get position(): number {
    return this._position;
  }

  getCurrentToken(): T {
    return this._tokens[this._position];
  }

  getCurrentTokenText(): string {
    return this._text.substring(
      this.getCurrentToken().start,
      this.getCurrentToken().start + this.getCurrentToken().length
    );
  }

  getNextToken(): T {
    return this._tokens[this._position + 1];
  }

  getNextTokenText(): string {
    return this._text.substring(
      this.getNextToken().start,
      this.getNextToken().start + this.getNextToken().length
    );
  }

  lookAhead(offset: number): T | null {
    const pos = this._position + offset;
    if (pos >= this._tokens.length || pos < 0) {
      return null;
    }
    return this._tokens[pos];
  }

  lookAheadText(offset: number): string {
    const token = this.lookAhead(offset);
    if (token) {
      return this._text.substring(token.start, token.start + token.length);
    }
    return "";
  }

  isEndOfStream(): boolean {
    return this._position >= this._tokens.length - 1;
  }

  moveNext() {
    if (this._position < this._tokens.length - 1) {
      this._position++;
      return;
    }

    throw new Error("Unexpected end of stream");
  }

  advance(offset: number) {
    this._position += offset;
  }
}
