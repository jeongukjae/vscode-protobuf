import { expect } from "chai";

import { NodeType } from "../../../../parser/textproto/nodes";
import { TextProtoParser } from "../../../../parser/textproto/parser";

describe("TextProtoParser", () => {
  [
    { input: "foo: bar" },
    { input: `foo: 12` },
    { input: "foo: '123'" },
    { input: "foo: 213f" },
    { input: "foo: 21.3f" },
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
  ].forEach((test) => {
    it(`should parse ${test.input}`, () => {
      let parser = new TextProtoParser();
      let document = parser.parse(test.input);

      expect(document.type).equal(NodeType.document);
      expect(document.start).equal(0);
      expect(document.end).equal(test.input.length);
    });
  });

  [
    {
      input: `nested: {
        foo: bar
      >`,
      error: "Expected identifier, but got >",
    },
  ].forEach((test) => {
    it(`should fail to parse: ${test.input}`, () => {
      let parser = new TextProtoParser();
      expect(() => parser.parse(test.input)).to.throw(test.error);
    });
  });
});
