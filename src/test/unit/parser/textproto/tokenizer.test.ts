import { expect } from "chai";

import { TextProtoTokenizer } from "../../../../parser/textproto/tokenizer";
import {
  FloatToken,
  IntegerToken,
  Token,
  TokenType,
} from "../../../../parser/textproto/tokens";

describe("TextProtoTokenizer", () => {
  it("should tokenize", () => {
    const input = `
    # This is an example of Protocol Buffer's text format.
    # Unlike .proto files, only shell-style line comments are supported.

    name: "John Smith"

    pet {
        kind: DOG
        name: "Fluffy"
        tail_wagginess: 0.65f
    }

    pet <
        kind: LIZARD
        name: "Lizzy"
        legs: 4
    >

    repeated_values: [ "one", "two", "three" ]

    any_value {
        [type.googleapis.com/com.example.SomeType] {
          field1: "hello"
        }
    }
    `;

    const expectedTokens: Token[] = [
      Token.create(TokenType.comment, 5, 54), // #
      Token.create(TokenType.comment, 64, 68), // #
      Token.create(TokenType.identifier, 138, 4), // name
      Token.create(TokenType.colon, 142, 1), // :
      Token.create(TokenType.string, 144, 12), // "John Smith"
      Token.create(TokenType.identifier, 162, 3), // pet
      Token.create(TokenType.openBrace, 166, 1), // {
      Token.create(TokenType.identifier, 176, 4), // kind
      Token.create(TokenType.colon, 180, 1), // :
      Token.create(TokenType.identifier, 182, 3), // DOG
      Token.create(TokenType.identifier, 194, 4), // name
      Token.create(TokenType.colon, 198, 1), // :
      Token.create(TokenType.string, 200, 8), // "Fluffy"
      Token.create(TokenType.identifier, 217, 14), // tail_wagginess
      Token.create(TokenType.colon, 231, 1), // :
      Token.create(TokenType.float, 233, 5), // 0.65f
      Token.create(TokenType.closeBrace, 243, 1), // }
      Token.create(TokenType.identifier, 250, 3), // pet
      Token.create(TokenType.less, 254, 1), // <
      Token.create(TokenType.identifier, 264, 4), // kind
      Token.create(TokenType.colon, 268, 1), // :
      Token.create(TokenType.identifier, 270, 6), // LIZARD
      Token.create(TokenType.identifier, 285, 4), // name
      Token.create(TokenType.colon, 289, 1), // :
      Token.create(TokenType.string, 291, 7), // "Lizzy"
      Token.create(TokenType.identifier, 307, 4), // legs
      Token.create(TokenType.colon, 311, 1), // :
      Token.create(TokenType.integer, 313, 1), // 4
      Token.create(TokenType.greater, 319, 1), // >
      Token.create(TokenType.identifier, 326, 15), // repeated_values
      Token.create(TokenType.colon, 341, 1), // :
      Token.create(TokenType.openBracket, 343, 1), // [
      Token.create(TokenType.string, 345, 5), // "one"
      Token.create(TokenType.comma, 350, 1), // ,
      Token.create(TokenType.string, 352, 5), // "two"
      Token.create(TokenType.comma, 357, 1), // ,
      Token.create(TokenType.string, 359, 7), // "three"
      Token.create(TokenType.closeBracket, 367, 1), // ]
      Token.create(TokenType.identifier, 374, 9), // any_value
      Token.create(TokenType.openBrace, 384, 1), // {
      Token.create(TokenType.openBracket, 394, 1), // [
      Token.create(TokenType.identifier, 395, 4), // type
      Token.create(TokenType.dot, 399, 1), // .
      Token.create(TokenType.identifier, 400, 10), // googleapis
      Token.create(TokenType.dot, 410, 1), // .
      Token.create(TokenType.identifier, 411, 3), // com
      Token.create(TokenType.slash, 414, 1), // /
      Token.create(TokenType.identifier, 415, 3), // com
      Token.create(TokenType.dot, 418, 1), // .
      Token.create(TokenType.identifier, 419, 7), // example
      Token.create(TokenType.dot, 426, 1), // ,
      Token.create(TokenType.identifier, 427, 8), // SomeType
      Token.create(TokenType.closeBracket, 435, 1), // ]
      Token.create(TokenType.openBrace, 437, 1), // {
      Token.create(TokenType.identifier, 449, 6), // field1
      Token.create(TokenType.colon, 455, 1), // :
      Token.create(TokenType.string, 457, 7), // "hello"
      Token.create(TokenType.closeBrace, 473, 1), // }
      Token.create(TokenType.closeBrace, 479, 1), // }
    ];
    const tokenizer = new TextProtoTokenizer();
    const tokens = tokenizer.tokenize(input);

    for (let i = 0; i < Math.min(tokens.length, expectedTokens.length); i++) {
      const token = tokens[i];
      const expected = expectedTokens[i];

      expect(token.type).to.equal(expected.type, `Token ${i} type`);
      expect(token.start).to.equal(expected.start, `Token ${i} start`);
      expect(token.length).to.equal(expected.length, `Token ${i} length`);
    }
    expect(tokens.length).to.equal(expectedTokens.length);
  });

  it("should tokenize a single line comment", () => {
    const input = "# this is a single line comment";
    const tokenizer = new TextProtoTokenizer();
    const tokens = tokenizer.tokenize(input);

    expect(tokens.length).to.equal(1);
    expect(tokens[0].type).to.equal(TokenType.comment);
    expect(tokens[0].start).to.equal(0);
    expect(tokens[0].length).to.equal(input.length);
  });

  describe("String", () => {
    [
      { name: "double quote", input: '"this is a string"' },
      { name: "single quote", input: "'this is a string'" },
      { name: "hex escape", input: "'this is a \\x0A string'" },
      { name: "octal escape", input: "'this is a \\012 string'" },
      { name: "char escape", input: "'this is a \\n string'" },
      { name: "quote scape", input: "'this is a \\' string'" },
      { name: "backslash escape", input: "'this is a \\\\ string'" },
    ].forEach((test) => {
      it(`should tokenize a string: ${test.name}`, () => {
        const tokenizer = new TextProtoTokenizer();
        const tokens = tokenizer.tokenize(test.input);

        expect(tokens.length).to.equal(1);
        expect(tokens[0].type).to.equal(TokenType.string);
        expect(tokens[0].start).to.equal(0);
        expect(tokens[0].length).to.equal(test.input.length);
      });
    });
  });

  describe("Number", () => {
    [
      { name: "basic case", input: "0" },
      { name: "basic case with negative sign", input: "-123" },
      { name: "basic case with positive sign", input: "+123" },
      { name: "hex digits", input: "0x1234" },
      { name: "hex digits with leading 0", input: "0x01234" },
      {
        name: "hex digits with leading 0 and negative sign",
        input: "-0x01234",
      },
      {
        name: "hex digits with leading 0 and positive sign",
        input: "+0x01234",
      },
      { name: "octal digits", input: "01234" },
      { name: "octal digits with leading 0", input: "001234" },
      {
        name: "octal digits with leading 0 and negative sign",
        input: "-001234",
      },
      {
        name: "octal digits with leading 0 and positive sign",
        input: "+001234",
      },
    ].forEach((test) => {
      it(`should tokenize an integer: ${test.name}`, () => {
        const tokenizer = new TextProtoTokenizer();
        const tokens = tokenizer.tokenize(test.input);

        expect(tokens.length).to.equal(1);
        expect(tokens[0].type).to.equal(TokenType.integer);
        expect(tokens[0].start).to.equal(0);
        expect(tokens[0].length).to.equal(test.input.length);
        expect((tokens[0] as IntegerToken).text).to.equal(test.input);
      });
    });

    [
      { name: "floating point", input: "123.456" },
      { name: "floating point with f suffix 1", input: "123f" },
      { name: "floating point with f suffix 2", input: "123.456f" },
      { name: "floating point with negative sign", input: "-123.456" },
      { name: "floating point with positive sign", input: "+123.456" },
      { name: "floating point without leading 0", input: ".456" },
      { name: "floating point with exponent", input: "123.456e-7" },
      { name: "floating point with exponent 2", input: "123.456E+7" },
    ].forEach((test) => {
      it(`should tokenize a floating point number: ${test.name}`, () => {
        const tokenizer = new TextProtoTokenizer();
        const tokens = tokenizer.tokenize(test.input);

        expect(tokens.length).to.equal(1);
        expect(tokens[0].type).to.equal(TokenType.float);
        expect(tokens[0].start).to.equal(0);
        expect(tokens[0].length).to.equal(test.input.length);
        expect((tokens[0] as FloatToken).text).to.equal(test.input);
      });
    });
  });
});
