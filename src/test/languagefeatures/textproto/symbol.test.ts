import { expect } from "chai";
import * as vscode from "vscode";

import { textprotoSymbolProvider } from "../../../langaugefeatures/textproto/symbol";

suite("LanguageFeatrues >> TextProto >> SymbolProvider", () => {
  vscode.window.showInformationMessage("Start TextProto SymbolProvider tests.");

  test("should provide field type", async () => {
    return vscode.workspace
      .openTextDocument({
        language: "textproto",
        content: `
          enum_field: BAR float_field: 1.23
          decimal_field: 123456789

          # This is a comment.
          nested_field <
            nested_field2: {
              float_field: 1.23f
            }
          >
        `,
      })
      .then((doc) => {
        const symbols = textprotoSymbolProvider.provideDocumentSymbols(
          doc,
          new vscode.CancellationTokenSource().token
        ) as vscode.SymbolInformation[];

        expect(symbols.length).to.equal(6);
        expect(symbols[0].name).to.equal("enum_field");
        expect(symbols[0].kind).to.equal(vscode.SymbolKind.Field);
        expect(symbols[1].name).to.equal("float_field");
        expect(symbols[1].kind).to.equal(vscode.SymbolKind.Field);
        expect(symbols[2].name).to.equal("decimal_field");
        expect(symbols[2].kind).to.equal(vscode.SymbolKind.Field);
        expect(symbols[3].name).to.equal("nested_field");
        expect(symbols[3].kind).to.equal(vscode.SymbolKind.Field);
        expect(symbols[4].name).to.equal("nested_field2");
        expect(symbols[4].kind).to.equal(vscode.SymbolKind.Field);
        expect(symbols[5].name).to.equal("float_field");
        expect(symbols[5].kind).to.equal(vscode.SymbolKind.Field);
      });
  });
});
