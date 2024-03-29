import * as AdmZip from "adm-zip";
import { expect } from "chai";
import { https } from "follow-redirects";
import * as fs from "fs";
import * as glob from "glob";
import * as os from "os";
import * as path from "path";

import {
  FieldNode,
  ImportNode,
  MessageNode,
  NodeType,
  OptionNode,
  OptionValueNode,
  PackageNode,
  RPCNode,
  ServiceNode,
  SyntaxNode,
} from "../../../parser/proto3/nodes";
import { Proto3Parser } from "../../../parser/proto3/parser";

suite("Parser >> Proto3 >> Parser", () => {
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
  ].forEach((tc) => {
    test(`should raise error when parsing: \`${tc.input}\` -> ${tc.expectedError}`, () => {
      let parser = new Proto3Parser();
      expect(() => parser.parse(tc.input)).to.throw(tc.expectedError);
    });
  });

  [
    // basic syntax
    { input: `syntax = "proto3";` },
    { input: `package a.b.c;` },
    { input: `package google.rpc.aa;` },
    { input: `import 'a.proto';` },
    { input: `import public 'a.proto';` },

    // option
    { input: `option (my_option) = true;` },
    { input: `option (my_option).option1 = true;` },
    { input: `option (my_option).name1.name2 = true;` },
    { input: `option my_option.name1.name2 = true;` },
    { input: `option name2 = true;` },
    { input: `option name3 = "123" "456";` },

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
    { input: `message A { reserved 1, 3; }` },
    { input: `message A { reserved 1 to 3; }` },
    { input: `message A { reserved 1,2,3,1 to 3; }` },
    { input: `message A { reserved "abc"; }` },
    { input: `message A { reserved "abc", "cde"; }` },
    { input: `message A { .google.protobuf.Struct st_field = 1; }` },
    { input: `message A { repeated .google.protobuf.Struct st_field = 1; }` },

    // enums
    { input: `enum EnumName { A = 1; }` },
    { input: `enum EnumName { ; A = 1 [(custom_option) = "hello world"]; }` },
    { input: `enum EnumName { rpc = 1; }` },
    { input: `enum A { reserved 1, 3; }` },
    { input: `enum A { reserved 1 to 3; }` },
    { input: `enum A { reserved 1,2,3,1 to 3; }` },
    { input: `message A { reserved "abc"; }` },
    { input: `enum A { reserved "abc", "cde"; }` },

    // option value
    { input: `option (my_option).bool_ = true;` },
    { input: `option (my_option).int_ = { a: 1, b: 2 };` },
    { input: `option (my_option).int_ = { a: 1, b: { c: 2 } };` },
    {
      input: `option (my_option).int_ = {
      a: 1
      b: { c: 2 } };`,
    },

    // services
    { input: `service ServiceName { }` },
    {
      input: `service ServiceName {
        rpc MethodName (RequestType) returns (ResponseType);
      }`,
    },
    {
      input: `service ServiceName {
        rpc MethodName (stream RequestType) returns (ResponseType) {
          ;
        }
      }`,
    },
    {
      input: `service ServiceName {
        rpc MethodName (stream RequestType) returns (ResponseType) {
          option (google.api.http) = {
            post: "/v2/...+"
            body: "*"
          };
        }
      }`,
    },

    // ends with comment
    {
      input: `
      service ServiceName {
      }
      // comment`,
    },
  ].forEach((tc) => {
    test(`should parse without error: \`${tc.input}\``, () => {
      let parser = new Proto3Parser();

      parser.parse(tc.input);
    });
  });

  test("should parse this example", () => {
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
}

service ServiceName {
    // A simple RPC
    rpc MethodName (RequestType) returns (ResponseType) {
        option (google.api.http) = {
            post: "/sample/path"
            body: "*"
        };
    };

    // Streaming RPC
    rpc MethodName2 (stream RequestType2) returns (ResponseType2);
}
`;

    let parser = new Proto3Parser();
    let result = parser.parse(input);

    expect(result.children).not.to.be.undefined;
    expect(result.children).to.have.lengthOf(5);

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
      ((messageA.children![0] as OptionNode).value as OptionValueNode).text
    ).to.equal("true");
    expect((messageA.children![1] as OptionNode).name).to.equal(
      "(my_option).int_"
    );
    expect(
      ((messageA.children![1] as OptionNode).value as OptionValueNode).text
    ).to.equal("-1");
    expect((messageA.children![2] as OptionNode).name).to.equal(
      "(my_option).float_"
    );
    expect(
      ((messageA.children![2] as OptionNode).value as OptionValueNode).text
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

    let service = result.children![4] as ServiceNode;
    expect(service.type).to.equal(NodeType.service);
    expect(service.name).to.equal("ServiceName");
    expect(service.children).to.have.lengthOf(4);
    expect(service.children![0].type).to.equal(NodeType.comment);
    expect(service.children![1].type).to.equal(NodeType.rpc);
    let firstRpc = service.children![1] as RPCNode;
    expect(firstRpc.name).to.equal("MethodName");
    expect(firstRpc.request).to.equal("RequestType");
    expect(firstRpc.requestStream).to.equal(false);
    expect(firstRpc.response).to.equal("ResponseType");
    expect(firstRpc.responseStream).to.equal(false);
    expect(firstRpc.children).to.have.lengthOf(1);
    expect(firstRpc.children![0].type).to.equal(NodeType.option);
    expect((firstRpc.children![0] as OptionNode).name).to.equal(
      "(google.api.http)"
    );
    expect(service.children![2].type).to.equal(NodeType.comment);
    expect(service.children![3].type).to.equal(NodeType.rpc);
    let secondRpc = service.children![3] as RPCNode;
    expect(secondRpc.name).to.equal("MethodName2");
    expect(secondRpc.request).to.equal("RequestType2");
    expect(secondRpc.requestStream).to.equal(true);
    expect(secondRpc.response).to.equal("ResponseType2");
    expect(secondRpc.responseStream).to.equal(false);
    expect(secondRpc.children).to.be.undefined;
  });

  suite("should parse files in test-workspace", () => {
    const basedir = path.join(__dirname, "../../../../test-workspace");
    glob.sync("**/*.proto", { cwd: basedir }).forEach((file) => {
      test(`should parse file: ${file}`, () => {
        let parser = new Proto3Parser();
        const filepath = path.join(basedir, file);
        const content = fs.readFileSync(filepath, "utf8");

        parser.parse(content);
      });
    });
  });

  suite("Parsing sample repository without errors", () => {
    // download sample repository in temp directory
    const basedir = path.join(os.tmpdir(), "proto3-parser");
    const repositories = [
      {
        owner: "googleapis",
        repo: "googleapis",
      },
    ];

    setup(function () {
      return Promise.all(
        repositories.map((repo) => {
          const url = `https://github.com/${repo.owner}/${repo.repo}/archive/HEAD.zip`;
          const zipPath = path.join(basedir, repo.owner, `${repo.repo}.zip`);

          return new Promise<void>((resolve, reject) => {
            if (fs.existsSync(zipPath)) {
              return resolve();
            }

            fs.mkdirSync(path.dirname(zipPath), { recursive: true });
            const zipFile = fs.createWriteStream(zipPath);
            const request = https.get(url, (response) => {
              response.pipe(zipFile, { end: true });

              zipFile.on("finish", () => {
                resolve();
              });
            });

            request.on("error", (err) => {
              reject(err);
            });
          });
        })
      );
    });

    repositories.forEach((repo) => {
      test(`should parse ${repo.owner}/${repo.repo}`, function () {
        // open zipfile
        const zipPath = path.join(basedir, repo.owner, `${repo.repo}.zip`);

        const zip = new AdmZip(zipPath);
        zip.getEntries().forEach((entry) => {
          if (entry.entryName.endsWith(".proto")) {
            let parser = new Proto3Parser();
            const content = zip.readAsText(entry);

            try {
              parser.parse(content);
            } catch (err) {
              console.log(`Error while parsing file: ${entry.entryName}`);
              throw err;
            }
          }
        });
      });
    });
  });

  test("should parse starting comments", () => {
    let code = `
    // comment`;

    let parser = new Proto3Parser();
    let result = parser.parse(code);

    expect(result.children).to.have.lengthOf(1);
    expect(result.children![0].type).to.equal(NodeType.comment);
    expect(result.children![0].start).to.equal(5);
    expect(result.children![0].end).to.equal(code.length);
  });

  test("should parse successive starting comments", () => {
    let code = `
    // comment1
    // comment2`;

    let parser = new Proto3Parser();
    let result = parser.parse(code);

    expect(result.children).to.have.lengthOf(1);
    expect(result.children![0].type).to.equal(NodeType.comment);
    expect(result.children![0].start).to.equal(5);
    expect(result.children![0].end).to.equal(code.length);
  });
});
