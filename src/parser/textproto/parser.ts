// Specification: https://protobuf.dev/reference/protobuf/textformat-spec/
import { TokenStream } from "../tokenstream";
import { CommentNode, DocumentNode, Node, ValueNode } from "./nodes";
import { TextProtoTokenizer } from "./tokenizer";
import { Token, TokenType } from "./tokens";

export interface ParserContext {
  tokenStream: TokenStream<Token>;
  document: DocumentNode;
  current: Node[];
}

const getCurrent = (ctx: ParserContext): Node =>
  ctx.current[ctx.current.length - 1];

// move next token and if it is a comment, add it to the current node, and
// continue to move next until it is not a comment.
const moveNext = (ctx: ParserContext) => {
  ctx.tokenStream.moveNext();
  if (ctx.tokenStream.getCurrentToken().type === TokenType.comment) {
    let comment = new CommentNode(
      ctx.tokenStream.getCurrentToken().start,
      ctx.tokenStream.getCurrentToken().start +
        ctx.tokenStream.getCurrentToken().length
    );
    comment.setParent(getCurrent(ctx));
    getCurrent(ctx).add(comment);
    ctx.tokenStream.moveNext();

    while (ctx.tokenStream.getCurrentToken().type === TokenType.comment) {
      comment.end =
        ctx.tokenStream.getCurrentToken().start +
        ctx.tokenStream.getCurrentToken().length;
      ctx.tokenStream.moveNext();
    }
  }
};

export class TextProtoParser {
  private tokenizer: TextProtoTokenizer;

  constructor() {
    this.tokenizer = new TextProtoTokenizer();
  }

  parse(text: string): DocumentNode {
    let tokens = this.tokenizer.tokenize(text);
    let document = new DocumentNode(0, text.length);

    if (tokens.length === 0) {
      return document;
    }

    let ctx = {
      tokenStream: new TokenStream(text, tokens),
      document: document,
      current: [document],
    };

    this._parse(ctx);
    return document;
  }

  private _parse(ctx: ParserContext) {
    do {
      this._handleValue(ctx);
      if (ctx.tokenStream.isEndOfStream()) {
        break;
      }
      moveNext(ctx);
    } while (true);
  }

  private _handleValue(ctx: ParserContext) {
    let nameStartToken = ctx.tokenStream.getCurrentToken();
    let nameText = "";

    if (ctx.tokenStream.getCurrentToken().type === TokenType.identifier) {
      nameText = ctx.tokenStream.getCurrentTokenText();
    } else if (
      ctx.tokenStream.getCurrentToken().type === TokenType.openBracket
    ) {
      // Extension. e.g. [com.example.ext_field], [com.example/ExtMessage]
      moveNext(ctx);
      while (
        ctx.tokenStream.getCurrentToken().type !== TokenType.closeBracket
      ) {
        if (ctx.tokenStream.getCurrentToken().type !== TokenType.identifier) {
          throw this._generateError(
            ctx,
            `Expected identifier, but got ${ctx.tokenStream.getCurrentTokenText()}`
          );
        }
        nameText += ctx.tokenStream.getCurrentTokenText();
        moveNext(ctx);

        if (ctx.tokenStream.getCurrentToken().type === TokenType.dot) {
          nameText += ".";
          moveNext(ctx);
        } else if (ctx.tokenStream.getCurrentToken().type === TokenType.slash) {
          nameText += "/";
          moveNext(ctx);
        } else if (
          ctx.tokenStream.getCurrentToken().type !== TokenType.closeBracket
        ) {
          throw this._generateError(
            ctx,
            `Expected close bracket, but got ${ctx.tokenStream.getCurrentTokenText()}`
          );
        }
      }
    } else {
      throw this._generateError(
        ctx,
        `Expected identifier, but got ${ctx.tokenStream.getCurrentTokenText()}`
      );
    }
    moveNext(ctx);

    let node = new ValueNode(nameText, nameStartToken.start, 0);
    getCurrent(ctx).add(node);
    node.setParent(getCurrent(ctx));
    ctx.current.push(node);

    const handleNested = (lastTokenType: TokenType) => {
      // recursive, message type
      node.setNested(true);
      moveNext(ctx);

      while (ctx.tokenStream.getCurrentToken().type !== lastTokenType) {
        this._handleValue(ctx);
        moveNext(ctx);
      }
    };

    if (ctx.tokenStream.getCurrentToken().type === TokenType.colon) {
      moveNext(ctx);

      if (ctx.tokenStream.getCurrentToken().type === TokenType.openBrace) {
        handleNested(TokenType.closeBrace);
      } else if (ctx.tokenStream.getCurrentToken().type === TokenType.less) {
        handleNested(TokenType.greater);
      } else {
        // value
        if (
          ![
            TokenType.string,
            TokenType.integer,
            TokenType.float,
            TokenType.boolean,
            TokenType.identifier,
          ].includes(ctx.tokenStream.getCurrentToken().type)
        ) {
          throw this._generateError(
            ctx,
            `Expected value, but got ${ctx.tokenStream.getCurrentTokenText()}`
          );
        }

        if (ctx.tokenStream.getCurrentToken().type === TokenType.string) {
          // handle successive strings as one string
          while (
            ctx.tokenStream.getNextToken() !== undefined &&
            ctx.tokenStream.getNextToken().type === TokenType.string
          ) {
            moveNext(ctx);
          }
        }
      }
    } else if (ctx.tokenStream.getCurrentToken().type === TokenType.openBrace) {
      handleNested(TokenType.closeBrace);
    } else if (ctx.tokenStream.getCurrentToken().type === TokenType.less) {
      handleNested(TokenType.greater);
    } else {
      throw this._generateError(
        ctx,
        `Expected colon, but got ${ctx.tokenStream.getCurrentTokenText()}`
      );
    }

    if (
      ctx.tokenStream.getNextToken() !== undefined &&
      ctx.tokenStream.getNextToken().type === TokenType.comma
    ) {
      // skip last comma
      moveNext(ctx);
    }
    node.end =
      ctx.tokenStream.getCurrentToken().start +
      ctx.tokenStream.getCurrentToken().length;
    ctx.current.pop();
  }

  private _generateError(ctx: ParserContext, message: string): Error {
    let token = ctx.tokenStream.getCurrentToken();
    let column = 1;
    let line = 1;

    for (let i = 0; i < token.start; i++) {
      if (ctx.tokenStream.text[i] === "\n") {
        column = 1;
        line++;
        continue;
      }
      column++;
    }

    return new Error(`Error at ${line}:${column}: ${message}`);
  }
}
