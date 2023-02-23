import {expect} from 'chai';
import { ImportNode, MessageNode, NodeType, PackageNode, SyntaxNode } from '../../../parser/nodes';
import {Proto3Parser} from '../../../parser/parser';

describe('Parser', () => {
    [
        { input: 'syntax;', expectedError: "Expected '=' after 'syntax'" },
        { input: 'syntax = "proto2";', expectedError: "Expected 'proto3' after 'syntax ='" },
        { input: 'syntax = "proto3"', expectedError: "Unexpected end of stream" },
        { input: 'package', expectedError: "Unexpected end of stream" },
        { input: 'package;', expectedError: "Expected package name after 'package'" },
        { input: 'package .', expectedError: "Expected package name after 'package'" },
        { input: 'package a.;', expectedError: "Unexpected token in package name" },
        { input: 'import a.proto', expectedError: "Expected file path after 'package'" },
    ].forEach((test) => {
        it(`parse error: \`${test.input}\` -> ${test.expectedError}`, () => {
            let parser = new Proto3Parser();
            expect(() => parser.parse(test.input)).to.throw(test.expectedError);
        });
    });

    it('parse success', () => {
        const input = `
syntax = "proto3";

package a.b.c;

import "a.proto";

message A {
}`;

        let parser = new Proto3Parser();
        let result = parser.parse(input);

        expect(result.children).not.to.be.undefined;
        expect(result.children).to.have.lengthOf(4);

        expect(result.children![0].type).to.equal(NodeType.syntax);
        expect((result.children![0] as SyntaxNode).version).to.equal('proto3');

        expect(result.children![1].type).to.equal(NodeType.package);
        expect((result.children![1] as PackageNode).name).to.equal('a.b.c');

        expect(result.children![2].type).to.equal(NodeType.import);
        expect((result.children![2] as ImportNode).path).to.equal('"a.proto"');

        expect(result.children![3].type).to.equal(NodeType.message);
        expect((result.children![3] as MessageNode).name).to.equal('A');
    });
});
