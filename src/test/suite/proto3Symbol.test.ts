import {expect} from 'chai';

import * as vscode from 'vscode';
import { proto3SymbolProvider } from '../../langaugefeatures/proto3Symbol';

suite('Proto3 Symbol Provider', () => {
	vscode.window.showInformationMessage('Start proto3SymbolProvider tests.');

	test('Should provide message type', () => {
        vscode.workspace.openTextDocument({language: 'proto3', content: "message Foo { }"}).then((doc) => {
            const symbols = proto3SymbolProvider.provideDocumentSymbols(doc, new vscode.CancellationTokenSource().token) as vscode.SymbolInformation[];

            expect(symbols.length).to.equal(1);
            expect(symbols[0].name).to.equal("Foo");
            expect(symbols[0].kind).to.equal(vscode.SymbolKind.Class);
        });
	});
});
