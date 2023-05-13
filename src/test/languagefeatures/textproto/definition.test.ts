import { expect } from "chai";
import * as vscode from "vscode";

import { textprotoDefinitionProvider } from "../../../langaugefeatures/textproto/definition";

suite("LanguageFeatures >> TextProto >> Definition", () => {
  vscode.window.showInformationMessage("Start TextProto Definition tests.");

  test("should go to definition for scalar field", async () => {
    let doc = await vscode.workspace.openTextDocument({
      language: "textproto",
      content: `# proto-file: com/example/textproto/defs/msg1.proto
# proto-message: SampleMessage

sample_field: "123"
`,
    });

    let links = (await textprotoDefinitionProvider.provideDefinition(
      doc,
      new vscode.Position(3, 0),
      new vscode.CancellationTokenSource().token
    )) as vscode.DefinitionLink[];

    expect(links).to.not.be.undefined;
    expect(links).lengthOf(1);

    expect(links[0].targetUri.fsPath).to.match(
      /.*com\/example\/textproto\/defs\/msg1.proto$/
    );
    expect(links[0].targetRange.start.line).to.equal(5);
    expect(links[0].targetRange.start.character).to.equal(2);
    expect(links[0].targetRange.end.line).to.equal(5);
    expect(links[0].targetRange.end.character).to.equal(26);
  });

  test("should go to definition for nested field");

  test("should go to definition for message field");

  test("should go to definition for map field");

  test("should go to definition for repeated field");

  test("should go to definition into imported file");
});
