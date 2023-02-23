import { CommentNode, DocumentNode, ImportNode, MessageNode, Node, OptionNode, PackageNode, SyntaxNode, FieldNode } from "./nodes";
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

export interface ParserContext {
    tokenStream: TokenStream;
    document: DocumentNode;
    current: Node;
}

export class Proto3Parser {
    parse(text: string): DocumentNode {
        let tokens = new Proto3Tokenizer().tokenize(text);
        let document = new DocumentNode(0, text.length);

        if (tokens.length === 0) {
            return document;
        }

        let ctx = {
            tokenStream: new TokenStream(text, tokens),
            document: document,
            current: document
        };

        do {
            this._handleToken(ctx);
            if (ctx.tokenStream.isEndOfStream()) {
                break;
            }
            ctx.tokenStream.moveNext();
        } while (true);

        return document;
    }

    private _handleToken(ctx: ParserContext) {
        switch (ctx.tokenStream.getCurrentToken().type) {
            case TokenType.comment: {
                this._handleComment(ctx);
                return;
            }
            case TokenType.keyword: {
                this._handleKeyword(ctx);
                return;
            }
        }
    }

    private _handleComment(ctx: ParserContext) {
        let commentToken = ctx.tokenStream.getCurrentToken() as Comment;
        let comment = new CommentNode(commentToken.start, commentToken.length, commentToken.text);

        comment.setParent(ctx.current);
        ctx.current.add(comment);
    }

    private _handleKeyword(ctx: ParserContext) {
        let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
        switch (keywordToken.keyword) {
            case KeywordType.syntax: {
                let syntax = this._handleSyntax(ctx);
                syntax.setParent(ctx.current);
                ctx.current.add(syntax);
                return;
            }

            case KeywordType.package: {
                let pkg = this._handlePackage(ctx);
                pkg.setParent(ctx.current);
                ctx.current.add(pkg);
                return;
            }

            case KeywordType.import: {
                let imp = this._handleImport(ctx);
                imp.setParent(ctx.current);
                ctx.current.add(imp);
                return;
            }

            case KeywordType.option: {
                let option = this._handleOption(ctx);
                option.setParent(ctx.current);
                ctx.current.add(option);
                return;
            }

            case KeywordType.message: {
                let message = this._handleMessage(ctx);
                message.setParent(ctx.current);
                ctx.current.add(message);
                return;
            }
        }
    }

    private _handleSyntax(ctx: ParserContext): SyntaxNode {
        let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
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
        let semicolon = ctx.tokenStream.getCurrentToken();
        let length = semicolon.start + semicolon.length - keywordToken.start;
        return new SyntaxNode(keywordToken.start, length, "proto3");
    }

    private _handlePackage(ctx: ParserContext): PackageNode {
        let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
        ctx.tokenStream.moveNext();

        let path = this._consumeFullIdentifier(ctx, "package");
        if (ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon) {
            throw new Error("Expected ';' after the statement");
        }
        let semicolon = ctx.tokenStream.getCurrentToken();
        let length = semicolon.start + semicolon.length - keywordToken.start;
        return new PackageNode(keywordToken.start, length, path);
    }

    private _handleImport(ctx: ParserContext): ImportNode {
        let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
        ctx.tokenStream.moveNext();

        let modifier: string | undefined = undefined;
        if (ctx.tokenStream.getCurrentToken().type !== TokenType.string) {
            if (ctx.tokenStream.getCurrentToken().type !== TokenType.identifier) {
                throw new Error("Expected file path after 'package'");
            }

            if (ctx.tokenStream.getCurrentTokenText() !== "public" || ctx.tokenStream.getCurrentTokenText() !== "weak") {
                throw new Error("Expected file path after 'package'");
            }
            modifier = ctx.tokenStream.getCurrentTokenText();

            ctx.tokenStream.moveNext();
        }

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.string) {
            throw new Error("Expected file path after 'package'");
        }
        let path = ctx.tokenStream.getCurrentTokenText();
        ctx.tokenStream.moveNext();

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon) {
            throw new Error("Expected ';' after the statement");
        }
        let semicolon = ctx.tokenStream.getCurrentToken();
        let length = semicolon.start + semicolon.length - keywordToken.start;
        return new ImportNode(keywordToken.start, length, path, modifier);
    }

    private _handleOption(ctx: ParserContext): OptionNode {
        let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
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

        let semicolon = ctx.tokenStream.getCurrentToken();
        let length = semicolon.start + semicolon.length - keywordToken.start;
        return new OptionNode(keywordToken.start, length, option, value);
    }

    private _handleMessage(ctx: ParserContext): MessageNode {
        let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
        ctx.tokenStream.moveNext();

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.identifier) {
            throw new Error("Expected message name after 'message'");
        }

        let name = ctx.tokenStream.getCurrentTokenText();
        ctx.tokenStream.moveNext();

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.openBrace) {
            throw new Error("Expected '{' after the message name");
        }
        ctx.tokenStream.moveNext();

        let children: Node[] = [];
        let options: OptionNode[] = [];
        let fields: FieldNode[] = [];
        while (ctx.tokenStream.getCurrentToken().type !== TokenType.closeBrace) {
            switch (ctx.tokenStream.getCurrentToken().type) {
                case TokenType.keyword: {
                    let keyword = ctx.tokenStream.getCurrentTokenText();

                    switch (keyword) {
                        case "option":
                            options.push(this._handleOption(ctx));
                            break;
                    }

                    break;
                }
                case TokenType.semicolon: {
                    // empty statement
                    // TODO: add empty statement node?
                    ctx.tokenStream.moveNext();
                    break;
                }
            }
        }

        const message = new MessageNode(keywordToken.start, ctx.tokenStream.getCurrentToken().start, name);
        children.forEach(child => message.add(child));
        options.forEach(option => message.addOption(option));
        fields.forEach(field => message.addField(field));
        return message;
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

        return result;
    }
}
