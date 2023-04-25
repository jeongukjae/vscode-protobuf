import * as vscode from "vscode";

import {
  DocumentNode,
  FieldNode,
  ImportNode,
  MessageNode,
  Node,
  NodeType,
} from "../../parser/proto3/nodes";
import { primitiveTypeMap } from "../../parser/proto3/tokens";
import { parseProto3 } from "../../parsercache";

export const proto3DefinitionProvider: vscode.DefinitionProvider = {
  provideDefinition: (
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DefinitionLink[]> => {
    let parseResult: DocumentNode;

    try {
      parseResult = parseProto3(document);
    } catch (e) {
      vscode.window.showErrorMessage("cannot parse proto3 file.");
      return undefined;
    }

    const targetRange = document.getWordRangeAtPosition(position);
    if (targetRange === undefined) {
      return undefined;
    }

    const targetOffset =
      (document.offsetAt(targetRange.start) +
        document.offsetAt(targetRange.end)) /
      2;
    let node = findNodeContainingOffset(parseResult, targetOffset);
    if (node === undefined) {
      return undefined;
    }
    switch (node.type) {
      case NodeType.import:
        let iptNode = node as ImportNode;
        return findImportDefinition(iptNode);
      case NodeType.field:
        let fieldNode = node as FieldNode;
        return findFieldDefinition(document, parseResult, fieldNode.dtype);
      // TODO: find option definition.
    }

    return;
  },
};

const findNodeContainingOffset = (
  node: Node,
  offset: number
): Node | undefined => {
  if (node.start < offset && offset < node.end) {
    if (node.children) {
      for (const child of node.children) {
        let res = findNodeContainingOffset(child, offset);
        if (res !== undefined) {
          return res;
        }
      }
    }

    return node;
  }

  return undefined;
};

const findFile = (path: string): Thenable<vscode.Uri[]> => {
  return vscode.workspace.findFiles("**/" + path);
};

const findImportDefinition = (
  node: ImportNode
): vscode.ProviderResult<vscode.DefinitionLink[]> => {
  return findFile(node.getImportPath()).then((uris) => {
    if (uris.length === 0) {
      return undefined;
    }

    return uris.map((uri) => {
      return {
        targetUri: uri,
        targetRange: new vscode.Range(
          new vscode.Position(0, 0),
          new vscode.Position(0, 0)
        ),
      };
    });
  });
};

const findFieldDefinition = (
  document: vscode.TextDocument,
  documentNode: DocumentNode,
  dtype: string
): Promise<vscode.DefinitionLink[]> | undefined => {
  if (dtype in primitiveTypeMap) {
    // it is a primitive type, do nothing.
    return;
  } else if (/map<.*?,.*?>/.test(dtype)) {
    // extract the key and value type.
    let matched = dtype.match(/map<(.+?),(.+?)>/);
    if (matched === null) {
      return;
    }

    let keyType = matched[1].trim();
    let valueType = matched[2].trim();

    return Promise.all([
      findFieldDefinition(document, documentNode, keyType),
      findFieldDefinition(document, documentNode, valueType),
    ]).then((resolved) => {
      let result: vscode.LocationLink[] = [];

      for (const item of resolved) {
        if (item !== undefined) {
          result = result.concat(item);
        }
      }

      return result;
    });
  }

  if (!dtype.includes(".")) {
    // message type in the same or other file.
    // find the message type in the same file first.
    let messageNode = findMessageNode(documentNode, dtype);
    if (messageNode !== undefined) {
      const res = [
        {
          targetUri: document.uri,
          targetRange: new vscode.Range(
            document.positionAt(messageNode.start),
            document.positionAt(messageNode.end)
          ),
        },
      ];
      return new Promise((resolve) => {
        resolve(res);
      });
    }
  }

  let names = dtype.split(".");
  let typeName = dtype;
  let packageName: string = documentNode.getPackage()?.name ?? "";

  if (names.length > 1) {
    typeName = names[names.length - 1];
    packageName = names.slice(0, names.length - 1).join(".");
  }

  // find symbol in imported files.
  return Promise.all(
    documentNode
      .listImports()
      .map(async (importNode: ImportNode): Promise<vscode.LocationLink[]> => {
        let files = await findFile(importNode.getImportPath());
        return Promise.all(
          files.map(async (uri): Promise<vscode.LocationLink[]> => {
            let document = await vscode.workspace.openTextDocument(uri);
            return findMessageInDocument(document, packageName, typeName);
          })
        ).then((res) => res.flat());
      })
  ).then((res) => res.flat());
};

// find message type in imported files.
const findMessageInDocument = (
  document: vscode.TextDocument,
  packageName: string,
  dtype: string
): vscode.LocationLink[] => {
  let docNode: DocumentNode;
  try {
    docNode = parseProto3(document);
  } catch (e) {
    return [];
  }

  if (
    docNode.getPackage() === undefined ||
    docNode.getPackage()?.name !== packageName
  ) {
    return [];
  }

  let messageNode = findMessageNode(docNode, dtype);
  if (messageNode !== undefined) {
    return [
      {
        targetUri: document.uri,
        targetRange: new vscode.Range(
          document.positionAt(messageNode.start),
          document.positionAt(messageNode.end)
        ),
      },
    ];
  }
  return [];
};

const findMessageNode = (node: Node, name: string): MessageNode | undefined => {
  if (node.type === NodeType.message && (node as MessageNode).name === name) {
    return node as MessageNode;
  }

  for (const child of node.children || []) {
    let msg = findMessageNode(child, name);
    if (msg !== undefined) {
      return msg;
    }
  }

  return undefined;
};
