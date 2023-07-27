import { expect } from "chai";
import * as vscode from "vscode";

import { proto3Index } from "../proto3Index";

suite("Proto3Index", () => {
  vscode.window.showInformationMessage("Start proto3Index tests.");

  test("should be able to find msg", () => {
    expect(proto3Index).to.not.be.undefined;

    let samplemsg1 = proto3Index.findMsgOrEnum(
      "com.example.index",
      "IndexMsgSample1"
    );
    expect(samplemsg1).to.not.be.undefined;
    expect(samplemsg1.length).to.equal(1);
    expect(samplemsg1[0].link.targetUri.fsPath).to.match(
      /com\/example\/index\/index.proto/
    );
  });

  test("should be able to find nested msg", () => {
    expect(proto3Index).to.not.be.undefined;

    let samplemsg1 = proto3Index.findMsgOrEnum(
      "com.example.index",
      "IndexMsgSample2"
    );
    expect(samplemsg1).to.not.be.undefined;
    expect(samplemsg1.length).to.equal(1);
    expect(samplemsg1[0].link.targetUri.fsPath).to.match(
      /com\/example\/index\/index.proto/
    );
  });

  test("should be able to find enum", () => {
    expect(proto3Index).to.not.be.undefined;

    let samplemsg1 = proto3Index.findMsgOrEnum(
      "com.example.index",
      "IndexEnumSample1"
    );
    expect(samplemsg1).to.not.be.undefined;
    expect(samplemsg1.length).to.equal(1);
    expect(samplemsg1[0].link.targetUri.fsPath).to.match(
      /com\/example\/index\/index.proto/
    );
  });

  test("should be able to find nested enum", () => {
    expect(proto3Index).to.not.be.undefined;

    let samplemsg1 = proto3Index.findMsgOrEnum(
      "com.example.index",
      "IndexEnumSample2"
    );
    expect(samplemsg1).to.not.be.undefined;
    expect(samplemsg1.length).to.equal(1);
    expect(samplemsg1[0].link.targetUri.fsPath).to.match(
      /com\/example\/index\/index.proto/
    );
  });

  test("should be able to update index");
});
