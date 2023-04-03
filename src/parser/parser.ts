import { CommentNode, DocumentNode, ImportNode, MessageNode, Node, OptionNode, PackageNode, SyntaxNode, FieldNode, EnumNode, EnumValueNode } from "./nodes";
import { Proto3Tokenizer } from "./tokenizer";
import { Comment, IntegerToken, KeywordToken, KeywordType, PrimitiveTypeToken, Token, TokenType } from "./tokens";
import { TokenStream } from "./tokenstream";

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

        this._parse(ctx);
        return document;
    }

    private _parse(ctx: ParserContext) {
        do {
            this._handleToken(ctx);
            if (ctx.tokenStream.isEndOfStream()) {
                break;
            }
            ctx.tokenStream.moveNext();
        } while (true);
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

            case KeywordType.enum: {
                let enumNode = this._handleEnum(ctx);
                enumNode.setParent(ctx.current);
                ctx.current.add(enumNode);
                return;
            }
        }
    }

    private _handleSyntax(ctx: ParserContext): SyntaxNode {
        let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
        ctx.tokenStream.moveNext();
        if (ctx.tokenStream.getCurrentToken().type !== TokenType.operator && ctx.tokenStream.getCurrentTokenText() !== "=") {
            throw this._generateError(ctx, "Expected '=' after 'syntax'");
        }

        ctx.tokenStream.moveNext();
        if (ctx.tokenStream.getCurrentToken().type !== TokenType.string && ctx.tokenStream.getCurrentTokenText() !== "'proto3'" || ctx.tokenStream.getCurrentTokenText() !== '"proto3"') {
            throw this._generateError(ctx, "Expected 'proto3' after 'syntax ='");
        }

        ctx.tokenStream.moveNext();
        if (ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon) {
            throw this._generateError(ctx, "Expected ';' after the statement");
        }
        let semicolon = ctx.tokenStream.getCurrentToken();
        let length = semicolon.start + semicolon.length - keywordToken.start;
        return new SyntaxNode(keywordToken.start, length, "proto3");
    }

    private _handlePackage(ctx: ParserContext): PackageNode {
        let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
        ctx.tokenStream.moveNext();

        let path = this._consumeFullIdentifier(ctx);
        if (ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon) {
            throw this._generateError(ctx, "Expected ';' after the statement");
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
            if (ctx.tokenStream.getCurrentToken().type !== TokenType.keyword) {
                throw this._generateError(ctx, "Expected file path or specific keyword after 'import'");
            }
            if (ctx.tokenStream.getCurrentTokenText() !== "public" && ctx.tokenStream.getCurrentTokenText() !== "weak") {
                throw this._generateError(ctx, "Expected file path or specific keyword after 'import'");
            }
            modifier = ctx.tokenStream.getCurrentTokenText();

            ctx.tokenStream.moveNext();
        }

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.string) {
            throw this._generateError(ctx, "Expected file path or specific keyword after 'import'");
        }
        let path = ctx.tokenStream.getCurrentTokenText();
        ctx.tokenStream.moveNext();

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon) {
            throw this._generateError(ctx, "Expected ';' after the statement");
        }
        let semicolon = ctx.tokenStream.getCurrentToken();
        let length = semicolon.start + semicolon.length - keywordToken.start;
        return new ImportNode(keywordToken.start, length, path, modifier);
    }

    private _handleOption(ctx: ParserContext): OptionNode {
        let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
        ctx.tokenStream.moveNext();

        let option = this._consumeOptionName(ctx);

        if (!((ctx.tokenStream.getCurrentToken().type === TokenType.operator) && (ctx.tokenStream.getCurrentTokenText() === "="))) {
            throw this._generateError(ctx, "Expected '=' after the option name");
        }
        ctx.tokenStream.moveNext();

        let value = this._consumeOptionValue(ctx);
        let valueType = value.type;

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon) {
            throw this._generateError(ctx, `Expected ';' after the statement, got ${ctx.tokenStream.getCurrentTokenText()}`);
        }

        let semicolon = ctx.tokenStream.getCurrentToken();
        let length = semicolon.start + semicolon.length - keywordToken.start;
        return new OptionNode(keywordToken.start, length, option, value, valueType);
    }

    private _handleEnum(ctx: ParserContext): EnumNode {
        let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
        ctx.tokenStream.moveNext();

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.identifier) {
            throw this._generateError(ctx, "Expected enum name after 'enum'");
        }

        let name = ctx.tokenStream.getCurrentTokenText();
        ctx.tokenStream.moveNext();

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.openBrace) {
            throw this._generateError(ctx, "Expected '{' after the enum name");
        }
        ctx.tokenStream.moveNext();

        let options: OptionNode[] = [];
        let values: EnumValueNode[] = [];
        while (ctx.tokenStream.getCurrentToken().type !== TokenType.closeBrace) {
            switch (ctx.tokenStream.getCurrentToken().type) {
                case TokenType.keyword: {
                    switch ((ctx.tokenStream.getCurrentToken() as KeywordToken).keyword) {
                        case KeywordType.option:
                            options.push(this._handleOption(ctx));
                            break;
                        // TODO reserved.
                    }

                    break;
                }

                case TokenType.identifier: {
                    values.push(this._handleEnumValue(ctx));
                    break;
                }

                case TokenType.semicolon: {
                    // empty statement
                    // TODO: add empty statement node?
                    break;
                }
            }
            ctx.tokenStream.moveNext();
        }

        const enumNode = new EnumNode(keywordToken.start, ctx.tokenStream.getCurrentToken().start, name, options, values);
        return enumNode;
    }

    private _handleEnumValue(ctx: ParserContext): EnumValueNode {
        let name = ctx.tokenStream.getCurrentTokenText();
        ctx.tokenStream.moveNext();

        if (!(ctx.tokenStream.getCurrentToken().type === TokenType.operator && ctx.tokenStream.getCurrentTokenText() === "=")) {
            throw this._generateError(ctx, "Expected '=' after the enum value name");
        }
        ctx.tokenStream.moveNext();

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.integer) {
            throw this._generateError(ctx, "Expected number after '='");
        }

        let value = (ctx.tokenStream.getCurrentToken() as IntegerToken).text;
        ctx.tokenStream.moveNext();

        if (ctx.tokenStream.getCurrentToken().type === TokenType.openBracket) {
            this._handleFieldOption(ctx);
            ctx.tokenStream.moveNext();
        }

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon) {
            throw this._generateError(ctx, "Expected ';' after the statement");
        }

        let semicolon = ctx.tokenStream.getCurrentToken();
        let length = semicolon.start + semicolon.length - ctx.tokenStream.getCurrentToken().start;

        // TODO: option
        return new EnumValueNode(ctx.tokenStream.getCurrentToken().start, length, name, value);
    }

    private _handleMessage(ctx: ParserContext): MessageNode {
        let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
        ctx.tokenStream.moveNext();

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.identifier) {
            throw this._generateError(ctx, "Expected message name after 'message'");
        }

        let name = ctx.tokenStream.getCurrentTokenText();
        ctx.tokenStream.moveNext();

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.openBrace) {
            throw this._generateError(ctx, "Expected '{' after the message name");
        }
        ctx.tokenStream.moveNext();

        let children: Node[] = [];
        let options: OptionNode[] = [];
        let fields: FieldNode[] = [];
        while (ctx.tokenStream.getCurrentToken().type !== TokenType.closeBrace) {
            switch (ctx.tokenStream.getCurrentToken().type) {
                case TokenType.keyword: {
                    switch ((ctx.tokenStream.getCurrentToken() as KeywordToken).keyword) {
                        case KeywordType.option:
                            options.push(this._handleOption(ctx));
                            break;
                        case KeywordType.message:
                            children.push(this._handleMessage(ctx));
                            break;
                        case KeywordType.enum:
                            children.push(this._handleEnum(ctx));
                            break;
                        case KeywordType.map:
                        case KeywordType.repeated:
                        case KeywordType.optional:
                            // TODO: required?
                            fields.push(this._handleField(ctx));
                            break;
                        case KeywordType.oneof:
                            break;

                        // TODO reserved.
                    }
                    break;
                }

                case TokenType.identifier:
                case TokenType.primitiveType: {
                    fields.push(this._handleField(ctx));
                    break;
                }

                case TokenType.semicolon: {
                    // empty statement
                    // TODO: add empty statement node?
                    break;
                }
            }
            ctx.tokenStream.moveNext();
        }

        const message = new MessageNode(keywordToken.start, ctx.tokenStream.getCurrentToken().start, name, fields, options);
        children.forEach(child => message.add(child));
        return message;
    }

    // Parse field like `int32 foo = 1;`.
    private _handleField(ctx: ParserContext): FieldNode {
        const consumeType = (ctx: ParserContext): string => {
            if (ctx.tokenStream.getCurrentToken().type === TokenType.primitiveType) {
                let token = ctx.tokenStream.getCurrentTokenText();
                ctx.tokenStream.moveNext();
                return token;
            } else if (ctx.tokenStream.getCurrentToken().type === TokenType.identifier) {
                const ident = this._consumeFullIdentifier(ctx);
                return ident;
            }
            throw this._generateError(ctx, "Expected type");
        };
        let modifier = "";
        let type_ = "";
        let startToken = ctx.tokenStream.getCurrentToken();

        if (ctx.tokenStream.getCurrentToken().type === TokenType.keyword) {
            switch ((ctx.tokenStream.getCurrentToken() as KeywordToken).keyword) {
                case KeywordType.map:
                    type_ = "map";
                    ctx.tokenStream.moveNext();

                    if (ctx.tokenStream.getCurrentToken().type !== TokenType.less) {
                        throw this._generateError(ctx, "Expected '<' after 'map'");
                    }
                    ctx.tokenStream.moveNext();
                    type_ += "<" + consumeType(ctx);

                    if (ctx.tokenStream.getCurrentToken().type !== TokenType.comma) {
                        throw this._generateError(ctx, "Expected ',' after the type");
                    }
                    ctx.tokenStream.moveNext();
                    type_ += "," + consumeType(ctx);

                    if (ctx.tokenStream.getCurrentToken().type !== TokenType.greater) {
                        throw this._generateError(ctx, "Expected '>' after the type");
                    }
                    type_ += ">";
                    ctx.tokenStream.moveNext();
                    break;
                case KeywordType.repeated:
                    ctx.tokenStream.moveNext();

                    modifier = "repeated";
                    type_ = consumeType(ctx);
                    break;

                case KeywordType.optional:
                    ctx.tokenStream.moveNext();

                    modifier = "optional";
                    type_ = consumeType(ctx);
                    break;
            }
        } else if (ctx.tokenStream.getCurrentToken().type === TokenType.primitiveType) {
            type_ = consumeType(ctx);
        } else if (ctx.tokenStream.getCurrentToken().type === TokenType.identifier) {
            type_ = consumeType(ctx);
        } else {
            throw this._generateError(ctx, "Expected field type");
        }

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.identifier) {
            throw this._generateError(ctx, "Expected field name");
        }
        let name = ctx.tokenStream.getCurrentTokenText();
        ctx.tokenStream.moveNext();

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.operator || ctx.tokenStream.getCurrentTokenText() !== "=") {
            throw this._generateError(ctx, "Expected '=' after the field name");
        }
        ctx.tokenStream.moveNext();

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.integer) {
            throw this._generateError(ctx, "Expected number after '='");
        }
        const fieldNumber = ctx.tokenStream.getCurrentTokenText();
        ctx.tokenStream.moveNext();

        let options: OptionNode[] = [];
        if (ctx.tokenStream.getCurrentToken().type === TokenType.openBracket) {
            options = this._handleFieldOption(ctx);
            ctx.tokenStream.moveNext();
        }

        if (ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon) {
            throw this._generateError(ctx, "Expected ';' after the field");
        }

        const field = new FieldNode(startToken.start, ctx.tokenStream.getCurrentToken().start, name, fieldNumber, type_, modifier, options);
        return field;
    }

    // Parse field options like `[(json_name) = "foo"]`.
    private _handleFieldOption(ctx: ParserContext): OptionNode[] {
        if (ctx.tokenStream.getCurrentToken().type !== TokenType.openBracket) {
            throw this._generateError(ctx, "Expected '[' after the field name");
        }
        ctx.tokenStream.moveNext();

        let options: OptionNode[] = [];
        while (ctx.tokenStream.getCurrentToken().type !== TokenType.closeBracket) {
            let startToken = ctx.tokenStream.getCurrentToken();
            let optionName = this._consumeOptionName(ctx);
            if (ctx.tokenStream.getCurrentToken().type !== TokenType.operator || ctx.tokenStream.getCurrentTokenText() !== "=") {
                throw this._generateError(ctx, "Expected '=' after the option name");
            }
            ctx.tokenStream.moveNext();

            let value = this._consumeOptionValue(ctx);
            let valueType = value.type;

            options.push(new OptionNode(startToken.start, value.start + value.length - startToken.start, optionName, value, valueType));

            if (ctx.tokenStream.getCurrentToken().type === TokenType.comma) {
                ctx.tokenStream.moveNext();
            } else if (ctx.tokenStream.getCurrentToken().type === TokenType.closeBracket) {
                continue;
            } else {
                throw this._generateError(ctx, "Expected ',' or ']' after the option value");
            }
        }

        return options;
    }

    private _consumeOptionName(ctx: ParserContext): string {
        let option = "";
        if (ctx.tokenStream.getCurrentToken().type === TokenType.openParenthesis) {
            ctx.tokenStream.moveNext();
            option = "(" + this._consumeFullIdentifier(ctx);

            if (ctx.tokenStream.getCurrentToken().type !== TokenType.closeParenthesis) {
                throw this._generateError(ctx, "Expected ')' after the option path");
            }
            option += ")";
            ctx.tokenStream.moveNext();
        } else if (ctx.tokenStream.getCurrentToken().type === TokenType.identifier) {
            option = this._consumeFullIdentifier(ctx);
        } else {
            throw this._generateError(ctx, "Expected option name after 'option'");
        }

        while (ctx.tokenStream.getCurrentToken().type === TokenType.dot) {
            option += ".";
            ctx.tokenStream.moveNext();
            if (ctx.tokenStream.getCurrentToken().type !== TokenType.identifier) {
                throw this._generateError(ctx, "Expected option name after '.'");
            }
            option += ctx.tokenStream.getCurrentTokenText();
            ctx.tokenStream.moveNext();
        }

        return option;
    }

    private _consumeOptionValue(ctx: ParserContext): Token {
        if (!([TokenType.string, TokenType.integer, TokenType.float, TokenType.boolean, TokenType.identifier].includes(ctx.tokenStream.getCurrentToken().type))) {
            throw this._generateError(ctx, `Expected option value after '=', got ${ctx.tokenStream.getCurrentTokenText()}`);
        }
        let value = ctx.tokenStream.getCurrentToken();
        ctx.tokenStream.moveNext();

        return value;
    }

    private _consumeFullIdentifier(ctx: ParserContext): string {
        let result = "";
        if (ctx.tokenStream.getCurrentToken().type !== TokenType.identifier) {
            throw this._generateError(ctx, `Expected name`);
        }
        result += ctx.tokenStream.getCurrentTokenText();
        ctx.tokenStream.moveNext();

        while (ctx.tokenStream.getCurrentToken().type === TokenType.dot) {
            if (ctx.tokenStream.getNextToken().type !== TokenType.identifier) {
                throw this._generateError(ctx, `Unexpected token in name`);
            }
            result += ctx.tokenStream.getCurrentTokenText();
            result += ctx.tokenStream.getNextTokenText();
            ctx.tokenStream.moveNext();
            ctx.tokenStream.moveNext();
        }

        return result;
    }

    private _generateError(ctx: ParserContext, message: string): Error {
        let token = ctx.tokenStream.getCurrentToken();
        let start = token.start;
        let line = 0;
        let column = 0;
        for (let length of ctx.tokenStream.text.split(/\r?\n/).map(line => line.length)) {
            if (start > length) {
                start -= length;
                line++;
            } else {
                column = start;
                break;
            }
        }

        return new Error(`Error at ${line}:${column}: ${message}`);
    }
}
