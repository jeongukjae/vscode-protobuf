import { expect } from "chai";
import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";

import {
  FieldNode,
  ImportNode,
  MessageNode,
  NodeType,
  OptionNode,
  PackageNode,
  SyntaxNode,
} from "../../../parser/nodes";
import { Proto3Parser } from "../../../parser/parser";
import { BooleanToken, FloatToken, IntegerToken } from "../../../parser/tokens";

describe("Parser", () => {
  [
    { input: "syntax;", expectedError: "Expected '=' after 'syntax'" },
    {
      input: 'syntax = "proto2";',
      expectedError: "Expected 'proto3' after 'syntax ='",
    },
    { input: 'syntax = "proto3"', expectedError: "Unexpected end of stream" },
    { input: "package", expectedError: "Unexpected end of stream" },
    { input: "package;", expectedError: "Expected name" },
    { input: "package .", expectedError: "Expected name" },
    { input: "package a.;", expectedError: "Unexpected token in name" },
    {
      input: "import a.proto",
      expectedError: "Expected file path or specific keyword after 'import'",
    },
  ].forEach((test) => {
    it(`parse error: \`${test.input}\` -> ${test.expectedError}`, () => {
      let parser = new Proto3Parser();
      expect(() => parser.parse(test.input)).to.throw(test.expectedError);
    });
  });

  [
    // basic syntax
    { input: `syntax = "proto3";` },
    { input: `package a.b.c;` },
    { input: `package google.rpc.aa;` },
    { input: `import 'a.proto';` },
    { input: `import public 'a.proto';` },

    // option name
    { input: `option (my_option) = true;` },
    { input: `option (my_option).option1 = true;` },
    { input: `option (my_option).name1.name2 = true;` },
    { input: `option my_option.name1.name2 = true;` },
    { input: `option name2 = true;` },

    // messages
    { input: `message A { option (my_option).bool_ = true; }` },
    { input: `message A { option (my_option).int_ = -1; }` },
    { input: `message A { option (my_option).float_ = -inf; }` },
    { input: `message A { option (my_option).float_ = -3.3e+2; }` },
    { input: `message A { option (my_option).ident_ = IDENT; }` },
    { input: `message A { int32 a = 1; float b = 2; }` },
    {
      input: `message A { oneof c { int32 a = 1; float b = 2; } int32 d = 3; }`,
    },
    { input: `message rpc { string name = 1; }` },

    // enums
    { input: `enum EnumName { A = 1; }` },
    { input: `enum EnumName { ; A = 1 [(custom_option) = "hello world"]; }` },
    { input: `enum EnumName { rpc = 1; }` },
  ].forEach((test) => {
    it(`parse success without error: \`${test.input}\``, () => {
      let parser = new Proto3Parser();

      parser.parse(test.input);
    });
  });

  it("parse success", () => {
    const input = `
syntax = "proto3";

package a.b.c;

import "a.proto";

message A {
    option (my_option).bool_ = true;
    option (my_option).int_ = -1;
    option (my_option).float_ = -inf;

    message B {}

    B b = 1;
    float c = 2;

    oneof d {
        int32 e = 3;
        float f = 4;
    }

    int32 g = 5;
}`;

    let parser = new Proto3Parser();
    let result = parser.parse(input);

    expect(result.children).not.to.be.undefined;
    expect(result.children).to.have.lengthOf(4);

    expect(result.children![0].type).to.equal(NodeType.syntax);
    expect((result.children![0] as SyntaxNode).version).to.equal("proto3");

    expect(result.children![1].type).to.equal(NodeType.package);
    expect((result.children![1] as PackageNode).name).to.equal("a.b.c");

    expect(result.children![2].type).to.equal(NodeType.import);
    expect((result.children![2] as ImportNode).path).to.equal('"a.proto"');

    let messageA = result.children![3] as MessageNode;
    expect(messageA.type).to.equal(NodeType.message);
    expect(messageA.name).to.equal("A");
    expect(messageA.children).to.have.lengthOf(8);

    expect((messageA.children![0] as OptionNode).name).to.equal(
      "(my_option).bool_"
    );
    expect(
      ((messageA.children![0] as OptionNode).value as BooleanToken).text
    ).to.equal("true");
    expect((messageA.children![1] as OptionNode).name).to.equal(
      "(my_option).int_"
    );
    expect(
      ((messageA.children![1] as OptionNode).value as IntegerToken).text
    ).to.equal("-1");
    expect((messageA.children![2] as OptionNode).name).to.equal(
      "(my_option).float_"
    );
    expect(
      ((messageA.children![2] as OptionNode).value as FloatToken).text
    ).to.equal("-inf");

    expect(messageA.children![3].type).to.equal(NodeType.message);
    expect((messageA.children![3] as MessageNode).name).to.equal("B");

    expect((messageA.children![4] as FieldNode).name).to.equal("b");
    expect((messageA.children![4] as FieldNode).dtype).to.equal("B");
    expect((messageA.children![5] as FieldNode).name).to.equal("c");
    expect((messageA.children![5] as FieldNode).dtype).to.equal("float");

    expect(messageA.children![6].type).to.equal(NodeType.oneof);
    expect(messageA.children![6].children).to.have.lengthOf(2);
    expect(messageA.children![6].children![0]).to.be.instanceOf(FieldNode);
    expect(messageA.children![6].children![1]).to.be.instanceOf(FieldNode);
    expect((messageA.children![6].children![0] as FieldNode).name).to.equal(
      "e"
    );
    expect((messageA.children![6].children![1] as FieldNode).name).to.equal(
      "f"
    );

    expect((messageA.children![7] as FieldNode).name).to.equal("g");
  });

  describe("Parsing all sample files", () => {
    const basedir = path.join(__dirname, "../../../../sample");
    glob.sync("**/*.proto", { cwd: basedir }).forEach((file) => {
      it(`should parse file: ${file}`, () => {
        let parser = new Proto3Parser();
        const filepath = path.join(basedir, file);
        const content = fs.readFileSync(filepath, "utf8");

        parser.parse(content);
      });
    });
  });
});
