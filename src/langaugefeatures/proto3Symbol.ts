import * as vscode from "vscode";

import {
  DocumentNode,
  EnumNode,
  EnumValueNode,
  FieldNode,
  MessageNode,
  Node,
  NodeType,
  OptionNode,
  PackageNode,
  SyntaxNode,
} from "../parser/nodes";
import { Proto3Parser } from "../parser/parser";

const proto3Parser = new Proto3Parser();
const cached: { [uri: string]: vscode.SymbolInformation[] } = {};

export const proto3SymbolProvider: vscode.DocumentSymbolProvider = {
  provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.SymbolInformation[]> {
    const result: vscode.SymbolInformation[] = [];

    const text = document.getText();
    let docNode: DocumentNode;
    try {
      docNode = proto3Parser.parse(text);
    } catch (e) {
      // ignore the error and return cached result
      return cached[document.uri.toString()];
    }

    const walk = (node: Node) => {
      let symb: vscode.SymbolInformation;
      switch (node.type) {
        case NodeType.syntax:
          const syntaxNode = node as SyntaxNode;
          symb = new vscode.SymbolInformation(
            syntaxNode.version,
            vscode.SymbolKind.String,
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

        case NodeType.option:
          const optionNode = node as OptionNode;
          symb = new vscode.SymbolInformation(
            optionNode.name,
            vscode.SymbolKind.Variable,
            "",
            new vscode.Location(
              document.uri,
              new vscode.Range(
                document.positionAt(optionNode.start),
                document.positionAt(optionNode.end)
              )
            )
          );
          result.push(symb);
          break;

        case NodeType.package:
          const packageNode = node as PackageNode;

          symb = new vscode.SymbolInformation(
            packageNode.name,
            vscode.SymbolKind.Package,
            "",
            new vscode.Location(
              document.uri,
              new vscode.Range(
                document.positionAt(packageNode.start),
                document.positionAt(packageNode.end)
              )
            )
          );
          result.push(symb);
          break;

        case NodeType.message:
          const msgNode = node as MessageNode;

          symb = new vscode.SymbolInformation(
            msgNode.name,
            vscode.SymbolKind.Class,
            "",
            new vscode.Location(
              document.uri,
              new vscode.Range(
                document.positionAt(msgNode.start),
                document.positionAt(msgNode.end)
              )
            )
          );
          result.push(symb);
          break;

        case NodeType.field:
          const fieldNode = node as FieldNode;
          symb = new vscode.SymbolInformation(
            fieldNode.name,
            vscode.SymbolKind.Field,
            "",
            new vscode.Location(
              document.uri,
              new vscode.Range(
                document.positionAt(fieldNode.start),
                document.positionAt(fieldNode.end)
              )
            )
          );
          result.push(symb);
          break;

        case NodeType.enum:
          const enumNode = node as EnumNode;
          symb = new vscode.SymbolInformation(
            enumNode.name,
            vscode.SymbolKind.Enum,
            "",
            new vscode.Location(
              document.uri,
              new vscode.Range(
                document.positionAt(enumNode.start),
                document.positionAt(enumNode.end)
              )
            )
          );
          result.push(symb);
          break;

        case NodeType.enumValue:
          const enumValueNode = node as EnumValueNode;
          symb = new vscode.SymbolInformation(
            enumValueNode.name,
            vscode.SymbolKind.EnumMember,
            "",
            new vscode.Location(
              document.uri,
              new vscode.Range(
                document.positionAt(enumValueNode.start),
                document.positionAt(enumValueNode.end)
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
