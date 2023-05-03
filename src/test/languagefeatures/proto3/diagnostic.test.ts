import { expect } from "chai";
import * as vscode from "vscode";

import { doProto3Diagnostic } from "../../../langaugefeatures/proto3/diagnostic";
import { isCommandAvailable } from "../../../utils";
import { rootPath } from "../../util";

suite("LanguageFeatrues >> Proto3 >> Diagnostics", () => {
  vscode.window.showInformationMessage("Start proto3Diagnostics tests.");

  test("should generate diagnostics with protoc", async () => {
    if (!isCommandAvailable("protoc")) {
      throw new Error(
        "protoc is not available. Please install it and run this test again."
      );
    }

    let settings = vscode.workspace.getConfiguration("protobuf3");
    await settings.update("compiler.provider", "protoc");
    await settings.update("protoc.executable", "protoc");
    await settings.update("buf.lint.enabled", false);

    return vscode.workspace
      .openTextDocument(`${rootPath}/another/diagnostics/protoc/broken.proto`)
      .then((doc) => {
        let collection = vscode.languages.createDiagnosticCollection();
        doProto3Diagnostic(doc, collection);

        let diagnostics_ = collection.get(doc.uri);

        // copy to mutable array.
        let diagnostics = diagnostics_
          ?.slice()
          .filter((d) => d.message.startsWith("protoc:"));

        // sort diagnostics by line and message to make it easy to test.
        diagnostics?.sort((a, b) => {
          if (a.range.start.line < b.range.start.line) {
            return -1;
          } else if (a.range.start.line > b.range.start.line) {
            return 1;
          } else {
            return a.message.localeCompare(b.message);
          }
        });

        expect(diagnostics?.length).to.equal(1);
        expect(diagnostics?.[0].message).to.match(
          new RegExp(/^protoc:.*Expected top-level statement.*$/)
        );
      });
  });

  test("should generate diagnostics with buf", async () => {
    if (!isCommandAvailable("buf")) {
      throw new Error(
        "buf is not available. Please install it and run this test again."
      );
    }

    let settings = vscode.workspace.getConfiguration("protobuf3");
    await settings.update("buf.lint.enabled", true);
    await settings.update("buf.executable", "buf");

    return vscode.workspace
      .openTextDocument(
        `${rootPath}/com/example/diagnostics/buf/packname/without_version.proto`
      )
      .then((doc) => {
        let collection = vscode.languages.createDiagnosticCollection();
        doProto3Diagnostic(doc, collection);

        let diagnostics_ = collection.get(doc.uri);

        // copy to mutable array.
        let diagnostics = diagnostics_
          ?.slice()
          .filter((d) => d.message.startsWith("buf:"));

        // sort diagnostics by line and message to make it easy to test.
        diagnostics?.sort((a, b) => {
          if (a.range.start.line < b.range.start.line) {
            return -1;
          } else if (a.range.start.line > b.range.start.line) {
            return 1;
          } else {
            return a.message.localeCompare(b.message);
          }
        });

        expect(diagnostics?.length).to.equal(1);
        expect(diagnostics?.[0].message).to.match(
          new RegExp(
            /^buf:.*should be suffixed with a correctly formed version.*$/
          )
        );
      });
  });

  test("should generate diagnostics with api-linter", async () => {
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

        let diagnostics_ = collection.get(doc.uri);

        // copy to mutable array.
        let diagnostics = diagnostics_
          ?.slice()
          .filter((d) => d.message.startsWith("api-linter:"));

        // sort diagnostics by line and message to make it easy to test.
        diagnostics?.sort((a, b) => {
          if (a.range.start.line < b.range.start.line) {
            return -1;
          } else if (a.range.start.line > b.range.start.line) {
            return 1;
          } else {
            return a.message.localeCompare(b.message);
          }
        });

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

  test("should ignore diagnostics api-linter with invalid path", async () => {
    let settings = vscode.workspace.getConfiguration("protobuf3");
    await settings.update("api-linter.enabled", true);
    await settings.update("api-linter.executable", "./some/invalid/path");

    return vscode.workspace
      .openTextDocument(`${rootPath}/com/example/diagnostics/empty.proto`)
      .then((doc) => {
        let collection = vscode.languages.createDiagnosticCollection();
        doProto3Diagnostic(doc, collection);

        let diagnostics_ = collection.get(doc.uri);
        let diagnostics = diagnostics_
          ?.slice()
          .filter((d) => d.message.startsWith("api-linter:"));
        // api-linter is not executed because of invalid path.
        expect(diagnostics?.length).to.equal(0);
      });
  });

  test("should generate diagnostics with api-linter and buf together");

  test("should generate diagnostics with protoc, buf and api-linter");

  test("should generate diagnostics with broken syntax using protoc and buf");
});
