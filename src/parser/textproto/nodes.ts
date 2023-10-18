// Example node hierarchy for textproto:
// document
//   |--- header
//   |--- comment
//   |--- field 1
//        |--- key
//        |--- value
//   |--- field 2 (nested)
//        |--- key
//        |--- comment
//        |--- field 3
//             |--- key
//             |--- comment
//             |--- value
//        |--- ...
import { CommentToken, Token } from "./tokens";

export const enum NodeType {
  invalid,
  empty,

  document, // root node

  header, // proto-file: and proto-message: directives
  comment,

  field,
  key,
  value,
}

export abstract class Node {
  type: NodeType;
  tokens: Token[];

  parent?: Node;
  children: Node[] = [];

  constructor(type: NodeType, tokens: Token[]) {
    this.type = type;
    this.tokens = tokens;
  }

  add(node: Node) {
    this.children.push(node);
    node.parent = this;
  }

  getStart() {
    if (this.tokens.length === 0) {
      return 0;
    }

    return this.tokens[0].start;
  }

  getEnd() {
    if (this.tokens.length === 0) {
      return 0;
    }
    const lastToken = this.tokens[this.tokens.length - 1];

    return lastToken.start + lastToken.length;
  }
}

export class DocumentNode extends Node {
  constructor(tokens: Token[]) {
    super(NodeType.document, tokens);
  }
}

export class HeaderNode extends Node {
  constructor(tokens: CommentToken[]) {
    super(NodeType.header, tokens);
  }
}

export class CommentNode extends Node {
  constructor(tokens: CommentToken[]) {
    super(NodeType.comment, tokens);
  }
}

export class FieldNode extends Node {
  key?: KeyNode;
  value?: ValueNode;

  constructor() {
    super(NodeType.field, []);
  }

  setKey(key: KeyNode) {
    this.key = key;
    super.add(key);
  }

  setValue(value: ValueNode) {
    this.value = value;
    super.add(value);
  }
}

export class KeyNode extends Node {
  name: string;

  constructor(tokens: Token[]) {
    super(NodeType.key, tokens);

    this.name = "";
  }

  setName(name: string) {
    this.name = name;
  }

  getName() {
    return this.name;
  }
}

// Value can be a literal, a list, a map, or a block.
export class ValueNode extends Node {
  constructor() {
    super(NodeType.value, []);
  }
}
