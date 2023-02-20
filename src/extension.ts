import * as vscode from 'vscode';
import { proto3FormatProvider } from './langaugefeatures/proto3format';

export function activate(context: vscode.ExtensionContext) {
	vscode.languages.registerDocumentFormattingEditProvider('protobuf3', proto3FormatProvider);
}

export function deactivate() {

}
