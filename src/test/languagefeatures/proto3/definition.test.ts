import { expect } from "chai";
import * as vscode from "vscode";

import { proto3DefinitionProvider } from "../../../langaugefeatures/proto3/definition";
import { rootPath } from "../../util";

suite("LanguageFeatures >> Proto3 >> Definition", () => {
  vscode.window.showInformationMessage("Start proto3Definition tests.");
  // activate vscode extension
  suiteSetup(async () => {
    await vscode.extensions
      .getExtension("jeongukjae.vscode-protobuf")
      ?.activate();
  });

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

  test("should find definition in multiple files", async () => {
    let doc = await vscode.workspace.openTextDocument(
      `${rootPath}/com/example/definitions/find_in_another_file.proto`
    );
    let result = await proto3DefinitionProvider.provideDefinition(
      doc,
      new vscode.Position(8, 3),
      new vscode.CancellationTokenSource().token
    );

    let links = result as vscode.LocationLink[];

    expect(links).to.not.be.undefined;
    expect(links).lengthOf(1);

    expect(links[0].targetUri.fsPath).to.match(
      /.*com\/example\/definitions\/msg1.proto$/
    );
    expect(links[0].targetRange.start.line).to.equal(4);
    expect(links[0].targetRange.start.character).to.equal(0);
    expect(links[0].targetRange.end.line).to.equal(4);
    expect(links[0].targetRange.end.character).to.equal(15);
  });

  test("should find multiple definitions in multiple files", async () => {
    // NOTE: this is unexpected environment, but we should support it.

    let doc = await vscode.workspace.openTextDocument(
      `${rootPath}/com/example/definitions/find_dupl_msg.proto`
    );
    let result = await proto3DefinitionProvider.provideDefinition(
      doc,
      new vscode.Position(9, 3),
      new vscode.CancellationTokenSource().token
    );

    let links = result as vscode.LocationLink[];

    expect(links).to.not.be.undefined;
    expect(links).lengthOf(2);

    expect(links[0].targetUri.fsPath).to.match(
      /.*com\/example\/definitions\/msg2.proto$/
    );
    expect(links[0].targetRange.start.line).to.equal(4);
    expect(links[0].targetRange.start.character).to.equal(0);
    expect(links[0].targetRange.end.line).to.equal(4);
    expect(links[0].targetRange.end.character).to.equal(15);
    expect(links[1].targetUri.fsPath).to.match(
      /.*com\/example\/definitions\/msg2_dupl.proto$/
    );
    expect(links[1].targetRange.start.line).to.equal(4);
    expect(links[1].targetRange.start.character).to.equal(0);
    expect(links[1].targetRange.end.line).to.equal(4);
    expect(links[1].targetRange.end.character).to.equal(15);
  });

  test("should find import definition", async () => {
    let doc = await vscode.workspace.openTextDocument(
      `${rootPath}/com/example/definitions/imports/file1.proto`
    );
    let result = await proto3DefinitionProvider.provideDefinition(
      doc,
      new vscode.Position(5, 5),
      new vscode.CancellationTokenSource().token
    );

    let links = result as vscode.LocationLink[];

    expect(links).to.not.be.undefined;
    expect(links).lengthOf(1);
    expect(links[0].targetUri.fsPath).to.match(
      /.*com\/example\/definitions\/imports\/file3.proto$/
    );
    expect(links[0].targetRange.start.line).to.equal(0);
    expect(links[0].targetRange.start.character).to.equal(0);
    expect(links[0].targetRange.end.line).to.equal(0);
    expect(links[0].targetRange.end.character).to.equal(0);
  });

  test("should find multiple import definition", async () => {
    // NOTE: this is unexpected. but we should support it.
    let doc = await vscode.workspace.openTextDocument(
      `${rootPath}/com/example/definitions/imports/file1.proto`
    );
    let result = await proto3DefinitionProvider.provideDefinition(
      doc,
      new vscode.Position(4, 5),
      new vscode.CancellationTokenSource().token
    );

    let links = result as vscode.LocationLink[];

    links = links.sort((a, b) => {
      return a.targetUri.fsPath.localeCompare(b.targetUri.fsPath);
    });

    expect(links).to.not.be.undefined;
    expect(links).lengthOf(2);

    expect(links[0].targetUri.fsPath).to.match(
      /.*com\/example\/definitions\/imports\/dir1\/file2.proto$/
    );
    expect(links[0].targetRange.start.line).to.equal(0);
    expect(links[0].targetRange.start.character).to.equal(0);
    expect(links[0].targetRange.end.line).to.equal(0);
    expect(links[0].targetRange.end.character).to.equal(0);

    expect(links[1].targetUri.fsPath).to.match(
      /.*com\/example\/definitions\/imports\/file2.proto$/
    );
    expect(links[1].targetRange.start.line).to.equal(0);
    expect(links[1].targetRange.start.character).to.equal(0);
    expect(links[1].targetRange.end.line).to.equal(0);
    expect(links[1].targetRange.end.character).to.equal(0);
  });

  test.skip("should not be able to find msg from unimported file", async () => {
    let doc = await vscode.workspace.openTextDocument(
      `${rootPath}/com/example/definitions/unimported/unimported_source.proto`
    );
    let result = await proto3DefinitionProvider.provideDefinition(
      doc,
      new vscode.Position(5, 2),
      new vscode.CancellationTokenSource().token
    );

    let links = result as vscode.LocationLink[];

    expect(links).to.not.be.undefined;
    expect(links).lengthOf(0);
  });
});
