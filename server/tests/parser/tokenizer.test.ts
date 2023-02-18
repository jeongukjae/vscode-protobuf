import {expect} from 'chai';
import {Proto3Tokenizer} from '../../src/parser/tokenizer';
import { Comment, IntegerToken, FloatToken, TokenType } from '../../src/parser/tokens';

describe('Tokenizer', () => {
    it("should tokenize", () => {
        const input = `
// TODO: add more tests
`;

        const expectedTokens = [
            { type: TokenType.comment, start: 1, length: 23, isBlock: false },
        ];
        const tokenizer = new Proto3Tokenizer();
        const tokens = tokenizer.tokenize(input);

        expect(tokens.length).to.equal(expectedTokens.length);
        for (let i = 0; i < tokens.length; i++) {
            expect(tokens[i].type).to.equal(expectedTokens[i].type);
            expect(tokens[i].start).to.equal(expectedTokens[i].start);
            expect(tokens[i].length).to.equal(expectedTokens[i].length);
            if (tokens[i].type === TokenType.comment) {
                expect((tokens[i] as Comment).isBlock).to.equal(expectedTokens[i].isBlock);
            }
        }
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
