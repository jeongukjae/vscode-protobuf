export const enum TokenType {
    invalid,
    endOfStream,
    newLine,
    string,
    number,
    identifier,
    keyword,
    colon,
    semicolon,
    comma,
    openParenthesis,
    closeParenthesis,
    openBracket,
    closeBracket,
    openBrace,
    closeBrace,
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
    reserved,
    to, // e.g. "reserved 1 to 15;"
    true,
    false,
    inf,
    nan,
}

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
