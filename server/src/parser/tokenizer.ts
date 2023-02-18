// tokenizer.ts is for tokenizing the input string into tokens.

import { Char, CharacterStream } from "./chstream";
import { Comment, Token } from "./tokens";


export interface TokenizerContext {
    chstream: CharacterStream;
    tokens: Token[];
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

        if (this._handleChar(ctx)) {
            ctx.chstream.moveNext();
        }
    }

    private _handleChar(ctx: TokenizerContext): boolean {
        switch (ctx.chstream.currentChar) {
            case Char.slash: {
                if (ctx.chstream.lookAhead(1) === Char.slash) {
                    this._handleSingleLineComment(ctx);
                } else if (ctx.chstream.lookAhead(1) === Char.asterisk) {
                    this._handleMultiLineComment(ctx);
                }
                return true;
            }
        }
        return false;
    }

    private _handleSingleLineComment(ctx: TokenizerContext) {
        let start = ctx.chstream.position;
        ctx.chstream.skipToLineBreak();

        const length = ctx.chstream.position - start;
        const comment = new Comment(start, length, false);
        ctx.tokens.push(comment);
    }

    private _handleMultiLineComment(ctx: TokenizerContext) {
        let start = ctx.chstream.position;
        while (!ctx.chstream.isEndOfStream()) {
            if (ctx.chstream.currentChar === Char.asterisk && ctx.chstream.lookAhead(1) === Char.slash) {
                ctx.chstream.advance(2);
                break;
            }
            ctx.chstream.moveNext();
        }

        const length = ctx.chstream.position - start;
        const comment = new Comment(start, length, true);
        ctx.tokens.push(comment);
    }
}
