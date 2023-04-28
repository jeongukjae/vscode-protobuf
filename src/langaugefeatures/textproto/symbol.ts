import * as vscode from "vscode";

import {
  DocumentNode,
  Node,
  NodeType,
  ValueNode,
} from "../../parser/textproto/nodes";
import { parseTextProto } from "../../parsercache";

const cached: { [uri: string]: vscode.SymbolInformation[] } = {};

export const textprotoSymbolProvider: vscode.DocumentSymbolProvider = {
  provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.SymbolInformation[]> {
    const result: vscode.SymbolInformation[] = [];

    let docNode: DocumentNode;
    try {
      docNode = parseTextProto(document);
    } catch (e) {
      // ignore the error and return cached result
      console.log(e);
      return cached[document.uri.toString()];
    }

    console.log(docNode);

    const walk = (node: Node) => {
      let symb: vscode.SymbolInformation;
      switch (node.type) {
        case NodeType.field:
          const syntaxNode = node as ValueNode;
          symb = new vscode.SymbolInformation(
            syntaxNode.name,
            vscode.SymbolKind.Field,
            "",
            new vscode.Location(
              document.uri,
              new vscode.Range(
                document.positionAt(syntaxNode.start),
                document.positionAt(syntaxNode.end)
              )
            )
          );
          result.push(symb);
          break;
      }

      for (const child of node.children || []) {
        walk(child);
      }
    };

    walk(docNode);

    cached[document.uri.toString()] = result;
    return result;
  },
};
