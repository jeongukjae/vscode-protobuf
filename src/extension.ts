import * as vscode from 'vscode';
import { proto3FormatProvider } from './langaugefeatures/proto3Format';
import { textprotoFormatProvider } from './langaugefeatures/textprotoFormat';

export function activate(context: vscode.ExtensionContext) {
	// proto3
	vscode.languages.registerDocumentFormattingEditProvider('protobuf3', proto3FormatProvider);

	// textproto
	vscode.languages.registerDocumentFormattingEditProvider('textproto', textprotoFormatProvider);
}

export function deactivate() {

}
