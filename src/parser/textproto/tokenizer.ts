// tokenizer.ts is for tokenizing the input string into tokens.
// https://protobuf.dev/reference/protobuf/textformat-spec/
import Char from "typescript-char";

import { CharacterStream } from "../core/chstream";
import {
  canBeIdentifier,
  canBeStartIdentifier,
  isDecimal,
  isHex,
  isOctal,
} from "../core/utils";
import {
  BooleanToken,
  CloseBraceToken,
  CloseBracketToken,
  ColonToken,
  CommaToken,
  CommentToken,
  DotToken,
  FloatToken,
  GreaterToken,
  HyphenToken,
  IdentifierToken,
  IntegerToken,
  LessToken,
  OpenBraceToken,
  OpenBracketToken,
  SemicolonToken,
  SlashToken,
  StringToken,
  Token,
  TokenType,
} from "./tokens";

export interface TokenizerContext {
  tokens: Token[];

  chstream: CharacterStream;
}

export class TextProtoTokenizer {
  tokenize(input: string): Token[] {
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

  // Main processing function.
  private _handleChar(ctx: TokenizerContext) {
    switch (ctx.chstream.getCurrentChar()) {
      case Char.Hash: {
        this._handleSingleLineComment(ctx);
        return;
      }
      case Char.Slash: {
        ctx.tokens.push(new SlashToken(ctx.chstream.position));
        ctx.chstream.moveNext();
        return;
      }
      case Char.SingleQuote:
      case Char.DoubleQuote: {
        this._handleString(ctx);
        return;
      }
      case Char.OpenBrace: {
        ctx.tokens.push(new OpenBraceToken(ctx.chstream.position));
        ctx.chstream.moveNext();
        return;
      }
      case Char.CloseBrace: {
        ctx.tokens.push(new CloseBraceToken(ctx.chstream.position));
        ctx.chstream.moveNext();
        return;
      }
      case Char.OpenBracket: {
        ctx.tokens.push(new OpenBracketToken(ctx.chstream.position));
        ctx.chstream.moveNext();
        return;
      }
      case Char.CloseBracket: {
        ctx.tokens.push(new CloseBracketToken(ctx.chstream.position));
        ctx.chstream.moveNext();
        return;
      }
      case Char.Less: {
        ctx.tokens.push(new LessToken(ctx.chstream.position));
        ctx.chstream.moveNext();
        return;
      }
      case Char.Greater: {
        ctx.tokens.push(new GreaterToken(ctx.chstream.position));
        ctx.chstream.moveNext();
        return;
      }
      case Char.Colon: {
        ctx.tokens.push(new ColonToken(ctx.chstream.position));
        ctx.chstream.moveNext();
        return;
      }
      case Char.Semicolon: {
        ctx.tokens.push(new SemicolonToken(ctx.chstream.position));
        ctx.chstream.moveNext();
        return;
      }
      case Char.Comma: {
        ctx.tokens.push(new CommaToken(ctx.chstream.position));
        ctx.chstream.moveNext();
        return;
      }
      case Char.Hyphen: {
        ctx.tokens.push(new HyphenToken(ctx.chstream.position));
        ctx.chstream.moveNext();
        return;
      }
      case Char.Plus: {
        ctx.tokens.push(new HyphenToken(ctx.chstream.position));
        ctx.chstream.moveNext();
        return;
      }
      default: {
        if (this._canBeNumber(ctx)) {
          this._maybeHandleNumber(ctx);

          // After the number, there should be whitespace or non-identifier
          // char.
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

        // Dot should be handled after number because float literal can start
        // with dot.
        if (ctx.chstream.getCurrentChar() === Char.Period) {
          ctx.tokens.push(new DotToken(ctx.chstream.position));
          ctx.chstream.moveNext();
          return;
        }

        // booleans are also handled in _maybeHandleIdentifierAndKeyword,
        // since just checking for true/false is enough.
        if (this._maybeHandleIdentifierAndKeyword(ctx)) {
          return;
        }

        this._handleInvalid(ctx);
      }
    }
  }

  // Just skip to the end of line and create comment token.
  private _handleSingleLineComment(ctx: TokenizerContext) {
    let start = ctx.chstream.position;
    ctx.chstream.skipToLineBreak();

    const length = ctx.chstream.position - start;
    ctx.tokens.push(
      new CommentToken(
        start,
        length,
        ctx.chstream.text.substring(start, start + length)
      )
    );
  }

  // Handle single/double quoted string.
  private _handleString(ctx: TokenizerContext) {
    const firstQuote = ctx.chstream.getCurrentChar();
    let start = ctx.chstream.position;
    ctx.chstream.moveNext();

    while (!ctx.chstream.isEndOfStream()) {
      if (ctx.chstream.getCurrentChar() === firstQuote) {
        ctx.chstream.moveNext();
        break;
      }

      // handle escaped quote.
      if (
        ctx.chstream.getCurrentChar() === Char.Backslash &&
        ctx.chstream.getNextChar() === firstQuote
      ) {
        ctx.chstream.moveNext();
      }

      ctx.chstream.moveNext();
    }

    const length = ctx.chstream.position - start;
    ctx.tokens.push(
      new StringToken(
        start,
        length,
        ctx.chstream.text.substring(start, start + length)
      )
    );
  }

  private _canBeNumber(ctx: TokenizerContext): boolean {
    // NOTE: nan and inf are handled in _maybeHandleIdentifierAndKeyword.
    const ch = ctx.chstream.getCurrentChar();
    const nextchar = ctx.chstream.getNextChar();

    if (isDecimal(ch)) {
      return true;
    }

    if (ch === Char.Period && isDecimal(nextchar)) {
      return true;
    }

    return false;
  }

  // Handle integer, float, hex, octal, and decimal.
  private _maybeHandleNumber(ctx: TokenizerContext) {
    const start = ctx.chstream.position;

    if (ctx.chstream.getCurrentChar() === Char._0) {
      // hexLiteral
      if (
        ctx.chstream.getNextChar() === Char.x ||
        ctx.chstream.getNextChar() === Char.X
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
        return;
      }

      // octalLiteral
      if (isOctal(ctx.chstream.getNextChar())) {
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
        return;
      }
    }

    // float literal
    if (isDecimal(ctx.chstream.getCurrentChar())) {
      while (isDecimal(ctx.chstream.getCurrentChar())) {
        ctx.chstream.moveNext();
      }
    }

    // if next char is ., e, E or f, it's float.
    // otherwise it's integer.
    if (
      [Char.Period, Char.e, Char.E, Char.f].includes(
        ctx.chstream.getCurrentChar()
      )
    ) {
      // floatLiteral
      if (
        ctx.chstream.getCurrentChar() === Char.Period &&
        isDecimal(ctx.chstream.getNextChar())
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
      return;
    }

    // integer literal
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

    if (["nan", "inf"].includes(text.toLowerCase())) {
      ctx.tokens.push(new FloatToken(start, length, text));
    } else if (["true", "false"].includes(text)) {
      ctx.tokens.push(new BooleanToken(start, length, text));
    } else {
      ctx.tokens.push(new IdentifierToken(start, length, text));
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
