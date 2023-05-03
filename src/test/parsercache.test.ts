import { expect } from "chai";
import * as vscode from "vscode";

import * as proto3Node from "../parser/proto3/nodes";
import * as textProtoNode from "../parser/textproto/nodes";
import { parseProto3, parseTextProto } from "../parsercache";

suite("utils", () => {
  test("should parse proto3 and return different result when doc is updated", async () => {
    let doc = await vscode.workspace.openTextDocument({
      language: "protobuf3",
      content: 'syntax = "proto3";',
    });

    const res1 = parseProto3(doc);
    expect(res1.children).to.have.lengthOf(1);
    expect(res1.children![0].type).to.equal(proto3Node.NodeType.syntax);

    let editor = await vscode.window.showTextDocument(doc);
    await editor.edit((edit) =>
      edit.insert(new vscode.Position(1, 0), "message Foo {}")
    );

    const res2 = parseProto3(doc);

    expect(res1).not.to.equal(res2);
    expect(res2.children).to.have.lengthOf(2);
    expect(res2.children![0].type).to.equal(proto3Node.NodeType.syntax);
    expect(res2.children![1].type).to.equal(proto3Node.NodeType.message);
  });

  test("should parse text proto and return different result when doc is updated", async () => {
    let doc = await vscode.workspace.openTextDocument({
      language: "textproto",
      content: "foo: bar",
    });

    const res1 = parseTextProto(doc);
    expect(res1.children).to.have.lengthOf(1);
    expect(res1.children![0].type).to.equal(textProtoNode.NodeType.field);

    let editor = await vscode.window.showTextDocument(doc);
    await editor.edit((edit) =>
      edit.insert(new vscode.Position(0, 0), "# comment\n")
    );

    const res2 = parseTextProto(doc);

    expect(res1).not.to.equal(res2);
    expect(res2.children).to.have.lengthOf(2);
    expect(res2.children![0].type).to.equal(textProtoNode.NodeType.comment);
    expect(res2.children![1].type).to.equal(textProtoNode.NodeType.field);
  });
});
