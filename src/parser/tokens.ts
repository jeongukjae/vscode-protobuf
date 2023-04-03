export const enum TokenType {
  invalid,
  string,
  integer,
  float,
  boolean,
  identifier,
  keyword,
  primitiveType,
  operator,
  semicolon,
  comma,
  openParenthesis,
  closeParenthesis,
  openBracket,
  closeBracket,
  openBrace,
  closeBrace,
  less,
  greater,
  dot,
  comment, // special token type for convenience
}

export const enum KeywordType {
  syntax,
  import,
  public, // used for import
  weak, // used for import
  package,
  option,
  message,
  enum,
  service,
  rpc,
  returns,
  oneof,
  repeated,
  map,
  optional,
  reserved,
  to, // e.g. "reserved 1 to 15;"
}

export const keywordMap: { [key: string]: KeywordType } = {
  syntax: KeywordType.syntax,
  import: KeywordType.import,
  public: KeywordType.public,
  weak: KeywordType.weak,
  package: KeywordType.package,
  option: KeywordType.option,
  message: KeywordType.message,
  enum: KeywordType.enum,
  service: KeywordType.service,
  rpc: KeywordType.rpc,
  returns: KeywordType.returns,
  oneof: KeywordType.oneof,
  repeated: KeywordType.repeated,
  map: KeywordType.map,
  optional: KeywordType.optional,
  reserved: KeywordType.reserved,
  to: KeywordType.to,
};

export const enum PrimitiveType {
  double,
  float,
  int32,
  int64,
  uint32,
  uint64,
  sint32,
  sint64,
  fixed32,
  fixed64,
  sfixed32,
  sfixed64,
  bool,
  string,
  bytes,
}

export const primitiveTypeMap: { [key: string]: PrimitiveType } = {
  double: PrimitiveType.double,
  float: PrimitiveType.float,
  int32: PrimitiveType.int32,
  int64: PrimitiveType.int64,
  uint32: PrimitiveType.uint32,
  uint64: PrimitiveType.uint64,
  sint32: PrimitiveType.sint32,
  sint64: PrimitiveType.sint64,
  fixed32: PrimitiveType.fixed32,
  fixed64: PrimitiveType.fixed64,
  sfixed32: PrimitiveType.sfixed32,
  sfixed64: PrimitiveType.sfixed64,
  bool: PrimitiveType.bool,
  string: PrimitiveType.string,
  bytes: PrimitiveType.bytes,
};

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
  isBlock: boolean;
  text: string;

  constructor(start: number, length: number, isBlock: boolean, text: string) {
    this.start = start;
    this.length = length;
    this.isBlock = isBlock;
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

export class KeywordToken implements Token {
  type: TokenType = TokenType.keyword;
  start: number;
  length: number;
  text: string;
  keyword: KeywordType;

  constructor(
    start: number,
    length: number,
    text: string,
    keyword: KeywordType
  ) {
    this.start = start;
    this.length = length;
    this.text = text;
    this.keyword = keyword;
  }
}

export class PrimitiveTypeToken implements Token {
  type: TokenType = TokenType.primitiveType;
  start: number;
  length: number;
  primitiveType: PrimitiveType;

  constructor(start: number, length: number, primitiveType: PrimitiveType) {
    this.start = start;
    this.length = length;
    this.primitiveType = primitiveType;
  }
}
