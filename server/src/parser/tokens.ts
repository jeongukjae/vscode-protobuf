export const enum TokenType {
    invalid,
    string,
    number,
    boolean,
    identifier,
    keyword,
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
    reserved: KeywordType.reserved,
    to: KeywordType.to,
};

export interface Token {
    type: TokenType;
    start: number;
    length: number;
}

export namespace Token {
    export function create(type: TokenType, start: number, length: number): Token {
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
    type: TokenType = TokenType.number;
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
    type: TokenType = TokenType.number;
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

    constructor(start: number, length: number, text: string, keyword: KeywordType) {
        this.start = start;
        this.length = length;
        this.text = text;
        this.keyword = keyword;
    }
}
