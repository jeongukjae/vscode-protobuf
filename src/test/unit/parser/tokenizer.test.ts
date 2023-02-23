import {expect} from 'chai';
import {Proto3Tokenizer} from '../../../parser/tokenizer';
import { Comment, IntegerToken, FloatToken, TokenType, BooleanToken, Token, KeywordToken, KeywordType, PrimitiveTypeToken, PrimitiveType } from '../../../parser/tokens';

describe('Tokenizer', () => {
    it("should tokenize", () => {
        const input = `
syntax = "proto3";

import public "other.proto";

option java_package = "com.example.foo";

enum EnumAllowingAlias {
    option allow_alias = true;
    EAA_UNSPECIFIED = 0;
    EAA_STARTED = 1;
    EAA_RUNNING = 1;
    EAA_FINISHED = 2 [(custom_option) = "hello world"];
}
message Outer {
    option (my_option).a = true;
    message Inner {   // Level 2
        int64 ival = 1;
    }
    repeated Inner inner_message = 2;
    EnumAllowingAlias enum_field = 3;
    map<int32, string> my_map = 4;
}
`;

        const expectedTokens: Token[] = [
            // syntax = "proto3";
            new KeywordToken(1, 6, "syntax", KeywordType.syntax),
            Token.create(TokenType.operator, 8, 1),
            Token.create(TokenType.string, 10, 8),
            Token.create(TokenType.semicolon, 18, 1),

            // impot public "other.proto";
            new KeywordToken(21, 6, "import", KeywordType.import),
            new KeywordToken(28, 6, "public", KeywordType.public),
            Token.create(TokenType.string, 35, 13),
            Token.create(TokenType.semicolon, 48, 1),

            // option java_package = "com.example.foo";
            new KeywordToken(51, 6, "option", KeywordType.option),
            Token.create(TokenType.identifier, 58, 12),
            Token.create(TokenType.operator, 71, 1),
            Token.create(TokenType.string, 73, 17),
            Token.create(TokenType.semicolon, 90, 1),

            // enum EnumAllowingAlias { ... }
            new KeywordToken(93, 4, "enum", KeywordType.enum),
            Token.create(TokenType.identifier, 98, 17),
            Token.create(TokenType.openBrace, 116, 1),
            new KeywordToken(122, 6, "option", KeywordType.option),
            Token.create(TokenType.identifier, 129, 11),
            Token.create(TokenType.operator, 141, 1),
            new BooleanToken(143, 4, "true"),
            Token.create(TokenType.semicolon, 147, 1),
            Token.create(TokenType.identifier, 153, 15),
            Token.create(TokenType.operator, 169, 1),
            new IntegerToken(171, 1, "0", 10),
            Token.create(TokenType.semicolon, 172, 1),
            Token.create(TokenType.identifier, 178, 11),
            Token.create(TokenType.operator, 190, 1),
            new IntegerToken(192, 1, "1", 10),
            Token.create(TokenType.semicolon, 193, 1),
            Token.create(TokenType.identifier, 199, 11),
            Token.create(TokenType.operator, 211, 1),
            new IntegerToken(213, 1, "1", 10),
            Token.create(TokenType.semicolon, 214, 1),
            Token.create(TokenType.identifier, 220, 12),
            Token.create(TokenType.operator, 233, 1),
            new IntegerToken(235, 1, "2", 10),
            Token.create(TokenType.openBracket, 237, 1),
            Token.create(TokenType.openParenthesis, 238, 1),
            Token.create(TokenType.identifier, 239, 13),
            Token.create(TokenType.closeParenthesis, 252, 1),
            Token.create(TokenType.operator, 254, 1),
            Token.create(TokenType.string, 256, 13),
            Token.create(TokenType.closeBracket, 269, 1),
            Token.create(TokenType.semicolon, 270, 1),
            Token.create(TokenType.closeBrace, 272, 1),

            // message Outer { ... }
            new KeywordToken(274, 7, "message", KeywordType.message),
            Token.create(TokenType.identifier, 282, 5),
            Token.create(TokenType.openBrace, 288, 1),
            new KeywordToken(294, 6, "option", KeywordType.option),
            Token.create(TokenType.openParenthesis, 301, 1),
            Token.create(TokenType.identifier, 302, 9),
            Token.create(TokenType.closeParenthesis, 311, 1),
            Token.create(TokenType.dot, 312, 1),
            Token.create(TokenType.identifier, 313, 1),
            Token.create(TokenType.operator, 315, 1),
            new BooleanToken(317, 4, "true"),
            Token.create(TokenType.semicolon, 321, 1),
            new KeywordToken(327, 7, "message", KeywordType.message),
            Token.create(TokenType.identifier, 335, 5),
            Token.create(TokenType.openBrace, 341, 1),
            new Comment(345, 10, false, "// Level 2"),
            new PrimitiveTypeToken(364, 5, PrimitiveType.int64),
            Token.create(TokenType.identifier, 370, 4),
            Token.create(TokenType.operator, 375, 1),
            new IntegerToken(377, 1, "1", 10),
            Token.create(TokenType.semicolon, 378, 1),
            Token.create(TokenType.closeBrace, 384, 1),
            new KeywordToken(390, 8, "repeated", KeywordType.repeated),
            Token.create(TokenType.identifier, 399, 5),
            Token.create(TokenType.identifier, 405, 13),
            Token.create(TokenType.operator, 419, 1),
            new IntegerToken(421, 1, "2", 10),
            Token.create(TokenType.semicolon, 422, 1),
            Token.create(TokenType.identifier, 428, 17),
            Token.create(TokenType.identifier, 446, 10),
            Token.create(TokenType.operator, 457, 1),
            new IntegerToken(459, 1, "3", 10),
            Token.create(TokenType.semicolon, 460, 1),
            new KeywordToken(466, 3, "map", KeywordType.map),
            Token.create(TokenType.less, 469, 1),
            new PrimitiveTypeToken(470, 5, PrimitiveType.int32),
            Token.create(TokenType.comma, 475, 1),
            new PrimitiveTypeToken(477, 6, PrimitiveType.string),
            Token.create(TokenType.greater, 483, 1),
            Token.create(TokenType.identifier, 485, 6),
            Token.create(TokenType.operator, 492, 1),
            new IntegerToken(494, 1, "4", 10),
            Token.create(TokenType.semicolon, 495, 1),
            Token.create(TokenType.closeBrace, 497, 1),
        ];
        const tokenizer = new Proto3Tokenizer();
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

    [
        {input: '-inf', expected: [new FloatToken(0, 4, '-inf')]},
    ].forEach((test) => {
        it(`should tokenize ${test.input}`, () => {
            const tokenizer = new Proto3Tokenizer();
            const tokens = tokenizer.tokenize(test.input);

            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                const expected = test.expected[i];

                expect(token.type).to.equal(expected.type, `Token ${i} type`);
                expect(token.start).to.equal(expected.start, `Token ${i} start`);
                expect(token.length).to.equal(expected.length, `Token ${i} length`);
            }
            expect(tokens.length).to.equal(test.expected.length);
        });
    });

    describe("Comment", () => {
        it('should tokenize a single line comment', () => {
            const input = '// this is a single line comment';
            const tokenizer = new Proto3Tokenizer();
            const tokens = tokenizer.tokenize(input);

            expect(tokens.length).to.equal(1);
            expect(tokens[0].type).to.equal(TokenType.comment);
            expect(tokens[0].start).to.equal(0);
            expect(tokens[0].length).to.equal(input.length);
            expect((tokens[0] as Comment).isBlock).to.equal(false);
        });

        it('should tokenize a block line comment', () => {
            const input = '/* this is a block line comment */';
            const tokenizer = new Proto3Tokenizer();
            const tokens = tokenizer.tokenize(input);

            expect(tokens.length).to.equal(1);
            expect(tokens[0].type).to.equal(TokenType.comment);
            expect(tokens[0].start).to.equal(0);
            expect(tokens[0].length).to.equal(input.length);
            expect((tokens[0] as Comment).isBlock).to.equal(true);
        });

        it('should tokenize a single line comment with leading whitespace', () => {
            const input = '    // this is a single line comment';
            const tokenizer = new Proto3Tokenizer();
            const tokens = tokenizer.tokenize(input);

            expect(tokens.length).to.equal(1);
            expect(tokens[0].type).to.equal(TokenType.comment);
            expect(tokens[0].start).to.equal(4);
            expect(tokens[0].length).to.equal(input.length - 4);
            expect((tokens[0] as Comment).isBlock).to.equal(false);
        });

        it('should tokenize a block line comment with leading whitespace', () => {
            const input = '    \n/* this is a block line comment */\n';
            const tokenizer = new Proto3Tokenizer();
            const tokens = tokenizer.tokenize(input);

            expect(tokens.length).to.equal(1);
            expect(tokens[0].type).to.equal(TokenType.comment);
            expect(tokens[0].start).to.equal(5);
            expect(tokens[0].length).to.equal(input.length - 6);
            expect((tokens[0] as Comment).isBlock).to.equal(true);
        });

        it('should tokenize a multi line comment', () => {
            const input = "/* this is a block line comment\n* that spans multiple lines\n*/";
            const tokenizer = new Proto3Tokenizer();
            const tokens = tokenizer.tokenize(input);

            expect(tokens.length).to.equal(1);
            expect(tokens[0].type).to.equal(TokenType.comment);
            expect(tokens[0].start).to.equal(0);
            expect(tokens[0].length).to.equal(input.length);
            expect((tokens[0] as Comment).isBlock).to.equal(true);
        });
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
                const tokenizer = new Proto3Tokenizer();
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
            { name: "basic case", input: '0' },
            { name: "basic case with negative sign", input: '-123' },
            { name: "basic case with positive sign", input: '+123' },
            { name: "hex digits", input: '0x1234' },
            { name: "hex digits with leading 0", input: '0x01234' },
            { name: "hex digits with leading 0 and negative sign", input: '-0x01234' },
            { name: "hex digits with leading 0 and positive sign", input: '+0x01234' },
            { name: "octal digits", input: '01234' },
            { name: "octal digits with leading 0", input: '001234' },
            { name: "octal digits with leading 0 and negative sign", input: '-001234' },
            { name: "octal digits with leading 0 and positive sign", input: '+001234' },
        ].forEach((test) => {
            it(`should tokenize an integer: ${test.name}`, () => {
                const tokenizer = new Proto3Tokenizer();
                const tokens = tokenizer.tokenize(test.input);

                expect(tokens.length).to.equal(1);
                expect(tokens[0].type).to.equal(TokenType.number);
                expect(tokens[0].start).to.equal(0);
                expect(tokens[0].length).to.equal(test.input.length);
                expect((tokens[0] as IntegerToken).text).to.equal(test.input);
            });
        });

        [
            { name: "floating point", input: '123.456' },
            { name: "floating point with negative sign", input: '-123.456' },
            { name: "floating point with positive sign", input: '+123.456' },
            { name: "floating point without leading 0", input: '.456' },
            { name: "floating point with exponent", input: '123.456e-7' },
            { name: "floating point with exponent 2", input: '123.456E+7' },
        ].forEach((test) => {
            it(`should tokenize a floating point number: ${test.name}`, () => {
                const tokenizer = new Proto3Tokenizer();
                const tokens = tokenizer.tokenize(test.input);

                expect(tokens.length).to.equal(1);
                expect(tokens[0].type).to.equal(TokenType.number);
                expect(tokens[0].start).to.equal(0);
                expect(tokens[0].length).to.equal(test.input.length);
                expect((tokens[0] as FloatToken).text).to.equal(test.input);
            });
        });
    });
});
