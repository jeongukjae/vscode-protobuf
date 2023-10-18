// Specification: https://protobuf.dev/reference/protobuf/textformat-spec/
import { TokenStream } from "../core/tokenstream";
import {
  CommentNode,
  DocumentNode,
  Node,
  NodeType,
  FieldNode,
  KeyNode,
  ValueNode,
} from "./nodes";
import { TextProtoTokenizer } from "./tokenizer";
import { CommentToken, Token, TokenType } from "./tokens";

export interface ParserContext {
  text: string;
  tokenStream: TokenStream<Token>;
  document: DocumentNode;
  current: Node[]; // We need current to be a stack to track nested fields.
}

const getCurrent = (ctx: ParserContext): Node =>
  ctx.current[ctx.current.length - 1];

const getLastChild = (node: Node): Node | undefined => {
  if (node.children.length > 0) {
    return node.children[node.children.length - 1];
  }
  return undefined;
};

// move next token and if it is a comment, add it to the current node, and
// continue to move next until it is not a comment.
const moveNext = (ctx: ParserContext) => {
  ctx.tokenStream.moveNext();

  while (ctx.tokenStream.getCurrentToken().type === TokenType.comment) {
    const lastChild = getLastChild(getCurrent(ctx));
    if (lastChild !== undefined && lastChild.type === NodeType.comment) {
      // Extend the last comment.
      let comment = lastChild as CommentNode;
      comment.tokens.push(ctx.tokenStream.getCurrentToken());
    } else {
      // Add a new comment.
      getCurrent(ctx).add(
        new CommentNode([ctx.tokenStream.getCurrentToken() as CommentToken])
      );
    }

    if (ctx.tokenStream.isEndOfStream()) {
      break;
    } else {
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
    let document = new DocumentNode(tokens);

    if (tokens.length === 0) {
      return document;
    }

    let ctx = {
      text: text,
      tokenStream: new TokenStream(text, tokens),
      document: document,
      current: [document],
    };

    this._parse(ctx);
    return document;
  }

  private _parse(ctx: ParserContext) {
    do {
      // In the root level, we can only have comments and fields.
      switch (ctx.tokenStream.getCurrentToken().type) {
        case TokenType.comment:
          let comment = new CommentNode([
            ctx.tokenStream.getCurrentToken() as CommentToken,
          ]);
          getCurrent(ctx).add(comment);
          break;

        default:
          this._handleField(ctx);
      }

      if (!ctx.tokenStream.isEndOfStream()) {
        moveNext(ctx);
      }
    } while (!ctx.tokenStream.isEndOfStream());
  }

  private _handleField(ctx: ParserContext) {
    let fieldNode = new FieldNode();
    getCurrent(ctx).add(fieldNode);
    ctx.current.push(fieldNode);

    let startTokenIndex = ctx.tokenStream.position;
    let startToken = ctx.tokenStream.getCurrentToken();

    // Construct KeyNode.
    if (startToken.type === TokenType.identifier) {
      const keyNode = new KeyNode([startToken]);
      fieldNode.setKey(keyNode);
    } else if (startToken.type === TokenType.openBracket) {
      // Extension. e.g. [com.example.ext_field], [com.example/ExtMessage]
      const keyNode = new KeyNode([startToken]);
      fieldNode.setKey(keyNode);

      ctx.tokenStream.moveNext();
      while (
        ctx.tokenStream.getCurrentToken().type !== TokenType.closeBracket
      ) {
        if (ctx.tokenStream.getCurrentToken().type !== TokenType.identifier) {
          throw this._generateError(
            ctx,
            `Expected identifier, but got ${ctx.tokenStream.getCurrentTokenText()}`
          );
        }
        keyNode.tokens.push(ctx.tokenStream.getCurrentToken());
        ctx.tokenStream.moveNext();

        if (ctx.tokenStream.getCurrentToken().type === TokenType.dot) {
          keyNode.tokens.push(ctx.tokenStream.getCurrentToken());
          ctx.tokenStream.moveNext();
        } else if (ctx.tokenStream.getCurrentToken().type === TokenType.slash) {
          keyNode.tokens.push(ctx.tokenStream.getCurrentToken());
          ctx.tokenStream.moveNext();
        } else if (
          ctx.tokenStream.getCurrentToken().type !== TokenType.closeBracket
        ) {
          throw this._generateError(
            ctx,
            `Expected close bracket, but got ${ctx.tokenStream.getCurrentTokenText()}`
          );
        }
      }
      keyNode.tokens.push(ctx.tokenStream.getCurrentToken()); // close bracket
    } else {
      throw this._generateError(
        ctx,
        `Expected identifier, but got ${ctx.tokenStream.getCurrentTokenText()}`
      );
    }

    moveNext(ctx);

    // Construct ValueNode.
    let valueStartTokenIndex = ctx.tokenStream.position;
    const valueNode = new ValueNode();
    fieldNode.setValue(valueNode);
    ctx.current.push(valueNode);

    switch (ctx.tokenStream.getCurrentToken().type) {
      // scalar or message field.
      case TokenType.colon: {
        moveNext(ctx);
        valueStartTokenIndex += 1;

        if (ctx.tokenStream.getCurrentToken().type === TokenType.openBracket) {
          this._handleRepeated(ctx);
        } else {
          this._handleValue(ctx);
        }
        break;
      }

      // message field.
      case TokenType.openBrace:
        this._handleNested(ctx, TokenType.closeBrace);
        break;

      // message field.
      case TokenType.less:
        this._handleNested(ctx, TokenType.greater);
        break;

      // repeated message field.
      case TokenType.openBracket:
        this._handleRepeated(ctx);
        break;

      default:
        throw this._generateError(
          ctx,
          "Expected colon, open brace, open bracket or less token, " +
            `but got ${ctx.tokenStream.getCurrentTokenText()}`
        );
    }

    valueNode.tokens = ctx.tokenStream.tokens.slice(
      valueStartTokenIndex,
      ctx.tokenStream.position + 1
    );
    ctx.current.pop();

    // skip last comma or semicolon
    if (
      !ctx.tokenStream.isEndOfStream() &&
      (ctx.tokenStream.getNextToken().type === TokenType.comma ||
        ctx.tokenStream.getNextToken().type === TokenType.semicolon)
    ) {
      moveNext(ctx);
    }

    fieldNode.tokens = ctx.tokenStream.tokens.slice(
      startTokenIndex,
      ctx.tokenStream.position + 1
    );
    ctx.current.pop();
  }

  private _handleValue(ctx: ParserContext) {
    if (ctx.tokenStream.getCurrentToken().type === TokenType.openBrace) {
      this._handleNested(ctx, TokenType.closeBrace);
    } else if (ctx.tokenStream.getCurrentToken().type === TokenType.less) {
      this._handleNested(ctx, TokenType.greater);
    } else if (
      [TokenType.hyphen, TokenType.plus].includes(
        ctx.tokenStream.getCurrentToken().type
      )
    ) {
      // with value (float or integer)
      ctx.tokenStream.moveNext();

      if (
        ![TokenType.float, TokenType.integer].includes(
          ctx.tokenStream.getCurrentToken().type
        )
      ) {
        throw this._generateError(
          ctx,
          `Expected number, but got ${ctx.tokenStream.getCurrentTokenText()}`
        );
      }
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
          ctx.tokenStream.moveNext();
        }
      }
    }
  }

  // NOTE: lastTokenType should be passed. It can be either closeBrace (}) or
  // greater (>).
  private _handleNested(ctx: ParserContext, lastTokenType: TokenType) {
    moveNext(ctx);

    while (ctx.tokenStream.getCurrentToken().type !== lastTokenType) {
      this._handleField(ctx);
      moveNext(ctx);
    }
  }

  private _handleRepeated(ctx: ParserContext) {
    moveNext(ctx);

    while (ctx.tokenStream.getCurrentToken().type !== TokenType.closeBracket) {
      this._handleValue(ctx);
      moveNext(ctx);

      if (ctx.tokenStream.getCurrentToken().type === TokenType.comma) {
        moveNext(ctx);
      } else if (
        ctx.tokenStream.getCurrentToken().type !== TokenType.closeBracket
      ) {
        throw this._generateError(
          ctx,
          "Expected close bracket, " +
            `but got ${ctx.tokenStream.getCurrentTokenText()}`
        );
      }
    }
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
