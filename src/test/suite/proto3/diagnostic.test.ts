import { expect } from "chai";
import * as path from "path";
import * as vscode from "vscode";

import { doProto3Diagnostic } from "../../../langaugefeatures/proto3/diagnostic";
import { rootPath } from "../util";

const testFolder = path.resolve(rootPath, "testdata/proto3/diagnostics");

suite("Proto3 Diagnostics", () => {
  vscode.window.showInformationMessage("Start proto3Diagnostics tests.");

  test("Check empty syntax with api-linter", async () => {
    await vscode.commands.executeCommand(
      "vscode.openFolder",
      vscode.Uri.parse(`${testFolder}/without-syntax`)
    );

    console.log(vscode.workspace.getConfiguration());

    return vscode.workspace
      .openTextDocument(`${testFolder}/without-syntax/sample.proto`)
      .then((doc) => {
        let collection = vscode.languages.createDiagnosticCollection();
        doProto3Diagnostic(doc, collection);

        let diagnostics = collection.get(doc.uri);

        expect(diagnostics?.length).to.equal(1);
        expect(diagnostics?.[0].message).to.match(
          new RegExp(/^api-linter:.*proto3 syntax.*$/)
        );
      });
  });
});
