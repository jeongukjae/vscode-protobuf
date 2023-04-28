// tokenizer.ts is for tokenizing the input string into tokens.
// https://protobuf.dev/reference/protobuf/textformat-spec/
import Char from "typescript-char";

import { CharacterStream } from "../chstream";
import {
  canBeIdentifier,
  canBeStartIdentifier,
  isDecimal,
  isHex,
  isOctal,
} from "../utils";
import {
  BooleanToken,
  Comment,
  FloatToken,
  IntegerToken,
  Token,
  TokenType,
} from "./tokens";

export interface TokenizerContext {
  tokens: Token[];

  chstream: CharacterStream;
}

export class TextProtoTokenizer {
  tokenize(input: string, start?: number, length?: number): Token[] {
    start = start || 0;
    length = length || input.length;

    if (
      start < 0 ||
      length < 0 ||
      start > input.length ||
      start + length > input.length
    ) {
      throw new Error("Invalid start or length");
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
      case Char.Hash: {
        this._handleSingleLineComment(ctx);
        return;
      }
      case Char.Slash: {
        ctx.tokens.push(
          Token.create(TokenType.slash, ctx.chstream.position, 1)
        );
        ctx.chstream.moveNext();
        return;
      }
      case Char.SingleQuote:
      case Char.DoubleQuote: {
        this._handleString(ctx);
        return;
      }
      case Char.OpenBrace: {
        ctx.tokens.push(
          Token.create(TokenType.openBrace, ctx.chstream.position, 1)
        );
        ctx.chstream.moveNext();
        return;
      }
      case Char.CloseBrace: {
        ctx.tokens.push(
          Token.create(TokenType.closeBrace, ctx.chstream.position, 1)
        );
        ctx.chstream.moveNext();
        return;
      }
      case Char.OpenBracket: {
        ctx.tokens.push(
          Token.create(TokenType.openBracket, ctx.chstream.position, 1)
        );
        ctx.chstream.moveNext();
        return;
      }
      case Char.CloseBracket: {
        ctx.tokens.push(
          Token.create(TokenType.closeBracket, ctx.chstream.position, 1)
        );
        ctx.chstream.moveNext();
        return;
      }
      case Char.Less: {
        ctx.tokens.push(Token.create(TokenType.less, ctx.chstream.position, 1));
        ctx.chstream.moveNext();
        return;
      }
      case Char.Greater: {
        ctx.tokens.push(
          Token.create(TokenType.greater, ctx.chstream.position, 1)
        );
        ctx.chstream.moveNext();
        return;
      }
      case Char.Colon: {
        ctx.tokens.push(
          Token.create(TokenType.colon, ctx.chstream.position, 1)
        );
        ctx.chstream.moveNext();
        return;
      }
      case Char.Semicolon: {
        ctx.tokens.push(
          Token.create(TokenType.semicolon, ctx.chstream.position, 1)
        );
        ctx.chstream.moveNext();
        return;
      }
      case Char.Comma: {
        ctx.tokens.push(
          Token.create(TokenType.comma, ctx.chstream.position, 1)
        );
        ctx.chstream.moveNext();
        return;
      }
      default: {
        if (this._canBeNumber(ctx)) {
          if (this._maybeHandleNumber(ctx)) {
            if (
              !(
                ctx.chstream.isEndOfStream() ||
                ctx.chstream.isAtWhitespace() ||
                !canBeStartIdentifier(ctx.chstream.getCurrentChar())
              )
            ) {
              throw this._generateError(
                ctx,
                "Invalid number. whitespace expected"
              );
            }
            return;
          }
        }

        // Dot should be handled after number because float literal can start
        // with dot.
        if (ctx.chstream.getCurrentChar() === Char.Period) {
          ctx.tokens.push(
            Token.create(TokenType.dot, ctx.chstream.position, 1)
          );
          ctx.chstream.moveNext();
          return;
        }

        // just single hyphen. (when it is not part of number)
        if (ctx.chstream.getCurrentChar() === Char.Hyphen) {
          ctx.tokens.push(
            Token.create(TokenType.hyphen, ctx.chstream.position, 1)
          );
          ctx.chstream.moveNext();
          return;
        }

        // true, and false are handled in _maybeHandleIdentifierAndKeyword.
        if (this._maybeHandleIdentifierAndKeyword(ctx)) {
          return;
        }

        this._handleInvalid(ctx);
      }
    }
  }

  private _handleSingleLineComment(ctx: TokenizerContext) {
    let start = ctx.chstream.position;
    ctx.chstream.skipToLineBreak();

    const length = ctx.chstream.position - start;
    const comment = new Comment(
      start,
      length,
      ctx.chstream.text.substring(start, start + length)
    );
    ctx.tokens.push(comment);
  }

  private _handleString(ctx: TokenizerContext) {
    const quote = ctx.chstream.getCurrentChar();
    let start = ctx.chstream.position;
    ctx.chstream.moveNext();

    while (!ctx.chstream.isEndOfStream()) {
      if (ctx.chstream.getCurrentChar() === quote) {
        ctx.chstream.moveNext();
        break;
      }
      if (
        ctx.chstream.getCurrentChar() === Char.Backslash &&
        ctx.chstream.nextChar === quote
      ) {
        ctx.chstream.moveNext();
      }
      ctx.chstream.moveNext();
    }

    const length = ctx.chstream.position - start;
    ctx.tokens.push(Token.create(TokenType.string, start, length));
  }

  private _canBeNumber(ctx: TokenizerContext): boolean {
    const charCanBeNumber = (
      chstream: CharacterStream,
      offset: number
    ): boolean => {
      const ch = chstream.lookAhead(offset);
      const nextchar = chstream.lookAhead(offset + 1);

      if (isDecimal(ch)) {
        return true;
      }

      if (ch === Char.Period && isDecimal(nextchar)) {
        return true;
      }

      const next2char = chstream.lookAhead(offset + 2);
      const next3char = chstream.lookAhead(offset + 3);

      if (
        ch === Char.i &&
        nextchar === Char.n &&
        next2char === Char.f &&
        !canBeIdentifier(next3char)
      ) {
        return true;
      }

      if (
        ch === Char.n &&
        nextchar === Char.a &&
        next2char === Char.n &&
        !canBeIdentifier(next3char)
      ) {
        return true;
      }

      return false;
    };

    if (charCanBeNumber(ctx.chstream, 0)) {
      return true;
    }

    if (
      ctx.chstream.getCurrentChar() === Char.Hyphen ||
      ctx.chstream.getCurrentChar() === Char.Plus
    ) {
      if (charCanBeNumber(ctx.chstream, 1)) {
        return true;
      }
    }

    return false;
  }

  private _maybeHandleNumber(ctx: TokenizerContext): boolean {
    const start = ctx.chstream.position;

    if (
      ctx.chstream.getCurrentChar() === Char.Hyphen ||
      ctx.chstream.getCurrentChar() === Char.Plus
    ) {
      ctx.chstream.moveNext();
    }

    if (
      ctx.chstream.getCurrentChar() === Char.i &&
      ctx.chstream.nextChar === Char.n &&
      ctx.chstream.lookAhead(2) === Char.f
    ) {
      ctx.chstream.advance(3);
      ctx.tokens.push(
        new FloatToken(
          start,
          ctx.chstream.position - start,
          ctx.chstream.text.substring(start, ctx.chstream.position)
        )
      );
      return true;
    }

    if (
      ctx.chstream.getCurrentChar() === Char.n &&
      ctx.chstream.nextChar === Char.a &&
      ctx.chstream.lookAhead(2) === Char.n
    ) {
      ctx.chstream.advance(3);
      ctx.tokens.push(
        new FloatToken(
          start,
          ctx.chstream.position - start,
          ctx.chstream.text.substring(start, ctx.chstream.position)
        )
      );
      return true;
    }

    if (ctx.chstream.getCurrentChar() === Char._0) {
      // hexLiteral
      if (
        (ctx.chstream.nextChar === Char.x ||
          ctx.chstream.nextChar === Char.X) &&
        isHex(ctx.chstream.lookAhead(2))
      ) {
        ctx.chstream.advance(2);
        while (isHex(ctx.chstream.getCurrentChar())) {
          ctx.chstream.moveNext();
        }
        ctx.tokens.push(
          new IntegerToken(
            start,
            ctx.chstream.position - start,
            ctx.chstream.text.substring(start, ctx.chstream.position),
            16
          )
        );
        return true;
      }

      // octalLiteral
      if (isOctal(ctx.chstream.nextChar)) {
        ctx.chstream.moveNext();
        while (isOctal(ctx.chstream.getCurrentChar())) {
          ctx.chstream.moveNext();
        }
        ctx.tokens.push(
          new IntegerToken(
            start,
            ctx.chstream.position - start,
            ctx.chstream.text.substring(start, ctx.chstream.position),
            8
          )
        );
        return true;
      }
    }

    // decimalLiteral
    if (isDecimal(ctx.chstream.getCurrentChar())) {
      while (isDecimal(ctx.chstream.getCurrentChar())) {
        ctx.chstream.moveNext();
      }

      // if next char is not ., e, E or f, it's decimalLiteral
      if (
        ctx.chstream.getCurrentChar() !== Char.Period &&
        ctx.chstream.getCurrentChar() !== Char.e &&
        ctx.chstream.getCurrentChar() !== Char.E &&
        ctx.chstream.getCurrentChar() !== Char.f
      ) {
        ctx.tokens.push(
          new IntegerToken(
            start,
            ctx.chstream.position - start,
            ctx.chstream.text.substring(start, ctx.chstream.position),
            10
          )
        );
        return true;
      }
    }

    // floatLiteral
    if (
      ctx.chstream.getCurrentChar() === Char.Period &&
      isDecimal(ctx.chstream.nextChar)
    ) {
      ctx.chstream.moveNext();
      while (isDecimal(ctx.chstream.getCurrentChar())) {
        ctx.chstream.moveNext();
      }
    }

    if (
      ctx.chstream.getCurrentChar() === Char.e ||
      ctx.chstream.getCurrentChar() === Char.E
    ) {
      ctx.chstream.moveNext();
      if (
        ctx.chstream.getCurrentChar() === Char.Plus ||
        ctx.chstream.getCurrentChar() === Char.Hyphen
      ) {
        ctx.chstream.moveNext();
      }
      while (isDecimal(ctx.chstream.getCurrentChar())) {
        ctx.chstream.moveNext();
      }
    }

    if (ctx.chstream.getCurrentChar() === Char.f) {
      ctx.chstream.moveNext();
    }

    ctx.tokens.push(
      new FloatToken(
        start,
        ctx.chstream.position - start,
        ctx.chstream.text.substring(start, ctx.chstream.position)
      )
    );
    return true;
  }

  private _maybeHandleIdentifierAndKeyword(ctx: TokenizerContext): boolean {
    const start = ctx.chstream.position;
    if (!canBeStartIdentifier(ctx.chstream.getCurrentChar())) {
      return false;
    }

    ctx.chstream.moveNext();
    while (canBeIdentifier(ctx.chstream.getCurrentChar())) {
      ctx.chstream.moveNext();
    }

    const length = ctx.chstream.position - start;
    const text = ctx.chstream.text.substring(start, start + length);

    if (text === "nan") {
      ctx.tokens.push(new FloatToken(start, length, text));
    } else if (text === "inf") {
      ctx.tokens.push(new FloatToken(start, length, text));
    } else if (text === "true") {
      ctx.tokens.push(new BooleanToken(start, length, text));
    } else if (text === "false") {
      ctx.tokens.push(new BooleanToken(start, length, text));
    } else {
      ctx.tokens.push(Token.create(TokenType.identifier, start, length));
    }

    return true;
  }

  private _handleInvalid(ctx: TokenizerContext): boolean {
    ctx.tokens.push(Token.create(TokenType.invalid, ctx.chstream.position, 1));
    ctx.chstream.moveNext();
    return true;
  }

  private _generateError(ctx: TokenizerContext, message: string): Error {
    let column = 1;
    let line = 1;

    for (let i = 0; i < ctx.chstream.position; i++) {
      if (ctx.chstream.text[i] === "\n") {
        column = 1;
        line++;
        continue;
      }
      column++;
    }

    return new Error(`Error at ${line}:${column}: ${message}`);
  }
}
