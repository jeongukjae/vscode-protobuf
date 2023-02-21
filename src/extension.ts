import * as vscode from 'vscode';
import { doProto3Diagnostic } from './langaugefeatures/proto3Diagnostic';
import { proto3FormatProvider } from './langaugefeatures/proto3Format';
import { textprotoFormatProvider } from './langaugefeatures/textprotoFormat';

export function activate(context: vscode.ExtensionContext) {
	// proto3
	const diagnostics = vscode.languages.createDiagnosticCollection("protobuf-errors");

	vscode.languages.registerDocumentFormattingEditProvider('protobuf3', proto3FormatProvider);
	vscode.workspace.onDidOpenTextDocument((document) => {
		if (document.languageId === 'protobuf3') {
			doProto3Diagnostic(document, diagnostics);
		}
	});
	vscode.workspace.onDidSaveTextDocument((document) => {
		if (document.languageId === 'protobuf3') {
			doProto3Diagnostic(document, diagnostics);
		}
	});

	// textproto
	vscode.languages.registerDocumentFormattingEditProvider('textproto', textprotoFormatProvider);
}

export function deactivate() {

}
