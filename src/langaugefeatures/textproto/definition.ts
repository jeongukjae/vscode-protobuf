import * as vscode from "vscode";

import {
  DocumentNode,
  ValueNode,
  Node,
  NodeType,
} from "../../parser/textproto/nodes";
import { parseTextProto } from "../../parsercache";

export const textprotoDefinitionProvider: vscode.DefinitionProvider = {
  provideDefinition: (
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DefinitionLink[]> => {
    let parseResult: DocumentNode;

    try {
      parseResult = parseTextProto(document);
    } catch (e) {
      vscode.window.showErrorMessage("cannot parse textproto file.");
      return undefined;
    }

    // TODO: check starting comment.

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
      case NodeType.field:
        let fieldNode = node as ValueNode;
      // TODO
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
