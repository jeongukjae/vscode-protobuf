// TODO: currently, cannot parse or add comments node.
// TODO: currently, cannot parse rpc node.
import {
  CommentNode,
  DocumentNode,
  ImportNode,
  MessageNode,
  Node,
  OptionNode,
  PackageNode,
  SyntaxNode,
  FieldNode,
  EnumNode,
  EnumValueNode,
  OneofNode,
} from "./nodes";
import { Proto3Tokenizer } from "./tokenizer";
import {
  Comment,
  IntegerToken,
  KeywordToken,
  KeywordType,
  Token,
  TokenType,
} from "./tokens";
import { TokenStream } from "./tokenstream";

export interface ParserContext {
  tokenStream: TokenStream;
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
      current: [document],
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
      moveNext(ctx);
    } while (true);
  }

  private _handleToken(ctx: ParserContext) {
    switch (ctx.tokenStream.getCurrentToken().type) {
      // case TokenType.comment: {
      //   this._handleComment(ctx);
      //   return;
      // }
      case TokenType.keyword: {
        this._handleKeyword(ctx);
        return;
      }
    }
  }

  private _handleComment(ctx: ParserContext) {
    let commentToken = ctx.tokenStream.getCurrentToken() as Comment;
    let comment = new CommentNode(
      commentToken.start,
      commentToken.start + commentToken.length
    );

    comment.setParent(getCurrent(ctx));
    getCurrent(ctx).add(comment);
  }

  private _handleKeyword(ctx: ParserContext) {
    let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
    switch (keywordToken.keyword) {
      case KeywordType.syntax: {
        this._handleSyntax(ctx);
        return;
      }

      case KeywordType.package: {
        this._handlePackage(ctx);
        return;
      }

      case KeywordType.import: {
        this._handleImport(ctx);
        return;
      }

      case KeywordType.option: {
        this._handleOption(ctx);
        return;
      }

      case KeywordType.message: {
        this._handleMessage(ctx);
        return;
      }

      case KeywordType.enum: {
        this._handleEnum(ctx);
        return;
      }
    }
  }

  private _handleSyntax(ctx: ParserContext): SyntaxNode {
    let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
    moveNext(ctx);
    if (
      ctx.tokenStream.getCurrentToken().type !== TokenType.operator &&
      ctx.tokenStream.getCurrentTokenText() !== "="
    ) {
      throw this._generateError(ctx, "Expected '=' after 'syntax'");
    }

    moveNext(ctx);
    if (
      (ctx.tokenStream.getCurrentToken().type !== TokenType.string &&
        ctx.tokenStream.getCurrentTokenText() !== "'proto3'") ||
      ctx.tokenStream.getCurrentTokenText() !== '"proto3"'
    ) {
      throw this._generateError(ctx, "Expected 'proto3' after 'syntax ='");
    }

    moveNext(ctx);
    if (ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon) {
      throw this._generateError(ctx, "Expected ';' after the statement");
    }
    let semicolon = ctx.tokenStream.getCurrentToken();
    const syntax = new SyntaxNode(
      keywordToken.start,
      semicolon.start + semicolon.length,
      "proto3"
    );
    syntax.setParent(getCurrent(ctx));
    getCurrent(ctx).add(syntax);
    return syntax;
  }

  private _handlePackage(ctx: ParserContext): PackageNode {
    let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
    moveNext(ctx);

    let path = this._consumeFullIdentifier(ctx);
    if (ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon) {
      throw this._generateError(ctx, "Expected ';' after the statement");
    }
    const pkg = new PackageNode(
      keywordToken.start,
      ctx.tokenStream.getCurrentToken().start +
        ctx.tokenStream.getCurrentToken().length,
      path
    );
    pkg.setParent(getCurrent(ctx));
    getCurrent(ctx).add(pkg);
    return pkg;
  }

  private _handleImport(ctx: ParserContext): ImportNode {
    let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
    moveNext(ctx);

    let modifier: string | undefined = undefined;
    if (ctx.tokenStream.getCurrentToken().type !== TokenType.string) {
      if (ctx.tokenStream.getCurrentToken().type !== TokenType.keyword) {
        throw this._generateError(
          ctx,
          "Expected file path or specific keyword after 'import'"
        );
      }
      if (
        ctx.tokenStream.getCurrentTokenText() !== "public" &&
        ctx.tokenStream.getCurrentTokenText() !== "weak"
      ) {
        throw this._generateError(
          ctx,
          "Expected file path or specific keyword after 'import'"
        );
      }
      modifier = ctx.tokenStream.getCurrentTokenText();

      moveNext(ctx);
    }

    if (ctx.tokenStream.getCurrentToken().type !== TokenType.string) {
      throw this._generateError(
        ctx,
        "Expected file path or specific keyword after 'import'"
      );
    }
    let path = ctx.tokenStream.getCurrentTokenText();
    moveNext(ctx);

    if (ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon) {
      throw this._generateError(ctx, "Expected ';' after the statement");
    }
    const ipt = new ImportNode(
      keywordToken.start,
      ctx.tokenStream.getCurrentToken().start +
        ctx.tokenStream.getCurrentToken().length,
      path,
      modifier
    );
    ipt.setParent(getCurrent(ctx));
    getCurrent(ctx).add(ipt);
    return ipt;
  }

  private _handleOption(ctx: ParserContext): OptionNode {
    let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
    moveNext(ctx);

    let option = this._consumeOptionName(ctx);

    if (
      !(
        ctx.tokenStream.getCurrentToken().type === TokenType.operator &&
        ctx.tokenStream.getCurrentTokenText() === "="
      )
    ) {
      throw this._generateError(ctx, "Expected '=' after the option name");
    }
    moveNext(ctx);

    let value = this._consumeOptionValue(ctx);
    let valueType = value.type;

    if (ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon) {
      throw this._generateError(
        ctx,
        `Expected ';' after the statement, ` +
          `got ${ctx.tokenStream.getCurrentTokenText()}`
      );
    }

    const opt = new OptionNode(
      keywordToken.start,
      ctx.tokenStream.getCurrentToken().start +
        ctx.tokenStream.getCurrentToken().length,
      option,
      value,
      valueType
    );
    opt.setParent(getCurrent(ctx));
    getCurrent(ctx).add(opt);
    return opt;
  }

  private _handleEnum(ctx: ParserContext): EnumNode {
    let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
    moveNext(ctx);

    if (!this._canBeIdentifier(ctx.tokenStream.getCurrentToken())) {
      throw this._generateError(ctx, "Expected enum name after 'enum'");
    }

    let name = ctx.tokenStream.getCurrentTokenText();
    moveNext(ctx);

    if (ctx.tokenStream.getCurrentToken().type !== TokenType.openBrace) {
      throw this._generateError(ctx, "Expected '{' after the enum name");
    }
    moveNext(ctx);

    const enumNode = new EnumNode(keywordToken.start, 0, name);
    getCurrent(ctx).add(enumNode);
    enumNode.setParent(getCurrent(ctx));
    ctx.current.push(enumNode);

    while (ctx.tokenStream.getCurrentToken().type !== TokenType.closeBrace) {
      switch (ctx.tokenStream.getCurrentToken().type) {
        case TokenType.keyword: {
          let matched = false;
          switch ((ctx.tokenStream.getCurrentToken() as KeywordToken).keyword) {
            case KeywordType.option:
              this._handleOption(ctx);
              matched = true;
              break;
            // TODO reserved.
          }

          if (matched) {
            break;
          }
          // Fall through to identifier.
        }
        case TokenType.identifier: {
          this._handleEnumValue(ctx);
          break;
        }

        case TokenType.semicolon: {
          // empty statement
          // TODO: add empty statement node?
          break;
        }
      }
      moveNext(ctx);
    }
    enumNode.end =
      ctx.tokenStream.getCurrentToken().start +
      ctx.tokenStream.getCurrentToken().length;

    ctx.current.pop();
    return enumNode;
  }

  private _handleEnumValue(ctx: ParserContext): EnumValueNode {
    let name = ctx.tokenStream.getCurrentTokenText();
    moveNext(ctx);

    if (
      !(
        ctx.tokenStream.getCurrentToken().type === TokenType.operator &&
        ctx.tokenStream.getCurrentTokenText() === "="
      )
    ) {
      throw this._generateError(ctx, "Expected '=' after the enum value name");
    }
    moveNext(ctx);

    if (ctx.tokenStream.getCurrentToken().type !== TokenType.integer) {
      throw this._generateError(ctx, "Expected number after '='");
    }

    let value = (ctx.tokenStream.getCurrentToken() as IntegerToken).text;
    moveNext(ctx);

    if (ctx.tokenStream.getCurrentToken().type === TokenType.openBracket) {
      this._handleFieldOption(ctx);
      moveNext(ctx);
    }

    if (ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon) {
      throw this._generateError(ctx, "Expected ';' after the statement");
    }

    // TODO: option
    const val = new EnumValueNode(
      ctx.tokenStream.getCurrentToken().start,
      ctx.tokenStream.getCurrentToken().start +
        ctx.tokenStream.getCurrentToken().length,
      name,
      value
    );
    val.setParent(getCurrent(ctx));
    getCurrent(ctx).add(val);
    return val;
  }

  private _handleMessage(ctx: ParserContext): MessageNode {
    let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
    moveNext(ctx);

    if (!this._canBeIdentifier(ctx.tokenStream.getCurrentToken())) {
      throw this._generateError(ctx, "Expected message name after 'message'");
    }

    let name = ctx.tokenStream.getCurrentTokenText();
    moveNext(ctx);

    if (ctx.tokenStream.getCurrentToken().type !== TokenType.openBrace) {
      throw this._generateError(ctx, "Expected '{' after the message name");
    }

    const message = new MessageNode(
      keywordToken.start,
      keywordToken.start,
      name
    );
    getCurrent(ctx).add(message);
    message.setParent(getCurrent(ctx));
    ctx.current.push(message);

    moveNext(ctx);

    while (ctx.tokenStream.getCurrentToken().type !== TokenType.closeBrace) {
      switch (ctx.tokenStream.getCurrentToken().type) {
        case TokenType.keyword: {
          let matched = false;
          switch ((ctx.tokenStream.getCurrentToken() as KeywordToken).keyword) {
            case KeywordType.option:
              this._handleOption(ctx);
              matched = true;
              break;
            case KeywordType.message:
              this._handleMessage(ctx);
              matched = true;
              break;
            case KeywordType.enum:
              this._handleEnum(ctx);
              matched = true;
              break;
            case KeywordType.map:
            case KeywordType.repeated:
            case KeywordType.optional:
              // TODO: required keyword?
              this._handleField(ctx);
              matched = true;
              break;
            case KeywordType.oneof:
              this._handleOneof(ctx);
              matched = true;
              break;

            // TODO reserved?
          }

          if (matched) {
            break;
          }
          // Fall through to identifier.
        }
        case TokenType.identifier:
        case TokenType.primitiveType: {
          this._handleField(ctx);
          break;
        }

        case TokenType.semicolon: {
          // empty statement
          // TODO: add empty statement node?
          break;
        }
      }
      moveNext(ctx);
    }

    message.end =
      ctx.tokenStream.getCurrentToken().start +
      ctx.tokenStream.getCurrentToken().length;
    ctx.current.pop();
    return message;
  }

  private _handleOneof(ctx: ParserContext): OneofNode {
    let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
    moveNext(ctx);

    if (!this._canBeIdentifier(ctx.tokenStream.getCurrentToken())) {
      throw this._generateError(ctx, "Expected oneof name after 'oneof'");
    }
    let name = ctx.tokenStream.getCurrentTokenText();
    moveNext(ctx);

    if (ctx.tokenStream.getCurrentToken().type !== TokenType.openBrace) {
      throw this._generateError(ctx, "Expected '{' after the oneof name");
    }

    const oneof = new OneofNode(keywordToken.start, keywordToken.start, name);
    getCurrent(ctx).add(oneof);
    oneof.setParent(getCurrent(ctx));
    ctx.current.push(oneof);

    moveNext(ctx);

    while (ctx.tokenStream.getCurrentToken().type !== TokenType.closeBrace) {
      switch (ctx.tokenStream.getCurrentToken().type) {
        case TokenType.semicolon: {
          break;
        }
        case TokenType.identifier:
        case TokenType.primitiveType: {
          this._handleField(ctx);
          break;
        }
        default: {
          throw this._generateError(ctx, "Expected field in oneof");
        }
      }
      moveNext(ctx);
    }

    oneof.end =
      ctx.tokenStream.getCurrentToken().start +
      ctx.tokenStream.getCurrentToken().length;
    ctx.current.pop();
    return oneof;
  }

  // Parse field like `int32 foo = 1;`.
  private _handleField(ctx: ParserContext): FieldNode {
    const consumeType = (ctx: ParserContext): string => {
      if (ctx.tokenStream.getCurrentToken().type === TokenType.primitiveType) {
        let token = ctx.tokenStream.getCurrentTokenText();
        moveNext(ctx);
        return token;
      } else if (this._canBeIdentifier(ctx.tokenStream.getCurrentToken())) {
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
          moveNext(ctx);

          if (ctx.tokenStream.getCurrentToken().type !== TokenType.less) {
            throw this._generateError(ctx, "Expected '<' after 'map'");
          }
          moveNext(ctx);
          type_ += "<" + consumeType(ctx);

          if (ctx.tokenStream.getCurrentToken().type !== TokenType.comma) {
            throw this._generateError(ctx, "Expected ',' after the type");
          }
          moveNext(ctx);
          type_ += "," + consumeType(ctx);

          if (ctx.tokenStream.getCurrentToken().type !== TokenType.greater) {
            throw this._generateError(ctx, "Expected '>' after the type");
          }
          type_ += ">";
          moveNext(ctx);
          break;
        case KeywordType.repeated:
          moveNext(ctx);

          modifier = "repeated";
          type_ = consumeType(ctx);
          break;

        case KeywordType.optional:
          moveNext(ctx);

          modifier = "optional";
          type_ = consumeType(ctx);
          break;
      }
    } else if (
      ctx.tokenStream.getCurrentToken().type === TokenType.primitiveType
    ) {
      type_ = consumeType(ctx);
    } else if (this._canBeIdentifier(ctx.tokenStream.getCurrentToken())) {
      type_ = consumeType(ctx);
    } else {
      throw this._generateError(ctx, "Expected field type");
    }

    if (!this._canBeIdentifier(ctx.tokenStream.getCurrentToken())) {
      throw this._generateError(ctx, "Expected field name");
    }
    let name = ctx.tokenStream.getCurrentTokenText();
    moveNext(ctx);

    if (
      ctx.tokenStream.getCurrentToken().type !== TokenType.operator ||
      ctx.tokenStream.getCurrentTokenText() !== "="
    ) {
      throw this._generateError(ctx, "Expected '=' after the field name");
    }
    moveNext(ctx);

    if (ctx.tokenStream.getCurrentToken().type !== TokenType.integer) {
      throw this._generateError(ctx, "Expected number after '='");
    }
    const fieldNumber = ctx.tokenStream.getCurrentTokenText();
    moveNext(ctx);

    let options: OptionNode[] = [];
    if (ctx.tokenStream.getCurrentToken().type === TokenType.openBracket) {
      options = this._handleFieldOption(ctx);
      moveNext(ctx);
    }

    if (ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon) {
      throw this._generateError(ctx, "Expected ';' after the field");
    }

    const field = new FieldNode(
      startToken.start,
      ctx.tokenStream.getCurrentToken().start +
        ctx.tokenStream.getCurrentToken().length,
      name,
      fieldNumber,
      type_,
      modifier,
      options
    );
    getCurrent(ctx).add(field);
    field.setParent(getCurrent(ctx));
    return field;
  }

  // Parse field options like `[(json_name) = "foo"]`.
  private _handleFieldOption(ctx: ParserContext): OptionNode[] {
    if (ctx.tokenStream.getCurrentToken().type !== TokenType.openBracket) {
      throw this._generateError(ctx, "Expected '[' after the field name");
    }
    moveNext(ctx);

    let options: OptionNode[] = [];
    while (ctx.tokenStream.getCurrentToken().type !== TokenType.closeBracket) {
      let startToken = ctx.tokenStream.getCurrentToken();
      let optionName = this._consumeOptionName(ctx);
      if (
        ctx.tokenStream.getCurrentToken().type !== TokenType.operator ||
        ctx.tokenStream.getCurrentTokenText() !== "="
      ) {
        throw this._generateError(ctx, "Expected '=' after the option name");
      }
      moveNext(ctx);

      let value = this._consumeOptionValue(ctx);
      let valueType = value.type;

      options.push(
        new OptionNode(
          startToken.start,
          value.start + value.length,
          optionName,
          value,
          valueType
        )
      );

      if (ctx.tokenStream.getCurrentToken().type === TokenType.comma) {
        moveNext(ctx);
      } else if (
        ctx.tokenStream.getCurrentToken().type === TokenType.closeBracket
      ) {
        continue;
      } else {
        throw this._generateError(
          ctx,
          "Expected ',' or ']' after the option value"
        );
      }
    }

    return options;
  }

  private _consumeOptionName(ctx: ParserContext): string {
    let option = "";
    if (ctx.tokenStream.getCurrentToken().type === TokenType.openParenthesis) {
      moveNext(ctx);
      option = "(" + this._consumeFullIdentifier(ctx);

      if (
        ctx.tokenStream.getCurrentToken().type !== TokenType.closeParenthesis
      ) {
        throw this._generateError(ctx, "Expected ')' after the option path");
      }
      option += ")";
      moveNext(ctx);
    } else if (this._canBeIdentifier(ctx.tokenStream.getCurrentToken())) {
      option = this._consumeFullIdentifier(ctx);
    } else {
      throw this._generateError(ctx, "Expected option name after 'option'");
    }

    while (ctx.tokenStream.getCurrentToken().type === TokenType.dot) {
      option += ".";
      moveNext(ctx);
      if (!this._canBeIdentifier(ctx.tokenStream.getCurrentToken())) {
        throw this._generateError(ctx, "Expected option name after '.'");
      }
      option += ctx.tokenStream.getCurrentTokenText();
      moveNext(ctx);
    }

    return option;
  }

  private _consumeOptionValue(ctx: ParserContext): Token {
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
        `Expected option value after '=', ` +
          `got ${ctx.tokenStream.getCurrentTokenText()}`
      );
    }
    let value = ctx.tokenStream.getCurrentToken();
    moveNext(ctx);

    return value;
  }

  private _consumeFullIdentifier(ctx: ParserContext): string {
    let result = "";
    if (!this._canBeIdentifier(ctx.tokenStream.getCurrentToken())) {
      throw this._generateError(ctx, `Expected name`);
    }
    result += ctx.tokenStream.getCurrentTokenText();
    moveNext(ctx);

    while (ctx.tokenStream.getCurrentToken().type === TokenType.dot) {
      if (!this._canBeIdentifier(ctx.tokenStream.getNextToken())) {
        // Keywords are allowed in names, but not in paths.
        throw this._generateError(ctx, `Unexpected token in name`);
      }
      result += ctx.tokenStream.getCurrentTokenText();
      result += ctx.tokenStream.getNextTokenText();
      moveNext(ctx);
      moveNext(ctx);
    }

    return result;
  }

  private _canBeIdentifier(token: Token): boolean {
    return (
      token.type === TokenType.identifier || token.type === TokenType.keyword
    );
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
