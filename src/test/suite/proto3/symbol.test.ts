import { expect } from "chai";
import * as vscode from "vscode";

import { proto3SymbolProvider } from "../../../langaugefeatures/proto3/symbol";
import { rootPath } from "../util";

suite("Proto3 Symbol Provider", () => {
  vscode.window.showInformationMessage("Start proto3SymbolProvider tests.");

  test("Should provide message type", async () => {
    return vscode.workspace
      .openTextDocument(`${rootPath}/com/example/symbol/message.proto`)
      .then((doc) => {
        const symbols = proto3SymbolProvider.provideDocumentSymbols(
          doc,
          new vscode.CancellationTokenSource().token
        ) as vscode.SymbolInformation[];

        expect(symbols.length).to.equal(1);
        expect(symbols[0].name).to.equal("Foo");
        expect(symbols[0].kind).to.equal(vscode.SymbolKind.Class);
      });
  });

  test("Should provide these symbols", async () => {
    return vscode.workspace
      .openTextDocument(`${rootPath}/com/example/symbol/sample.proto`)
      .then((doc) => {
        const symbols = proto3SymbolProvider.provideDocumentSymbols(
          doc,
          new vscode.CancellationTokenSource().token
        ) as vscode.SymbolInformation[];

        expect(symbols[0].name).to.equal("proto3");
        expect(symbols[0].kind).to.equal(vscode.SymbolKind.String);

        expect(symbols[1].name).to.equal("com.example.symbol");
        expect(symbols[1].kind).to.equal(vscode.SymbolKind.Package);

        expect(symbols[2].name).to.equal("java_package");
        expect(symbols[2].kind).to.equal(vscode.SymbolKind.Variable);

        expect(symbols[3].name).to.equal("FooMsg");
        expect(symbols[3].kind).to.equal(vscode.SymbolKind.Class);

        expect(symbols[4].name).to.equal("a");
        expect(symbols[4].kind).to.equal(vscode.SymbolKind.Field);

        expect(symbols[5].name).to.equal("b");
        expect(symbols[5].kind).to.equal(vscode.SymbolKind.Field);

        expect(symbols[6].name).to.equal("c");
        expect(symbols[6].kind).to.equal(vscode.SymbolKind.Field);

        expect(symbols[7].name).to.equal("d");
        expect(symbols[7].kind).to.equal(vscode.SymbolKind.Field);

        expect(symbols[8].name).to.equal("Bar");
        expect(symbols[8].kind).to.equal(vscode.SymbolKind.Enum);

        expect(symbols[9].name).to.equal("BAZ");
        expect(symbols[9].kind).to.equal(vscode.SymbolKind.EnumMember);

        expect(symbols[10].name).to.equal("Baz");
        expect(symbols[10].kind).to.equal(vscode.SymbolKind.Interface);

        expect(symbols[11].name).to.equal("Foo");
        expect(symbols[11].kind).to.equal(vscode.SymbolKind.Method);

        expect(symbols.length).to.equal(12);
      });
  });
});
