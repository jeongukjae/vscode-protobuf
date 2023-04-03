import { Token, TokenType } from "./tokens";

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
}

export abstract class Node {
    type: NodeType;
    start: number;
    length: number;

    parent?: Node;
    children?: Node[];

    constructor(type: NodeType, start: number, length: number) {
        this.type = type;
        this.start = start;
        this.length = length;
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
    constructor(start: number, length: number) {
        super(NodeType.document, start, length);
    }
}

export class CommentNode extends Node {
    text: string;

    constructor(start: number, length: number, text: string) {
        super(NodeType.comment, start, length);
        this.text = text;
    }
}

export class SyntaxNode extends Node {
    version: string;

    constructor(start: number, length: number, version: string) {
        super(NodeType.syntax, start, length);
        this.version = version;
    }
}

export class ImportNode extends Node {
    path: string;
    modifier?: string;

    constructor(start: number, length: number, path: string, modifier?: string) {
        super(NodeType.import, start, length);
        this.path = path;
        this.modifier = modifier;
    }
}

export class PackageNode extends Node {
    name: string;

    constructor(start: number, length: number, name: string) {
        super(NodeType.package, start, length);
        this.name = name;
    }
}

export class OptionNode extends Node {
    name: string;
    value: Token;
    valueTokenType: TokenType;

    constructor(start: number, length: number, name: string, value: Token, valueTokenType: TokenType) {
        super(NodeType.option, start, length);
        this.name = name;
        this.value = value;
        this.valueTokenType = valueTokenType;
    }
}

export class MessageNode extends Node {
    name: string;

    constructor(start: number, length: number, name: string) {
        super(NodeType.message, start, length);
        this.name = name;
    }
}

export class FieldNode extends Node {
    name: string;
    number: string;
    dtype: string;
    modifier?: string;
    options?: OptionNode[];

    constructor(start: number, length: number, name: string, number: string, dtype: string, modifier?: string, options?: OptionNode[]) {
        super(NodeType.field, start, length);
        this.name = name;
        this.number = number;
        this.dtype = dtype;
        this.modifier = modifier;
        this.options = options;
    }
}

export class EnumNode extends Node {
    name: string;

    constructor(start: number, length: number, name: string) {
        super(NodeType.enum, start, length);
        this.name = name;
    }
}

export class EnumValueNode extends Node {
    name: string;
    number: string;
    options?: OptionNode[];

    constructor(start: number, length: number, name: string, number: string) {
        super(NodeType.enum, start, length);
        this.name = name;
        this.number = number;
    }

    addOption(option: OptionNode) {
        if (!this.options) {
            this.options = [];
        }
        this.options.push(option);
    }
}
