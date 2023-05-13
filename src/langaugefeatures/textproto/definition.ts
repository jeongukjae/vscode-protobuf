import * as vscode from "vscode";

import * as proto3Nodes from "../../parser/proto3/nodes";
import { primitiveTypeMap } from "../../parser/proto3/tokens";
import * as textProtoNodes from "../../parser/textproto/nodes";
import { parseProto3, parseTextProto } from "../../parsercache";

export const textprotoDefinitionProvider: vscode.DefinitionProvider = {
  provideDefinition: (
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DefinitionLink[]> => {
    let parseResult: textProtoNodes.DocumentNode;

    try {
      parseResult = parseTextProto(document);
    } catch (e) {
      vscode.window.showErrorMessage("cannot parse textproto file.");
      return [];
    }

    let [path, message] = parseHeader(document, parseResult);
    if (path === undefined || message === undefined) {
      return [];
    }

    const targetRange = document.getWordRangeAtPosition(position);
    if (targetRange === undefined) {
      return [];
    }

    const targetOffset =
      (document.offsetAt(targetRange.start) +
        document.offsetAt(targetRange.end)) /
      2;
    let node = findNodeContainingOffset(parseResult, targetOffset);
    if (node === undefined) {
      return [];
    }
    switch (node.type) {
      case textProtoNodes.NodeType.field:
        let fieldNode = node as textProtoNodes.ValueNode;

        let namePath = [];
        let current = fieldNode;
        while (
          current.parent !== undefined &&
          current.parent.type === textProtoNodes.NodeType.field
        ) {
          namePath.push(current.name);
          current = current.parent as textProtoNodes.ValueNode;
        }
        namePath = namePath.reverse();

        return findProtoMessage(path, message, namePath);
    }

    return [];
  },
};

// to find definition to protobuf file, text format should have comment like
// # proto-file: some/proto/my_file.proto
// # proto-message: MyMessage
const parseHeader = (
  document: vscode.TextDocument,
  docNode: textProtoNodes.DocumentNode
): [string | undefined, string | undefined] => {
  let path: string | undefined;
  let message: string | undefined;

  for (const child of docNode.children || []) {
    if (child.type !== textProtoNodes.NodeType.comment) {
      break;
    }

    let commentNode = child as textProtoNodes.CommentNode;
    let comment = document.getText().slice(commentNode.start, commentNode.end);

    if (comment.match(/# ?proto-file:/)) {
      // slice first colon
      path = comment.slice(comment.indexOf(":") + 1).trim();
    } else if (comment.match(/# ?proto-message:/)) {
      // slice first colon
      message = comment.slice(comment.indexOf(":") + 1).trim();
    } else {
      // if comment is not proto-file or proto-message, then stop searching.
      break;
    }

    if (path !== undefined && message !== undefined) {
      break;
    }
  }

  return [path, message];
};

const findNodeContainingOffset = (
  node: textProtoNodes.Node,
  offset: number
): textProtoNodes.Node | undefined => {
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

const findProtoMessage = async (
  path: string,
  message: string,
  namePaths: string[]
): Promise<vscode.DefinitionLink[]> => {
  let entries = await vscode.workspace.findFiles("**/" + path);

  console.log(entries);

  if (entries.length === 0) {
    return [];
  }

  let results: vscode.DefinitionLink[] = [];
  for (let entry of entries) {
    let doc = await vscode.workspace.openTextDocument(entry);
    let docNode = parseProto3(doc);

    if (docNode === undefined || docNode.children === undefined) {
      continue;
    }

    let targetMsgs = docNode.children.filter(
      (node) =>
        node.type === proto3Nodes.NodeType.message &&
        (node as proto3Nodes.MessageNode).name === message
    ) as proto3Nodes.MessageNode[];

    if (targetMsgs.length === 0) {
      vscode.window.showErrorMessage(
        "cannot find message " + message + " in " + doc.uri.fsPath
      );
      continue;
    } else if (targetMsgs.length > 1) {
      vscode.window.showErrorMessage(
        "found multiple message " + message + " in " + doc.uri.fsPath
      );
      continue;
    }

    let targetMsg = targetMsgs[0];
    results = results.concat(walkNode(doc, docNode, targetMsg, namePaths));
  }
  return results;
};

const walkNode = (
  doc: vscode.TextDocument,
  node: proto3Nodes.Node,
  currentNode: proto3Nodes.MessageNode,
  namePaths: string[]
): vscode.DefinitionLink[] => {
  if (namePaths.length === 0) {
    return [
      {
        originSelectionRange: new vscode.Range(
          doc.positionAt(node.start),
          doc.positionAt(node.end)
        ),
        targetRange: new vscode.Range(
          doc.positionAt(currentNode.start),
          doc.positionAt(currentNode.end)
        ),
        targetUri: doc.uri,
      },
    ];
  }

  let name = namePaths[0];
  let rest = namePaths.slice(1);

  if (currentNode.children === undefined) {
    return [];
  }

  let targetNodes = currentNode.children.filter(
    (node) =>
      node.type === proto3Nodes.NodeType.field &&
      (node as proto3Nodes.FieldNode).name === name
  ) as proto3Nodes.FieldNode[];
  if (targetNodes.length !== 1) {
    return [];
  }

  let dtype = targetNodes[0].dtype;

  if (dtype in primitiveTypeMap) {
    if (rest.length !== 0) {
      return [];
    }

    return [
      {
        targetRange: new vscode.Range(
          doc.positionAt(targetNodes[0].start),
          doc.positionAt(targetNodes[0].end)
        ),
        targetUri: doc.uri,
      },
    ];
  }

  return [];
};
