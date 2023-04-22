export const enum NodeType {
  invalid,
  empty,

  document,

  comment,
  header, // proto-file: and proto-message: directives

  field,
  nestedField,
}

export abstract class Node {
  type: NodeType;
  start: number;
  end: number;

  parent?: Node;
  children?: Node[];

  constructor(type: NodeType, start: number, end: number) {
    this.type = type;
    this.start = start;
    this.end = end;
  }

  setParent(node: Node) {
    this.parent = node;
  }

  add(node: Node) {
    if (!this.children) {
      this.children = [];
    }
    this.children.push(node);
  }
}

export class DocumentNode extends Node {
  constructor(start: number, end: number) {
    super(NodeType.document, start, end);
  }
}

export class CommentNode extends Node {
  constructor(start: number, end: number) {
    super(NodeType.comment, start, end);
  }
}

// `key: value` type
export class FieldNode extends Node {
  constructor(start: number, end: number) {
    super(NodeType.field, start, end);
  }
}

// `key: { key: value }` or `key { key: value }` type
export class NestedFieldNode extends Node {
  constructor(start: number, end: number) {
    super(NodeType.nestedField, start, end);
  }
}
