import { expect } from "chai";
import * as vscode from "vscode";

import { doProto3Diagnostic } from "../../../langaugefeatures/proto3/diagnostic";
import { isCommandAvailable } from "../../../utils";
import { rootPath } from "../../util";

suite("Proto3 Diagnostics", () => {
  vscode.window.showInformationMessage("Start proto3Diagnostics tests.");

  test("Check empty syntax with api-linter", async () => {
    if (!isCommandAvailable("api-linter")) {
      throw new Error(
        "api-linter is not available. " +
          "Please install it and run this test again."
      );
    }

    let settings = vscode.workspace.getConfiguration("protobuf3");
    await settings.update("api-linter.enabled", true);
    await settings.update("api-linter.executable", "api-linter");

    return vscode.workspace
      .openTextDocument(`${rootPath}/com/example/diagnostics/empty.proto`)
      .then((doc) => {
        let collection = vscode.languages.createDiagnosticCollection();
        doProto3Diagnostic(doc, collection);

        let diagnostics = collection.get(doc.uri);

        // should use proto3 syntax.
        expect(diagnostics?.[0].message).to.match(
          new RegExp(/^api-linter:.*proto3 syntax.*$/)
        );
        // proto package should match the file directory.
        expect(diagnostics?.[1].message).to.match(
          new RegExp(/^api-linter:.*proto package.*$/)
        );
        expect(diagnostics?.length).to.equal(2);
      });
  });

  test("Check api-linter with invalid path", async () => {
    let settings = vscode.workspace.getConfiguration("protobuf3");
    await settings.update("api-linter.enabled", true);
    await settings.update("api-linter.executable", "./some/invalid/path");

    return vscode.workspace
      .openTextDocument(`${rootPath}/com/example/diagnostics/empty.proto`)
      .then((doc) => {
        let collection = vscode.languages.createDiagnosticCollection();
        doProto3Diagnostic(doc, collection);

        let diagnostics = collection.get(doc.uri);
        // api-linter is not executed because of invalid path.
        expect(diagnostics?.length).to.equal(0);
      });
  });
});
