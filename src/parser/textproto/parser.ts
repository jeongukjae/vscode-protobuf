import { TokenStream } from "../tokenstream";
import { CommentNode, DocumentNode, Node } from "./nodes";
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
    if (ctx.tokenStream.getCurrentToken().type !== TokenType.identifier) {
      throw this._generateError(
        ctx,
        `Expected identifier, but got ${ctx.tokenStream.getCurrentToken().type}`
      );
    }

    // TODO: handle value
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
