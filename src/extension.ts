import * as vscode from "vscode";

import { proto3DefinitionProvider } from "./langaugefeatures/proto3/definition";
import { doProto3Diagnostic } from "./langaugefeatures/proto3/diagnostic";
import { proto3FormatProvider } from "./langaugefeatures/proto3/format";
import { proto3SymbolProvider } from "./langaugefeatures/proto3/symbol";
import { textprotoFormatProvider } from "./langaugefeatures/textproto/format";
import { textprotoSymbolProvider } from "./langaugefeatures/textproto/symbol";
import { proto3Index } from "./proto3Index";

const PROTO3_ID = "protobuf3";
const TEXT_PROTO_ID = "textproto";

export async function activate(context: vscode.ExtensionContext) {
  await proto3Index.initialize();

  // proto3
  const diagnostics =
    vscode.languages.createDiagnosticCollection("protobuf-errors");

  vscode.languages.registerDocumentFormattingEditProvider(
    PROTO3_ID,
    proto3FormatProvider
  );
  vscode.languages.registerDocumentSymbolProvider(
    PROTO3_ID,
    proto3SymbolProvider
  );
  vscode.languages.registerDefinitionProvider(
    PROTO3_ID,
    proto3DefinitionProvider
  );
  vscode.workspace.onDidOpenTextDocument((document) => {
    if (document.languageId === PROTO3_ID) {
      doProto3Diagnostic(document, diagnostics);
    }
  });
  vscode.workspace.onDidSaveTextDocument((document) => {
    if (document.languageId === PROTO3_ID) {
      doProto3Diagnostic(document, diagnostics);
    }
  });

  vscode.workspace
    .createFileSystemWatcher("**/*.proto")
    .onDidChange((e: vscode.Uri) => {
      proto3Index.updateFile(e);
    });

  // textproto
  vscode.languages.registerDocumentFormattingEditProvider(
    TEXT_PROTO_ID,
    textprotoFormatProvider
  );
  vscode.languages.registerDocumentSymbolProvider(
    TEXT_PROTO_ID,
    textprotoSymbolProvider
  );
}

export function deactivate() {}
