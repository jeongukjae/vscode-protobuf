import { expect } from "chai";

import {
  CommentNode,
  FieldNode,
  NodeType,
} from "../../../parser/textproto/nodes";
import { TextProtoParser } from "../../../parser/textproto/parser";
import { CommentToken } from "../../../parser/textproto/tokens";

suite("Text Proto Parser", () => {
  [
    { input: "# comment" },
    { input: "foo: bar" },
    { input: `foo: 12` },
    { input: "foo: '123'" },
    { input: "foo: 213f" },
    { input: "foo: 21.3f" },
    { input: "foo: 21.3f bar: 'abc'" },
    { input: "foo: 21.3f; bar: 'abc'" },
    { input: "foo: 21.3f, bar: 'abc'" },
    { input: "[com.foo.ext.scalar]: 10" },
    { input: "[com.foo.ext.message]: {foo:'bar'}" },
    {
      input: `
      any_value: {
        [types.goolgeapis.com/com.foo.any]: {
          foo: 'bar'
        }
      }
    `,
    },
    { input: `foo: -213` },
    { input: `foo: -213f` },
    {
      input: `value: -
      2.0         # Valid: whitespace and comments between '-' and '2.0'.`,
    },
    {
      input: `quote:
        "When we got into office, the thing that surprised me most was to find "
        "that things were just as bad as we'd been saying they were.\n\n"
        "  -- John F. Kennedy"`,
    },
    {
      input: `nested: {
        foo: bar
      }`,
    },
    {
      input: `nested: {
        more_nested: {
          foo: bar
        }
      }`,
    },
    {
      input: `nested: <
        foo: bar
      >`,
    },
    {
      input: `nested: <
        more_nested: <
          foo: bar
        >
      >`,
    },
    {
      input: `nested: <
        more_nested: {
          foo: bar
        }
      >`,
    },
    {
      input: `nested <
        foo: bar
      >`,
    },
    {
      input: `nested {
        foo: bar
      }`,
    },
  ].forEach((tc) => {
    test(`should parse ${tc.input}`, () => {
      let parser = new TextProtoParser();
      let document = parser.parse(tc.input);

      expect(document.type).to.equal(NodeType.document);
      expect(document.tokens.length).to.be.greaterThan(0);
    });
  });

  [
    {
      input: `nested: {
        foo: bar
      >`,
      error: "Expected identifier, but got >",
    },
  ].forEach((tc) => {
    test(`should fail to parse: ${tc.input}`, () => {
      let parser = new TextProtoParser();
      expect(() => parser.parse(tc.input)).to.throw(tc.error);
    });
  });

  test("should parse whole sample textproto", () => {
    let parser = new TextProtoParser();
    let document = parser.parse(`
    enum_field: BAR float_field: 1.23
    decimal_field: 123456789

    # This is a comment.
    nested_field <
      nested_field2: {
        float_field: 1.23f
      }
    >
    `);

    expect(document.type).to.equal(NodeType.document);
    expect(document.tokens).to.have.length(20);

    expect(document.children).to.have.length(5);

    let enumField = document.children![0] as FieldNode;
    expect(enumField.type).to.equal(NodeType.field);
    expect(enumField.tokens).to.have.length(3);
    expect(enumField.key!.tokens).to.have.length(1);
    expect(enumField.key!.tokens[0].start).to.equal(5); // enum_field
    expect(enumField.key!.tokens[0].length).to.equal(10);
    expect(enumField.value!.tokens).to.have.length(1);
    expect(enumField.value!.tokens[0].start).to.equal(17); // BAR
    expect(enumField.value!.tokens[0].length).to.equal(3);

    let floatField = document.children![1] as FieldNode;
    expect(floatField.type).to.equal(NodeType.field);
    expect(floatField.tokens).to.have.length(3);
    expect(floatField.key!.tokens).to.have.length(1);
    expect(floatField.key!.tokens[0].start).to.equal(21); // float_field
    expect(floatField.key!.tokens[0].length).to.equal(11);
    expect(floatField.value!.tokens).to.have.length(1);
    expect(floatField.value!.tokens[0].start).to.equal(34); // 1.23
    expect(floatField.value!.tokens[0].length).to.equal(4);

    let decimalField = document.children![2] as FieldNode;
    expect(decimalField.type).to.equal(NodeType.field);
    expect(decimalField.tokens).to.have.length(3);
    expect(decimalField.key!.tokens).to.have.length(1);
    expect(decimalField.key!.tokens[0].start).to.equal(43); // decimal_field
    expect(decimalField.key!.tokens[0].length).to.equal(13);
    expect(decimalField.value!.tokens).to.have.length(1);
    expect(decimalField.value!.tokens[0].start).to.equal(58); // 123456789
    expect(decimalField.value!.tokens[0].length).to.equal(9);

    let comment = document.children![3] as CommentNode;
    expect(comment.type).to.equal(NodeType.comment);
    expect(comment.tokens).to.have.length(1);
    expect(comment.tokens[0].start).to.equal(73); // This is a comment.
    expect(comment.tokens[0].length).to.equal(20);

    let nestedField = document.children![4] as FieldNode;
    expect(nestedField.type).to.equal(NodeType.field);
    expect(nestedField.tokens).to.have.length(10);
    expect(nestedField.key!.tokens).to.have.length(1);
    expect(nestedField.key!.tokens[0].start).to.equal(98); // nested_field
    expect(nestedField.key!.tokens[0].length).to.equal(12);
    expect(nestedField.value!.tokens).to.have.length(9);
    expect(nestedField.value!.tokens[0].start).to.equal(111); // <
    expect(nestedField.value!.tokens[0].length).to.equal(1);

    let nestedField2 = nestedField.value?.children[0] as FieldNode;
    expect(nestedField2.type).to.equal(NodeType.field);
    expect(nestedField2.tokens).to.have.length(7);
    expect(nestedField2.key!.tokens).to.have.length(1);
    expect(nestedField2.key!.tokens[0].start).to.equal(119); // nested_field2
    expect(nestedField2.key!.tokens[0].length).to.equal(13);
    expect(nestedField2.value!.tokens).to.have.length(5);
    expect(nestedField2.value!.tokens[0].start).to.equal(134); // {
    expect(nestedField2.value!.tokens[0].length).to.equal(1);

    let floatField2 = nestedField2.value?.children[0] as FieldNode;
    expect(floatField2.type).to.equal(NodeType.field);
    expect(floatField2.tokens).to.have.length(3);
    expect(floatField2.key!.tokens).to.have.length(1);
    expect(floatField2.key!.tokens[0].start).to.equal(144); // float_field
    expect(floatField2.key!.tokens[0].length).to.equal(11);
    expect(floatField2.value!.tokens).to.have.length(1);
    expect(floatField2.value!.tokens[0].start).to.equal(157); // 1.23f
    expect(floatField2.value!.tokens[0].length).to.equal(5);
  });

  test("should parse a float literal containing comment", () => {
    let code = `value: -
    2.0         # Valid: whitespace and comments between '-' and '2.0'.`;
    let parser = new TextProtoParser();

    let document = parser.parse(code);

    expect(document.type).to.equal(NodeType.document);
    expect(document.tokens).to.have.length(5);
    expect(document.children!.length).to.equal(2);

    let value = document.children![0] as FieldNode;
    expect(value.type).to.equal(NodeType.field);
    expect(value.tokens).to.have.length(4);
    expect(value.key!.tokens).to.have.length(1);
    expect(value.key!.tokens[0].start).to.equal(0); // value
    expect(value.key!.tokens[0].length).to.equal(5);
    expect(value.value!.tokens).to.have.length(2);
    expect(value.value!.tokens[0].start).to.equal(7); // -
    expect(value.value!.tokens[0].length).to.equal(1);
    expect(value.value!.tokens[1].start).to.equal(13); // 2.0
    expect(value.value!.tokens[1].length).to.equal(3);

    let comment = document.children![1] as CommentNode;
    expect(comment.type).to.equal(NodeType.comment);
    expect(comment.tokens).to.have.length(1);
    expect(comment.tokens[0].start).to.equal(25);
    expect(comment.tokens[0].length).to.equal(55);
  });

  test("should parse repeated field", () => {
    let code = `
      foo: [1,2,3]
    `;

    let parser = new TextProtoParser();

    let document = parser.parse(code);

    expect(document.type).to.equal(NodeType.document);
    expect(document.tokens).to.have.length(9);
    expect(document.children).to.have.length(1);

    let foo = document.children![0] as FieldNode;
    expect(foo.type).to.equal(NodeType.field);
    expect(foo.tokens).to.have.length(9);
    expect(foo.key!.tokens).to.have.length(1);
    expect(foo.key!.tokens[0].start).to.equal(7); // foo
    expect(foo.key!.tokens[0].length).to.equal(3);
    expect(foo.value!.tokens).to.have.length(7);
  });

  test("should parse starting comment", () => {
    let code = `# comment`;

    let parser = new TextProtoParser();

    let document = parser.parse(code);

    expect(document.type).to.equal(NodeType.document);
    expect(document.tokens).to.have.length(1);
    expect(document.children).to.have.length(1);

    let comment = document.children![0] as CommentNode;
    expect(comment.type).to.equal(NodeType.comment);
    expect(comment.tokens).to.have.length(1);
    expect((comment.tokens[0] as CommentToken).text).to.equal("# comment");
  });

  test("should parse successive comments", () => {
    let code = `# comment
    # comment 2`;

    let parser = new TextProtoParser();

    let document = parser.parse(code);

    expect(document.type).to.equal(NodeType.document);
    expect(document.tokens).to.have.length(2);
    expect(document.children).to.have.length(1);

    let comment = document.children[0] as CommentNode;
    expect(comment.type).to.equal(NodeType.comment);
    expect(comment.tokens).to.have.length(2);
    expect((comment.tokens[0] as CommentToken).text).to.equal("# comment");
    expect((comment.tokens[1] as CommentToken).text).to.equal("# comment 2");
  });
});
