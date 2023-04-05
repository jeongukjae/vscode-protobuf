export const enum NodeType {
  invalid,
  empty,

  document,

  comment,
  syntax,
  import,
  package,
  option,

  enum,
  message,
  service,
  rpc,
  block,

  field,
  oneof,
  reserved,
  enumValue,
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

  getPackage(): PackageNode | undefined {
    for (const child of this.children!) {
      if (child.type === NodeType.package) {
        return child as PackageNode;
      }
    }
    return undefined;
  }

  listImports(): ImportNode[] {
    const res: ImportNode[] = [];
    for (const child of this.children!) {
      if (child.type === NodeType.import) {
        res.push(child as ImportNode);
      }
    }
    return res;
  }
}

export class CommentNode extends Node {
  constructor(start: number, end: number) {
    super(NodeType.comment, start, end);
  }
}

export class SyntaxNode extends Node {
  version: string;

  constructor(start: number, end: number, version: string) {
    super(NodeType.syntax, start, end);
    this.version = version;
  }
}

export class ImportNode extends Node {
  path: string;
  modifier?: string;

  constructor(start: number, end: number, path: string, modifier?: string) {
    super(NodeType.import, start, end);
    this.path = path;
    this.modifier = modifier;
  }

  getImportPath(): string {
    if (this.path.startsWith('"') && this.path.endsWith('"')) {
      return this.path.substring(1, this.path.length - 1);
    }
    if (this.path.startsWith("'") && this.path.endsWith("'")) {
      return this.path.substring(1, this.path.length - 1);
    }
    return this.path;
  }
}

export class PackageNode extends Node {
  name: string;

  constructor(start: number, end: number, name: string) {
    super(NodeType.package, start, end);
    this.name = name;
  }
}

export class OptionNode extends Node {
  name: string;
  value: OptionValueNode;

  constructor(
    start: number,
    end: number,
    name: string,
    value: OptionValueNode
  ) {
    super(NodeType.option, start, end);
    this.name = name;
    this.value = value;
  }
}

export class OptionValueNode extends Node {
  text: string;

  constructor(start: number, end: number, text: string) {
    super(NodeType.option, start, end);
    this.text = text;
  }
}

export class MessageNode extends Node {
  name: string;

  constructor(start: number, end: number, name: string) {
    super(NodeType.message, start, end);
    this.name = name;
  }
}

export class OneofNode extends Node {
  name: string;

  constructor(start: number, end: number, name: string) {
    super(NodeType.oneof, start, end);
    this.name = name;
  }
}

export class FieldNode extends Node {
  name: string;
  number: string;
  dtype: string;
  modifier?: string;
  options?: OptionNode[];

  constructor(
    start: number,
    end: number,
    name: string,
    number: string,
    dtype: string,
    modifier?: string,
    options?: OptionNode[]
  ) {
    super(NodeType.field, start, end);
    this.name = name;
    this.number = number;
    this.dtype = dtype;
    this.modifier = modifier;
    this.options = options;
  }
}

export class ReservedNode extends Node {
  // we don't care about the values.

  constructor(start: number, end: number) {
    super(NodeType.reserved, start, end);
  }
}

export class EnumNode extends Node {
  name: string;

  constructor(start: number, end: number, name: string) {
    super(NodeType.enum, start, end);
    this.name = name;
  }
}

export class EnumValueNode extends Node {
  name: string;
  number: string;
  options?: OptionNode[];

  constructor(start: number, end: number, name: string, number: string) {
    super(NodeType.enumValue, start, end);
    this.name = name;
    this.number = number;
  }
}

export class ServiceNode extends Node {
  name: string;

  constructor(start: number, end: number, name: string) {
    super(NodeType.service, start, end);
    this.name = name;
  }
}

export class RPCNode extends Node {
  name: string;
  request: string;
  requestStream: boolean;
  response: string;
  responseStream: boolean;
  options: OptionNode[];

  constructor(
    start: number,
    end: number,
    name: string,
    request: string,
    requestStream: boolean,
    response: string,
    responseStream: boolean
  ) {
    super(NodeType.rpc, start, end);
    this.name = name;
    this.request = request;
    this.requestStream = requestStream;
    this.response = response;
    this.responseStream = responseStream;
    this.options = [];
  }
}
