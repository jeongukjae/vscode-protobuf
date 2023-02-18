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
    openParen,
    closeParen,
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

export class Comment implements Token {
    type: TokenType = TokenType.comment;
    start: number;
    length: number;
    isBlock: boolean;

    constructor(start: number, length: number, isBlock: boolean) {
        this.start = start;
        this.length = length;
        this.isBlock = isBlock;
    }

    // Merging multiple single line comments?
    //
    // merge(other: Comment): Comment {
    //     if (this.isBlock !== other.isBlock) {
    //         throw new Error('Cannot merge block comment with line comment');
    //     }
    //     if (this.start > other.start) {
    //         return other.merge(this);
    //     }
    //
    //     this.length = other.start + other.length - this.start;
    //     return this;
    // }
}
