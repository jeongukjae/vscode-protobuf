import { expect } from "chai";
import * as vscode from "vscode";

import { textprotoFormatProvider } from "../../../langaugefeatures/textproto/format";
import { isCommandAvailable } from "../../../utils";

suite("LanguageFeatures >> TextProto >> Format", () => {
  vscode.window.showInformationMessage("Start TextProto Format tests.");

  test("should be able to format temp with txtpbfmt", async () => {
    if (!isCommandAvailable("txtpbfmt")) {
      throw new Error(
        "txtpbfmt is not available. " +
          "Please install it and run this test again."
      );
    }

    let settings = vscode.workspace.getConfiguration("textproto");
    settings.update("format.provider", "txtpbfmt");
    settings.update("txtpbfmt.executable", "txtpbfmt");

    // no needs to check all format options.
    // just checking whether it works or not.
    let doc = await vscode.workspace.openTextDocument({
      language: "textproto",
      content: `foo: "bar"



      bar: "baz"
`,
    });

    await vscode.window.showTextDocument(doc);

    let edits = await textprotoFormatProvider.provideDocumentFormattingEdits(
      doc,
      {
        tabSize: 2,
        insertSpaces: true,
      },
      new vscode.CancellationTokenSource().token
    );

    expect(edits).to.be.lengthOf(1);
    expect(edits![0].newText).to.be.equal(`foo: "bar"

bar: "baz"
`);
  });
});
