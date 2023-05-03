import { expect } from "chai";
import * as vscode from "vscode";

import { proto3FormatProvider } from "../../../langaugefeatures/proto3/format";
import { isCommandAvailable } from "../../../utils";

suite("LanguageFeatrues >> Proto3 >> Format", () => {
  vscode.window.showInformationMessage("Start proto3Format tests.");

  test("should be able to format temp with clang-format", async () => {
    if (!isCommandAvailable("clang-format")) {
      throw new Error(
        "clang-format is not available. " +
          "Please install it and run this test again."
      );
    }

    let settings = vscode.workspace.getConfiguration("protobuf3");
    settings.update("format.provider", "clang-format");
    settings.update("clang-format.executable", "clang-format");

    // no needs to check all format options.
    // just checking whether it works or not.
    let doc = await vscode.workspace.openTextDocument({
      language: "protobuf3",
      content: `syntax = "proto3";


      package com.example.format;`,
    });

    await vscode.window.showTextDocument(doc);

    let edits = await proto3FormatProvider.provideDocumentFormattingEdits(
      doc,
      {
        tabSize: 2,
        insertSpaces: true,
      },
      new vscode.CancellationTokenSource().token
    );

    expect(edits).to.be.lengthOf(1);
    expect(edits![0].newText).to.be.equal(`syntax = "proto3";

package com.example.format;
`);
  });

  test("should be able to format temp with buf", async () => {
    if (!isCommandAvailable("buf")) {
      throw new Error(
        "buf is not available. Please install it and run this test again."
      );
    }

    let settings = vscode.workspace.getConfiguration("protobuf3");
    await settings.update("format.provider", "buf");
    await settings.update("buf.executable", "buf");

    let doc = await vscode.workspace.openTextDocument({
      language: "protobuf3",
      content: `syntax = "proto3";


      package com.example.format;`,
    });

    await vscode.window.showTextDocument(doc);

    let edits = await proto3FormatProvider.provideDocumentFormattingEdits(
      doc,
      {
        tabSize: 2,
        insertSpaces: true,
      },
      new vscode.CancellationTokenSource().token
    );

    expect(edits).to.be.lengthOf(1);
    expect(edits![0].newText).to.be.equal(`syntax = "proto3";

package com.example.format;
`);
  });
});
