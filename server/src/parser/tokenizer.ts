// tokenizer.ts is for tokenizing the input string into tokens.

import { CharacterStream } from "./chstream";
import { Comment, FloatToken, IntegerToken, Token, TokenType } from "./tokens";
import { isDecimal, isHex, isOctal } from "./utils";
import Char from 'typescript-char';


export interface TokenizerContext {
    tokens: Token[];

    chstream: CharacterStream;
}

export class Proto3Tokenizer {
    tokenize(input: string, start?: number, length?: number): Token[] {
        start = start || 0;
        length = length || input.length;

        if (start < 0 || length < 0 || start > input.length || start + length > input.length) {
            throw new Error('Invalid start or length');
        }
        if (!(start === 0 && length === input.length)) {
            // TODO: substr start ~ start+length?
            input = input.substring(0, start + length);
        }

        let ctx: TokenizerContext = {
            chstream: new CharacterStream(input),
            tokens: [],
        };

        while (!ctx.chstream.isEndOfStream()) {
            this._handleToken(ctx);
        }

        return ctx.tokens;
    }

    private _handleToken(ctx: TokenizerContext) {
        ctx.chstream.skipWhitespace();

        if (ctx.chstream.isEndOfStream()) {
            return;
        }

        this._handleChar(ctx);
    }

    private _handleChar(ctx: TokenizerContext) {
        switch (ctx.chstream.getCurrentChar()) {
            case Char.Slash: {
                if (ctx.chstream.nextChar === Char.Slash) {
                    this._handleSingleLineComment(ctx);
                } else if (ctx.chstream.nextChar === Char.Asterisk) {
                    this._handleMultiLineComment(ctx);
                }
                return;
            }
            case Char.OpenParenthesis: {
                ctx.tokens.push(Token.create(TokenType.openParenthesis, ctx.chstream.position, 1));
                ctx.chstream.moveNext();
                return;
            }
            case Char.CloseParenthesis: {
                ctx.tokens.push(Token.create(TokenType.closeParenthesis, ctx.chstream.position, 1));
                ctx.chstream.moveNext();
                return;
            }
            case Char.OpenBrace: {
                ctx.tokens.push(Token.create(TokenType.openBrace, ctx.chstream.position, 1));
                ctx.chstream.moveNext();
                return;
            }
            case Char.CloseBrace: {
                ctx.tokens.push(Token.create(TokenType.closeBrace, ctx.chstream.position, 1));
                ctx.chstream.moveNext();
                return;
            }
            default: {
                if (this._canBeNumber(ctx)) {
                    if (this._maybeHandleNumber(ctx)) {
                        return;
                    }
                }
            }
        }
    }

    private _handleSingleLineComment(ctx: TokenizerContext) {
        let start = ctx.chstream.position;
        ctx.chstream.skipToLineBreak();

        const length = ctx.chstream.position - start;
        const comment = new Comment(start, length, false, ctx.chstream.text.substring(start, start + length));
        ctx.tokens.push(comment);
    }

    private _handleMultiLineComment(ctx: TokenizerContext) {
        let start = ctx.chstream.position;
        ctx.chstream.advance(2); // to prevent "/*/"
        while (!ctx.chstream.isEndOfStream()) {
            if (ctx.chstream.getCurrentChar() === Char.Asterisk && ctx.chstream.nextChar === Char.Slash) {
                ctx.chstream.advance(2);
                break;
            }
            ctx.chstream.moveNext();
        }

        const length = ctx.chstream.position - start;
        const comment = new Comment(start, length, true, ctx.chstream.text.substring(start, start + length));
        ctx.tokens.push(comment);
    }

    private _canBeNumber(ctx: TokenizerContext): boolean {
        const charCanBeNumber = (ch: number, nextchar: number) => {
            if (isDecimal(ch)) {
                return true;
            }

            if (ch === Char.Period && isDecimal(nextchar)) {
                return true;
            }
        };

        if (charCanBeNumber(ctx.chstream.getCurrentChar(), ctx.chstream.nextChar)) {
            return true;
        }

        if (ctx.chstream.getCurrentChar() === Char.Hyphen || ctx.chstream.getCurrentChar() === Char.Plus) {
            if (charCanBeNumber(ctx.chstream.nextChar, ctx.chstream.lookAhead(2))) {
                return true;
            }
        }

        return false;
    }

    private _maybeHandleNumber(ctx: TokenizerContext): boolean {
        // https://protobuf.dev/reference/protobuf/proto3-spec/#integer_literals
        const start = ctx.chstream.position;

        if (ctx.chstream.getCurrentChar() === Char.Hyphen || ctx.chstream.getCurrentChar() === Char.Plus) {
            ctx.chstream.moveNext();
        }

        if (ctx.chstream.getCurrentChar() === Char._0) {
            // hexLiteral
            if ((ctx.chstream.nextChar === Char.x || ctx.chstream.nextChar === Char.X) && isHex(ctx.chstream.lookAhead(2))) {
                ctx.chstream.advance(2);
                while (isHex(ctx.chstream.getCurrentChar())) {
                    ctx.chstream.moveNext();
                }
                ctx.tokens.push(new IntegerToken(start, ctx.chstream.position - start, ctx.chstream.text.substring(start, ctx.chstream.position), 16));
                return true;
            }

            // octalLiteral
            if (isOctal(ctx.chstream.nextChar)) {
                ctx.chstream.moveNext();
                while (isOctal(ctx.chstream.getCurrentChar())) {
                    ctx.chstream.moveNext();
                }
                ctx.tokens.push(new IntegerToken(start, ctx.chstream.position - start, ctx.chstream.text.substring(start, ctx.chstream.position), 8));
                return true;
            }
        }

        // decimalLiteral
        if (isDecimal(ctx.chstream.getCurrentChar())) {
            while (isDecimal(ctx.chstream.getCurrentChar())) {
                ctx.chstream.moveNext();
            }

            // if next char is not . or e or E, it's decimalLiteral
            if (ctx.chstream.getCurrentChar() !== Char.Period && ctx.chstream.getCurrentChar() !== Char.e && ctx.chstream.getCurrentChar() !== Char.E) {
                ctx.tokens.push(new IntegerToken(start, ctx.chstream.position - start, ctx.chstream.text.substring(start, ctx.chstream.position), 10));
                return true;
            }
        }

        // floatLiteral
        if (ctx.chstream.getCurrentChar() === Char.Period && isDecimal(ctx.chstream.nextChar)) {
            ctx.chstream.moveNext();
            while (isDecimal(ctx.chstream.getCurrentChar())) {
                ctx.chstream.moveNext();
            }
        }

        if (ctx.chstream.getCurrentChar() === Char.e || ctx.chstream.getCurrentChar() === Char.E) {
            ctx.chstream.moveNext();
            if (ctx.chstream.getCurrentChar() === Char.Plus || ctx.chstream.getCurrentChar() === Char.Hyphen) {
                ctx.chstream.moveNext();
            }
            while (isDecimal(ctx.chstream.getCurrentChar())) {
                ctx.chstream.moveNext();
            }
        }

        ctx.tokens.push(new FloatToken(start, ctx.chstream.position - start, ctx.chstream.text.substring(start, ctx.chstream.position)));
        return true;
    }
}
