import * as vscode from 'vscode';
import { MessageNode, Node, NodeType } from '../parser/nodes';
import { Proto3Parser } from '../parser/parser';

const proto3Parser = new Proto3Parser();

export const proto3SymbolProvider: vscode.DocumentSymbolProvider = {
    provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SymbolInformation[]> {
        const result: vscode.SymbolInformation[] = [];

        const text = document.getText();
        const docNode = proto3Parser.parse(text);

        const walk = (node: Node, parentSymbolInformation?: vscode.SymbolInformation) => {
            switch (node.type) {
                case NodeType.message:
                    const msgNode = node as MessageNode;

                    const msgSymbol = new vscode.SymbolInformation(
                        msgNode.name,
                        vscode.SymbolKind.Class,
                        parentSymbolInformation ? parentSymbolInformation.name : "",
                        new vscode.Location(
                            document.uri,
                            new vscode.Range(document.positionAt(msgNode.start), document.positionAt(msgNode.start + msgNode.length))));
                    result.push(msgSymbol);

                    for (const child of msgNode.children || []) {
                        walk(child, msgSymbol);
                    }
                    break;

                default:
                    break;
            }
            // new vscode.SymbolInformation(tok, kind, "", location)
            // walk(node);
        };

        walk(docNode);

        return result;
    }
};
