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
// The key is package.message (e.g. google.protobuf.Any) and the value is a list
// of the location link to the definition.
export class Proto3Index {
  private index: Map<string, Proto3Link[]>;

  constructor() {
    this.index = new Map<string, Proto3Link[]>();
  }

  initialize = async () => {
    this.index.clear();

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
      this.walkIndex(document, package_!.name, child);
    });
  };

  removeFile = (uri: vscode.Uri) => {
    this.index.forEach((links, key) => {
      let newLinks = links.filter((link) => {
        return link.link.targetUri.fsPath !== uri.fsPath;
      });

      if (newLinks.length === 0) {
        this.index.delete(key);
      } else {
        this.index.set(key, newLinks);
      }
    });
  };

  updateFile = (uri: vscode.Uri) => {
    this.removeFile(uri);
    this.addFileToIndex(uri);
  };

  findMsgOrEnum = (packageName: string, typeName: string): Proto3Link[] => {
    let key = packageName + "." + typeName;
    return this.index.get(key) || [];
  };

  private walkIndex = (
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
      if (this.index.has(key)) {
        this.index.get(key)?.push(link);
      } else {
        this.index.set(key, [link]);
      }
    }

    // TODO: service?

    node.children?.forEach((child) => {
      this.walkIndex(document, pkg, child);
    });
  };
}

export const proto3Index = new Proto3Index();
