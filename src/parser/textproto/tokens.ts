export const enum TokenType {
  invalid,
  string,
  integer,
  float,
  boolean,
  identifier,
  colon,
  semicolon,
  comma,
  openBracket,
  closeBracket,
  openBrace,
  closeBrace,
  less,
  greater,
  dot,
  slash,
  comment, // special token type for convenience
}

export interface Token {
  type: TokenType;
  start: number;
  length: number;
}

export namespace Token {
  export function create(
    type: TokenType,
    start: number,
    length: number
  ): Token {
    return { type, start, length };
  }
}

export class Comment implements Token {
  type: TokenType = TokenType.comment;
  start: number;
  length: number;
  text: string;

  constructor(start: number, length: number, text: string) {
    this.start = start;
    this.length = length;
    this.text = text;
  }
}

export class IntegerToken implements Token {
  type: TokenType = TokenType.integer;
  start: number;
  length: number;
  text: string;
  radix: number;

  constructor(start: number, length: number, text: string, radix: number) {
    this.start = start;
    this.length = length;
    this.text = text;
    this.radix = radix;
  }
}

export class FloatToken implements Token {
  type: TokenType = TokenType.float;
  start: number;
  length: number;
  text: string;

  constructor(start: number, length: number, text: string) {
    this.start = start;
    this.length = length;
    this.text = text;
  }
}

export class BooleanToken implements Token {
  type: TokenType = TokenType.boolean;
  start: number;
  length: number;
  text: string;

  constructor(start: number, length: number, text: string) {
    this.start = start;
    this.length = length;
    this.text = text;
  }
}
