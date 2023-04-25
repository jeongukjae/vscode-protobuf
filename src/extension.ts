import * as vscode from "vscode";

import { proto3DefinitionProvider } from "./langaugefeatures/proto3/definition";
import { doProto3Diagnostic } from "./langaugefeatures/proto3/diagnostic";
import { proto3FormatProvider } from "./langaugefeatures/proto3/format";
import { proto3SymbolProvider } from "./langaugefeatures/proto3/symbol";
import { textprotoFormatProvider } from "./langaugefeatures/textproto/format";

export function activate(context: vscode.ExtensionContext) {
  // proto3
  const diagnostics =
    vscode.languages.createDiagnosticCollection("protobuf-errors");

  vscode.languages.registerDocumentFormattingEditProvider(
    "protobuf3",
    proto3FormatProvider
  );
  vscode.languages.registerDocumentSymbolProvider(
    "protobuf3",
    proto3SymbolProvider
  );
  vscode.languages.registerDefinitionProvider(
    "protobuf3",
    proto3DefinitionProvider
  );
  vscode.workspace.onDidOpenTextDocument((document) => {
    if (document.languageId === "protobuf3") {
      doProto3Diagnostic(document, diagnostics);
    }
  });
  vscode.workspace.onDidSaveTextDocument((document) => {
    if (document.languageId === "protobuf3") {
      doProto3Diagnostic(document, diagnostics);
    }
  });

  // textproto
  vscode.languages.registerDocumentFormattingEditProvider(
    "textproto",
    textprotoFormatProvider
  );
}

export function deactivate() {}
