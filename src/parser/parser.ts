import { CommentNode, DocumentNode, ImportNode, Node, OptionNode, PackageNode, SyntaxNode } from "./nodes";
import { Proto3Tokenizer } from "./tokenizer";
import { Comment, KeywordToken, KeywordType, Token, TokenType } from "./tokens";


export class TokenStream {
    private _text: string;
    private _tokens: Token[];
    private _position: number;

    constructor(text: string,  tokens: Token[]) {
        this._text = text;
        this._tokens = tokens;
        this._position = 0;
    }

    get position(): number {
        return this._position;
    }

    getCurrentToken(): Token {
        return this._tokens[this._position];
    }

    getCurrentTokenText(): string {
        return this._text.substring(this.getCurrentToken().start, this.getCurrentToken().start + this.getCurrentToken().length);
    }

    getNextToken(): Token {
        return this._tokens[this._position + 1];
    }

    getNextTokenText(): string {
        return this._text.substring(this.getNextToken().start, this.getNextToken().start + this.getNextToken().length);
    }

    lookAhead(offset: number): Token | null {
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
        return this._position >= this._tokens.length;
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

export interface ParserContext {
    tokenStream: TokenStream;
    document: DocumentNode;
    current: Node;
}

export class Proto3Parser {
    parse(text: string): DocumentNode {
        let tokens = new Proto3Tokenizer().tokenize(text);
        let document = new DocumentNode(0, text.length);

        let ctx = {
            tokenStream: new TokenStream(text, tokens),
            document: document,
            current: document
        };

        for (let token of tokens) {
            this._handleToken(ctx, token);
        }

        return document;
    }

    private _handleToken(ctx: ParserContext, token: Token) {
        switch (token.type) {
            case TokenType.comment: {
                this._handleComment(ctx, token);
                return;
            }
            case TokenType.keyword: {
                this._handleKeyword(ctx, token);
                return;
            }
        }
    }

    private _handleComment(ctx: ParserContext, token: Token) {
        let commentToken = token as Comment;

        let comment = new CommentNode(commentToken.start, commentToken.length, commentToken.text);
        comment.setParent(ctx.current);
        ctx.current.add(comment);
    }

    private _handleKeyword(ctx: ParserContext, token: Token) {
        let keywordToken = token as KeywordToken;
        switch (keywordToken.keyword) {
            case KeywordType.syntax: {
                let syntax = this._handleSyntax(ctx, keywordToken);
                syntax.setParent(ctx.current);
                ctx.current.add(syntax);
                return;
            }

            case KeywordType.package: {
                let pkg = this._handlePackage(ctx, keywordToken);
                pkg.setParent(ctx.current);
                ctx.current.add(pkg);
                return;
            }

            case KeywordType.import: {
                let imp = this._handleImport(ctx, keywordToken);
                imp.setParent(ctx.current);
                ctx.current.add(imp);
                return;
            }

            case KeywordType.option: {
                let option = this._handleOption(ctx, keywordToken);
                option.setParent(ctx.current);
                ctx.current.add(option);
                return;
            }
        }
    }

    private _handleSyntax(ctx: ParserContext, token: KeywordToken): SyntaxNode {
        let keywordToken = token as KeywordToken;
        ctx.tokenStream.moveNext();
        if (ctx.tokenStream.getCurrentToken().type !== TokenType.operator && ctx.tokenStream.getCurrentTokenText() !== "=") {
            throw new Error("Expected '=' after 'syntax'");
        }

        ctx.tokenStream.moveNext();
        if (ctx.tokenStream.getCurrentToken().type !== TokenType.string && ctx.tokenStream.getCurrentTokenText() !== "'proto3'" || ctx.tokenStream.getCurrentTokenText() !== '"proto3"') {
            throw new Error("Expected 'proto3' after 'syntax ='");
        }

        ctx.tokenStream.moveNext();
        if (ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon) {
            throw new Error("Expected ';' after the statement");
        }
        let lastToken = ctx.tokenStream.getCurrentToken();
        ctx.tokenStream.moveNext();
        return new SyntaxNode(keywordToken.start, lastToken.start + lastToken.length, "proto3");
    }

    private _handlePackage(ctx: ParserContext, token: KeywordToken): PackageNode {
        let keywordToken = token as KeywordToken;
        ctx.tokenStream.moveNext();

        let path = this._consumeFullIdentifier(ctx, "package");
        if (ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon) {
            throw new Error("Expected ';' after the statement");
        }
        let lastToken = ctx.tokenStream.getCurrentToken();
        ctx.tokenStream.moveNext();
        return new PackageNode(keywordToken.start, lastToken.start + lastToken.length, path);
    }

    private _handleImport(ctx: ParserContext, token: KeywordToken): ImportNode {
        let keywordToken = token as KeywordToken;
        ctx.tokenStream.moveNext();

        let modifier: string | undefined = undefined;
        if (ctx.tokenStream.getCurrentToken().type !== TokenType.string) {
            if (ctx.tokenStream.getCurrentToken().type !== TokenType.identifier) {
                throw new Error("Expected package name after 'package'");
            }

            if (ctx.tokenStream.getCurrentTokenText() !== "public" || ctx.tokenStream.getCurrentTokenText() !== "weak") {
                throw new Error("Expected package name after 'package'");
            }
            modifier = ctx.tokenStream.getCurrentTokenText();

            ctx.tokenStream.moveNext();
        }

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.string) {
            throw new Error("Expected package name after 'package'");
        }
        let path = ctx.tokenStream.getCurrentTokenText();

        let lastToken = ctx.tokenStream.getCurrentToken();
        if (ctx.tokenStream.getNextToken().type !== TokenType.semicolon) {
            throw new Error("Expected ';' after the statement");
        }

        ctx.tokenStream.moveNext();
        return new ImportNode(keywordToken.start, lastToken.start + lastToken.length, path, modifier);
    }

    private _handleOption(ctx: ParserContext, token: KeywordToken): OptionNode {
        let keywordToken = token as KeywordToken;
        ctx.tokenStream.moveNext();

        let option = "";
        if (ctx.tokenStream.getCurrentToken().type === TokenType.openParenthesis) {
            option = "(" + this._consumeFullIdentifier(ctx, "option");

            if (ctx.tokenStream.getCurrentToken().type !== TokenType.closeParenthesis) {
                throw new Error("Expected ')' after the option path");
            }
            option += ")";
            ctx.tokenStream.moveNext();

            if (ctx.tokenStream.getCurrentToken().type !== TokenType.dot) {
                throw new Error("Expected '.' after the option path");
            }
            option += ".";
        }

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.identifier) {
            throw new Error("Expected option name after 'option'");
        }
        option += ctx.tokenStream.getCurrentTokenText();
        ctx.tokenStream.moveNext();

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.operator || ctx.tokenStream.getCurrentTokenText() !== "=") {
            throw new Error("Expected '=' after the option name");
        }
        ctx.tokenStream.moveNext();

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.string) {
            throw new Error("Expected option value after '='");
        }
        let value = ctx.tokenStream.getCurrentTokenText();
        ctx.tokenStream.moveNext();

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon) {
            throw new Error("Expected ';' after the statement");
        }

        let lastToken = ctx.tokenStream.getCurrentToken();
        ctx.tokenStream.moveNext();

        return new OptionNode(keywordToken.start, lastToken.start + lastToken.length, option, value);
    }

    private _consumeFullIdentifier(ctx: ParserContext, prevKeyword: string): string {
        let result = "";
        if (ctx.tokenStream.getCurrentToken().type !== TokenType.identifier) {
            throw new Error(`Expected ${prevKeyword} name after '${prevKeyword}'`);
        }
        result += ctx.tokenStream.getCurrentTokenText();
        ctx.tokenStream.moveNext();

        while (ctx.tokenStream.getCurrentToken().type === TokenType.dot) {
            if (ctx.tokenStream.getNextToken().type !== TokenType.identifier) {
                throw new Error(`Unexpected token in ${prevKeyword} name`);
            }
            result += ctx.tokenStream.getCurrentTokenText();
            result += ctx.tokenStream.getNextTokenText();
            ctx.tokenStream.moveNext();
            ctx.tokenStream.moveNext();
        }

        ctx.tokenStream.moveNext();

        return result;
    }
}
