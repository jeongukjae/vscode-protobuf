// https://protobuf.dev/reference/protobuf/proto3-spec/
// XXX: add empty statement node?
import { TokenStream } from "../core/tokenstream";
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
  OptionValueNode,
  ServiceNode,
  RPCNode,
  ReservedNode,
  NodeType,
} from "./nodes";
import { Proto3Tokenizer } from "./tokenizer";
import {
  IntegerToken,
  KeywordToken,
  KeywordType,
  Token,
  TokenType,
} from "./tokens";

export interface ParserContext {
  tokenStream: TokenStream<Token>;
  document: DocumentNode;
  current: Node[];
}

const getCurrent = (ctx: ParserContext): Node =>
  ctx.current[ctx.current.length - 1];

const getLastChildren = (node: Node): Node | undefined => {
  if (node.children !== undefined && node.children.length > 0) {
    return node.children[node.children.length - 1];
  }
  return undefined;
};

// move next token and if it is a comment, add it to the current node, and
// continue to move next until it is not a comment.
const moveNext = (ctx: ParserContext) => {
  ctx.tokenStream.moveNext();
  if (ctx.tokenStream.getCurrentToken().type === TokenType.comment) {
    let comment: CommentNode;

    // if the last children is a comment, then we can just extend it.
    if (
      getCurrent(ctx).children !== undefined &&
      getLastChildren(getCurrent(ctx))!.type === NodeType.comment
    ) {
      comment = getLastChildren(getCurrent(ctx)) as CommentNode;
      comment.end =
        ctx.tokenStream.getCurrentToken().start +
        ctx.tokenStream.getCurrentToken().length;
    } else {
      comment = new CommentNode(
        ctx.tokenStream.getCurrentToken().start,
        ctx.tokenStream.getCurrentToken().start +
          ctx.tokenStream.getCurrentToken().length
      );
      comment.setParent(getCurrent(ctx));
      getCurrent(ctx).add(comment);
    }
    if (ctx.tokenStream.isEndOfStream()) {
      return;
    }
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
      if (ctx.tokenStream.isEndOfStream()) {
        break;
      }
    } while (true);
  }

  private _handleToken(ctx: ParserContext) {
    switch (ctx.tokenStream.getCurrentToken().type) {
      case TokenType.keyword: {
        this._handleKeyword(ctx);
        return;
      }
      case TokenType.comment: {
        let comment = new CommentNode(
          ctx.tokenStream.getCurrentToken().start,
          ctx.tokenStream.getCurrentToken().start +
            ctx.tokenStream.getCurrentToken().length
        );
        comment.setParent(getCurrent(ctx));
        getCurrent(ctx).add(comment);
        return;
      }
    }
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

      case KeywordType.service: {
        this._handleService(ctx);
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
    moveNext(ctx);

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
      value
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
            case KeywordType.reserved:
              this._handleReserved(ctx);
              matched = true;
              break;
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

    // TODO: parse option?
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
            case KeywordType.reserved:
              this._handleReserved(ctx);
              matched = true;
              break;
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

  private _handleReserved(ctx: ParserContext): ReservedNode {
    let keywordToken = ctx.tokenStream.getCurrentToken() as KeywordToken;
    moveNext(ctx);

    if (ctx.tokenStream.getCurrentToken().type === TokenType.string) {
      moveNext(ctx);

      while (
        ctx.tokenStream.getCurrentToken().type === TokenType.comma &&
        ctx.tokenStream.getNextToken().type === TokenType.string
      ) {
        moveNext(ctx);
        moveNext(ctx);
      }
    } else if (ctx.tokenStream.getCurrentToken().type === TokenType.integer) {
      while (ctx.tokenStream.getCurrentToken().type === TokenType.integer) {
        moveNext(ctx);
        if (ctx.tokenStream.getCurrentToken().type === TokenType.keyword) {
          if (
            (ctx.tokenStream.getCurrentToken() as KeywordToken).keyword !==
            KeywordType.to
          ) {
            throw this._generateError(ctx, "Expected 'to' after integer");
          }

          moveNext(ctx);
          if (ctx.tokenStream.getCurrentToken().type !== TokenType.integer) {
            throw this._generateError(ctx, "Expected integer after 'to'");
          }
          moveNext(ctx);
        }

        if (ctx.tokenStream.getCurrentToken().type === TokenType.comma) {
          moveNext(ctx);
        } else if (
          ctx.tokenStream.getCurrentToken().type === TokenType.semicolon
        ) {
          break;
        } else {
          throw this._generateError(ctx, "Expected ',' or ';' after integer");
        }
      }
    } else {
      throw this._generateError(
        ctx,
        "Expected string or number after 'reserved'"
      );
    }

    if (ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon) {
      throw this._generateError(ctx, "Expected ';' after 'reserved'");
    }

    const reserved = new ReservedNode(
      keywordToken.start,
      ctx.tokenStream.getCurrentToken().start +
        ctx.tokenStream.getCurrentToken().length
    );

    getCurrent(ctx).add(reserved);
    reserved.setParent(getCurrent(ctx));

    return reserved;
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
      } else if (
        ctx.tokenStream.getCurrentToken().type === TokenType.dot &&
        this._canBeIdentifier(ctx.tokenStream.getNextToken())
      ) {
        moveNext(ctx);
        const ident = this._consumeFullIdentifier(ctx);
        return "." + ident;
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
      options.push(
        new OptionNode(
          startToken.start,
          ctx.tokenStream.getCurrentToken().start +
            ctx.tokenStream.getCurrentToken().length,
          optionName,
          value
        )
      );
      moveNext(ctx);

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

  private _handleService(ctx: ParserContext): ServiceNode {
    if (ctx.tokenStream.getCurrentToken().type !== TokenType.keyword) {
      throw this._generateError(ctx, "Expected 'service' keyword");
    }
    let startToken = ctx.tokenStream.getCurrentToken();
    moveNext(ctx);

    if (!this._canBeIdentifier(ctx.tokenStream.getCurrentToken())) {
      throw this._generateError(ctx, "Expected service name");
    }
    let name = ctx.tokenStream.getCurrentTokenText();
    moveNext(ctx);

    if (ctx.tokenStream.getCurrentToken().type !== TokenType.openBrace) {
      throw this._generateError(ctx, "Expected '{' after the service name");
    }

    let service = new ServiceNode(
      startToken.start,
      ctx.tokenStream.getCurrentToken().start +
        ctx.tokenStream.getCurrentToken().length,
      name
    );
    getCurrent(ctx).add(service);
    service.setParent(getCurrent(ctx));
    ctx.current.push(service);

    moveNext(ctx);
    while (ctx.tokenStream.getCurrentToken().type !== TokenType.closeBrace) {
      switch (ctx.tokenStream.getCurrentToken().type) {
        case TokenType.keyword:
          switch ((ctx.tokenStream.getCurrentToken() as KeywordToken).keyword) {
            case KeywordType.option:
              this._handleOption(ctx);
              break;
            case KeywordType.rpc:
              this._handleRPC(ctx);
              break;
          }

          break;

        default:
          throw this._generateError(
            ctx,
            "Unexpected token in service block, got: " +
              ctx.tokenStream.getCurrentTokenText()
          );
      }

      moveNext(ctx);
    }
    ctx.current.pop();
    service.end =
      ctx.tokenStream.getCurrentToken().start +
      ctx.tokenStream.getCurrentToken().length;
    return service;
  }

  private _handleRPC(ctx: ParserContext): RPCNode {
    if (ctx.tokenStream.getCurrentToken().type !== TokenType.keyword) {
      throw this._generateError(ctx, "Expected 'rpc' keyword");
    }
    let startToken = ctx.tokenStream.getCurrentToken();
    moveNext(ctx);

    if (!this._canBeIdentifier(ctx.tokenStream.getCurrentToken())) {
      throw this._generateError(ctx, "Expected RPC name");
    }

    let name = ctx.tokenStream.getCurrentTokenText();
    moveNext(ctx);

    if (ctx.tokenStream.getCurrentToken().type !== TokenType.openParenthesis) {
      throw this._generateError(ctx, "Expected '(' after the RPC name");
    }
    moveNext(ctx);

    let requestStream = false;
    if (
      ctx.tokenStream.getCurrentToken().type === TokenType.keyword &&
      (ctx.tokenStream.getCurrentToken() as KeywordToken).keyword ===
        KeywordType.stream
    ) {
      requestStream = true;
      moveNext(ctx);
    }

    if (!this._canBeIdentifier(ctx.tokenStream.getCurrentToken())) {
      throw this._generateError(ctx, "Expected request type");
    }
    let requestType = this._consumeFullIdentifier(ctx);

    if (ctx.tokenStream.getCurrentToken().type !== TokenType.closeParenthesis) {
      throw this._generateError(ctx, "Expected ')' after the request type");
    }
    moveNext(ctx);

    if (
      ctx.tokenStream.getCurrentToken().type !== TokenType.keyword &&
      (ctx.tokenStream.getCurrentToken() as KeywordToken).keyword !==
        KeywordType.returns
    ) {
      throw this._generateError(ctx, "Expected 'returns' keyword");
    }
    moveNext(ctx);

    if (ctx.tokenStream.getCurrentToken().type !== TokenType.openParenthesis) {
      throw this._generateError(
        ctx,
        "Expected '(' after the 'returns' keyword"
      );
    }
    moveNext(ctx);

    let responseStream = false;
    if (
      ctx.tokenStream.getCurrentToken().type === TokenType.keyword &&
      (ctx.tokenStream.getCurrentToken() as KeywordToken).keyword ===
        KeywordType.stream
    ) {
      responseStream = true;
      moveNext(ctx);
    }

    if (!this._canBeIdentifier(ctx.tokenStream.getCurrentToken())) {
      throw this._generateError(ctx, "Expected response type");
    }
    let responseType = this._consumeFullIdentifier(ctx);

    if (ctx.tokenStream.getCurrentToken().type !== TokenType.closeParenthesis) {
      throw this._generateError(ctx, "Expected ')' after the response type");
    }
    moveNext(ctx);

    let rpc = new RPCNode(
      startToken.start,
      ctx.tokenStream.getCurrentToken().start +
        ctx.tokenStream.getCurrentToken().length,
      name,
      requestType,
      requestStream,
      responseType,
      responseStream
    );
    getCurrent(ctx).add(rpc);
    rpc.setParent(getCurrent(ctx));
    ctx.current.push(rpc);

    if (ctx.tokenStream.getCurrentToken().type === TokenType.openBrace) {
      moveNext(ctx);

      while (ctx.tokenStream.getCurrentToken().type !== TokenType.closeBrace) {
        if (ctx.tokenStream.getCurrentToken().type === TokenType.keyword) {
          if (
            (ctx.tokenStream.getCurrentToken() as KeywordToken).keyword ===
            KeywordType.option
          ) {
            this._handleOption(ctx);
          }
        } else if (
          ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon
        ) {
          throw this._generateError(ctx, "Expected 'option'");
        }

        moveNext(ctx);
      }

      if (ctx.tokenStream.getNextToken().type === TokenType.semicolon) {
        moveNext(ctx);
      }
    } else if (ctx.tokenStream.getCurrentToken().type !== TokenType.semicolon) {
      throw this._generateError(ctx, "Expected ';' after the RPC");
    }

    ctx.current.pop();
    rpc.end =
      ctx.tokenStream.getCurrentToken().start +
      ctx.tokenStream.getCurrentToken().length;
    return rpc;
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

  private _consumeOptionValue(ctx: ParserContext): OptionValueNode {
    // Handling simple literals.
    if (
      [
        TokenType.integer,
        TokenType.float,
        TokenType.boolean,
        TokenType.identifier,
      ].includes(ctx.tokenStream.getCurrentToken().type)
    ) {
      let value = ctx.tokenStream.getCurrentToken();
      return new OptionValueNode(
        value.start,
        value.start + value.length,
        ctx.tokenStream.getCurrentTokenText()
      );
    }

    if (ctx.tokenStream.getCurrentToken().type === TokenType.string) {
      let value = ctx.tokenStream.getCurrentToken();
      let opt = new OptionValueNode(
        value.start,
        value.start + value.length,
        ctx.tokenStream.getCurrentTokenText()
      );

      while (ctx.tokenStream.getNextToken().type === TokenType.string) {
        moveNext(ctx);
        opt.text += ctx.tokenStream.getCurrentTokenText();
        opt.end =
          ctx.tokenStream.getCurrentToken().start +
          ctx.tokenStream.getCurrentToken().length;
      }

      return opt;
    }

    // Handling message literals.
    if (ctx.tokenStream.getCurrentToken().type === TokenType.openBrace) {
      moveNext(ctx);

      let optionValue = new OptionValueNode(
        ctx.tokenStream.getCurrentToken().start,
        ctx.tokenStream.getCurrentToken().start,
        ""
      );
      while (ctx.tokenStream.getCurrentToken().type !== TokenType.closeBrace) {
        if (!this._canBeIdentifier(ctx.tokenStream.getCurrentToken())) {
          throw this._generateError(ctx, "Expected identifier");
        }

        // let nameToken = ctx.tokenStream.getCurrentToken();
        moveNext(ctx);

        if (
          ctx.tokenStream.getCurrentToken().type !== TokenType.colon &&
          ctx.tokenStream.getCurrentToken().type !== TokenType.openBrace
        ) {
          throw this._generateError(
            ctx,
            "Expected ':' or '{' after the identifier"
          );
        }

        if (ctx.tokenStream.getCurrentToken().type === TokenType.colon) {
          moveNext(ctx);
        }

        this._consumeOptionValue(ctx);
        moveNext(ctx);

        if (ctx.tokenStream.getCurrentToken().type === TokenType.comma) {
          moveNext(ctx);
        }
      }

      optionValue.end =
        ctx.tokenStream.getCurrentToken().start +
        ctx.tokenStream.getCurrentToken().length;
      optionValue.text = ctx.tokenStream.text.substring(
        optionValue.start,
        optionValue.end
      );
      return optionValue;
    }

    throw this._generateError(
      ctx,
      `Expected option value after '=', ` +
        `got ${ctx.tokenStream.getCurrentTokenText()}`
    );
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
