import * as vscode from "vscode";

import * as proto3Nodes from "./parser/proto3/nodes";
import { Proto3Parser } from "./parser/proto3/parser";

const proto3Parser = new Proto3Parser();

export enum Proto3Type {
  message,
  enum,
}

export interface Proto3Link {
  link: vscode.LocationLink;
  type: Proto3Type;
}

// create index for proto3 files.
export class Proto3Index {
  // key: package + "." + message, value: location link
  private symbolIndex: Map<string, Proto3Link[]>;
  // key: uri, value: import paths
  private importIndex: Map<string, string[]>;

  constructor() {
    this.symbolIndex = new Map<string, Proto3Link[]>();
    this.importIndex = new Map<string, string[]>();
  }

  initialize = async () => {
    this.symbolIndex.clear();
    this.importIndex.clear();

    let uris = await vscode.workspace.findFiles("**/*.proto");
    await Promise.all(uris.map(this.addFileToIndex));
  };

  addFileToIndex = async (uri: vscode.Uri) => {
    let document = await vscode.workspace.openTextDocument(uri);
    let docNode: proto3Nodes.DocumentNode;
    try {
      docNode = proto3Parser.parse(document.getText());
    } catch (e) {
      console.log(
        "Cannot parse proto3 file: " + uri.fsPath + ", ignore it. e: " + e
      );
      return;
    }

    let package_ = docNode.getPackage();
    if (package_ === undefined) {
      console.log("Cannot find package in proto3 file: " + uri.fsPath);
      // show window message?
      return;
    }

    docNode.children?.forEach((child) => {
      this.walkSymbolIndex(document, package_!.name, child);
      this.walkImportIndex(document, child);
    });
  };

  removeFile = (uri: vscode.Uri) => {
    this.symbolIndex.forEach((links, key) => {
      let newLinks = links.filter((link) => {
        return link.link.targetUri.fsPath !== uri.fsPath;
      });

      if (newLinks.length === 0) {
        this.symbolIndex.delete(key);
      } else {
        this.symbolIndex.set(key, newLinks);
      }
    });
  };

  updateFile = (uri: vscode.Uri) => {
    this.removeFile(uri);
    this.addFileToIndex(uri);
  };

  findMsgOrEnum = (packageName: string, typeName: string): Proto3Link[] => {
    let key = packageName + "." + typeName;
    return this.symbolIndex.get(key) || [];
  };

  listImports = (uri: vscode.Uri): string[] => {
    return this.importIndex.get(uri.fsPath) || [];
  };
  // TODO: add method to fetch all accessible files from a vscode.Uri.

  private walkSymbolIndex = (
    document: vscode.TextDocument,
    pkg: string,
    node: proto3Nodes.Node
  ) => {
    let key: string | undefined;
    let link: Proto3Link | undefined;

    if (node.type === proto3Nodes.NodeType.message) {
      // TODO: fix nested message name.
      // e.g. message A { message B {} } -> A.B
      key = pkg + "." + (node as proto3Nodes.MessageNode).name;
      link = {
        link: {
          targetUri: document.uri,
          targetRange: new vscode.Range(
            document.positionAt(node.start),
            document.positionAt(node.end)
          ),
        },
        type: Proto3Type.message,
      };
    } else if (node.type === proto3Nodes.NodeType.enum) {
      key = pkg + "." + (node as proto3Nodes.EnumNode).name;
      link = {
        link: {
          targetUri: document.uri,
          targetRange: new vscode.Range(
            document.positionAt(node.start),
            document.positionAt(node.end)
          ),
        },
        type: Proto3Type.enum,
      };
    }

    if (key !== undefined && link !== undefined) {
      if (this.symbolIndex.has(key)) {
        this.symbolIndex.get(key)?.push(link);
      } else {
        this.symbolIndex.set(key, [link]);
      }
    }

    // TODO: service?

    node.children?.forEach((child) => {
      this.walkSymbolIndex(document, pkg, child);
    });
  };

  private walkImportIndex = (
    document: vscode.TextDocument,
    node: proto3Nodes.Node
  ) => {
    if (node.type === proto3Nodes.NodeType.import) {
      let path = (node as proto3Nodes.ImportNode).path;
      // strip start and end quote.
      path = path.replace(/^("|')/, "").replace(/("|')$/, "");
      if (path !== undefined) {
        if (this.importIndex.has(document.uri.fsPath)) {
          this.importIndex.get(document.uri.fsPath)?.push(path);
        } else {
          this.importIndex.set(document.uri.fsPath, [path]);
        }
      }
    }

    node.children?.forEach((child) => {
      this.walkImportIndex(document, child);
    });
  };
}

export const proto3Index = new Proto3Index();
