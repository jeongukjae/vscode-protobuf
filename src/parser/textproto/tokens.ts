// all token types.
export const enum TokenType {
  invalid,

  comment,

  string,
  integer,
  float,
  boolean,

  identifier,

  plus,
  hyphen,
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

export class CommentToken implements Token {
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

export class StringToken implements Token {
  type: TokenType = TokenType.string;
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

export class IdentifierToken implements Token {
  type: TokenType = TokenType.identifier;
  start: number;
  length: number;
  text: string;

  constructor(start: number, length: number, text: string) {
    this.start = start;
    this.length = length;
    this.text = text;
  }
}

export class PlusToken implements Token {
  type: TokenType = TokenType.plus;
  start: number;
  length: number;

  constructor(start: number) {
    this.start = start;
    this.length = 1;
  }
}

export class HyphenToken implements Token {
  type: TokenType = TokenType.hyphen;
  start: number;
  length: number;

  constructor(start: number) {
    this.start = start;
    this.length = 1;
  }
}

export class ColonToken implements Token {
  type: TokenType = TokenType.colon;
  start: number;
  length: number;

  constructor(start: number) {
    this.start = start;
    this.length = 1;
  }
}

export class SemicolonToken implements Token {
  type: TokenType = TokenType.semicolon;
  start: number;
  length: number;

  constructor(start: number) {
    this.start = start;
    this.length = 1;
  }
}

export class CommaToken implements Token {
  type: TokenType = TokenType.comma;
  start: number;
  length: number;

  constructor(start: number) {
    this.start = start;
    this.length = 1;
  }
}

export class OpenBracketToken implements Token {
  type: TokenType = TokenType.openBracket;
  start: number;
  length: number;

  constructor(start: number) {
    this.start = start;
    this.length = 1;
  }
}

export class CloseBracketToken implements Token {
  type: TokenType = TokenType.closeBracket;
  start: number;
  length: number;

  constructor(start: number) {
    this.start = start;
    this.length = 1;
  }
}

export class OpenBraceToken implements Token {
  type: TokenType = TokenType.openBrace;
  start: number;
  length: number;

  constructor(start: number) {
    this.start = start;
    this.length = 1;
  }
}

export class CloseBraceToken implements Token {
  type: TokenType = TokenType.closeBrace;
  start: number;
  length: number;

  constructor(start: number) {
    this.start = start;
    this.length = 1;
  }
}

export class LessToken implements Token {
  type: TokenType = TokenType.less;
  start: number;
  length: number;

  constructor(start: number) {
    this.start = start;
    this.length = 1;
  }
}

export class GreaterToken implements Token {
  type: TokenType = TokenType.greater;
  start: number;
  length: number;

  constructor(start: number) {
    this.start = start;
    this.length = 1;
  }
}

export class DotToken implements Token {
  type: TokenType = TokenType.dot;
  start: number;
  length: number;

  constructor(start: number) {
    this.start = start;
    this.length = 1;
  }
}

export class SlashToken implements Token {
  type: TokenType = TokenType.slash;
  start: number;
  length: number;

  constructor(start: number) {
    this.start = start;
    this.length = 1;
  }
}
