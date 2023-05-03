import { expect } from "chai";
import * as vscode from "vscode";

import { proto3DefinitionProvider } from "../../../langaugefeatures/proto3/definition";
import { rootPath } from "../../util";

suite("LanguageFeatrues >> Proto3 >> Definition", () => {
  vscode.window.showInformationMessage("Start proto3Definition tests.");

  test("should go to definition in single file", async () => {
    let doc = await vscode.workspace.openTextDocument(
      `${rootPath}/com/example/definitions/find_in_single_file.proto`
    );
    let result = await proto3DefinitionProvider.provideDefinition(
      doc,
      new vscode.Position(6, 4),
      new vscode.CancellationTokenSource().token
    );

    let links = result as vscode.LocationLink[];

    expect(links).to.not.be.undefined;
    expect(links).lengthOf(1);
    expect(links[0].targetUri).to.equal(doc.uri);
    expect(links[0].targetRange.start.line).to.equal(9);
    expect(links[0].targetRange.start.character).to.equal(0);
    expect(links[0].targetRange.end.line).to.equal(11);
    expect(links[0].targetRange.end.character).to.equal(1);
  });

  test("should find definition in multiple files");

  test("should find multiple definitions in multiple files");

  test("should find import definition");

  test("should find multiple import definition");
});
