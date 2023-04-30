import { expect } from "chai";

import {
  CommentNode,
  NodeType,
  ValueNode,
} from "../../../parser/textproto/nodes";
import { TextProtoParser } from "../../../parser/textproto/parser";

suite("TextProtoParser", () => {
  [
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
      # comment
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

      expect(document.type).equal(NodeType.document);
      expect(document.start).equal(0);
      expect(document.end).equal(tc.input.length);
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

  test("Check Output", () => {
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

    expect(document.type).equal(NodeType.document);
    expect(document.start).equal(0);
    expect(document.end).equal(181);

    expect(document.children!.length).equal(5);

    let enumField = document.children![0] as ValueNode;
    expect(enumField.type).equal(NodeType.field);
    expect(enumField.name).equal("enum_field");
    expect(enumField.start).equal(5);
    expect(enumField.end).equal(20);

    let floatField = document.children![1] as ValueNode;
    expect(floatField.type).equal(NodeType.field);
    expect(floatField.name).equal("float_field");
    expect(floatField.start).equal(21);
    expect(floatField.end).equal(38);

    let decimalField = document.children![2] as ValueNode;
    expect(decimalField.type).equal(NodeType.field);
    expect(decimalField.name).equal("decimal_field");
    expect(decimalField.start).equal(43);
    expect(decimalField.end).equal(67);

    let comment = document.children![3] as CommentNode;
    expect(comment.type).equal(NodeType.comment);
    expect(comment.start).equal(73);
    expect(comment.end).equal(93);

    let nestedField = document.children![4] as ValueNode;
    expect(nestedField.type).equal(NodeType.field);
    expect(nestedField.name).equal("nested_field");
    expect(nestedField.start).equal(98);
    expect(nestedField.end).equal(176);
    expect(nestedField.nested).equal(true);

    let nestedField2 = nestedField.children![0] as ValueNode;
    expect(nestedField2.type).equal(NodeType.field);
    expect(nestedField2.name).equal("nested_field2");
    expect(nestedField2.start).equal(119);
    expect(nestedField2.end).equal(170);
    expect(nestedField2.nested).equal(true);

    let floatField2 = nestedField2.children![0] as ValueNode;
    expect(floatField2.type).equal(NodeType.field);
    expect(floatField2.name).equal("float_field");
    expect(floatField2.start).equal(144);
    expect(floatField2.end).equal(162);
  });

  test("Check comment inside float literal", () => {
    let code = `value: -
    # comment
    2.0         # Valid: whitespace and comments between '-' and '2.0'.`;
    let parser = new TextProtoParser();

    let document = parser.parse(code);

    expect(document.type).equal(NodeType.document);
    expect(document.start).equal(0);
    expect(document.end).equal(code.length);
    expect(document.children!.length).equal(2);

    let value = document.children![0] as ValueNode;
    expect(value.type).equal(NodeType.field);
    expect(value.name).equal("value");
    expect(value.start).equal(0);
    expect(value.end).equal(30);

    let comment = document.children![1] as CommentNode;
    expect(comment.type).equal(NodeType.comment);
    expect(comment.start).equal(39);
    expect(comment.end).equal(code.length);
  });

  test("Check repeated field", () => {
    let code = `
      foo: [1,2,3]
    `;

    let parser = new TextProtoParser();

    let document = parser.parse(code);

    expect(document.type).equal(NodeType.document);
    expect(document.start).equal(0);
    expect(document.end).equal(code.length);

    let foo = document.children![0] as ValueNode;
    expect(foo.type).equal(NodeType.field);
    expect(foo.name).equal("foo");
    expect(foo.start).equal(7);
    expect(foo.end).equal(19);
  });
});
