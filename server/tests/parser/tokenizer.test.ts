import {expect} from 'chai';
import {Proto3Tokenizer} from '../../src/parser/tokenizer';
import { Comment, TokenType } from '../../src/parser/tokens';

describe('Tokenizer', () => {
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
});
