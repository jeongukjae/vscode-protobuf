import {expect} from 'chai';
import { ImportNode, MessageNode, NodeType, PackageNode, SyntaxNode } from '../../../parser/nodes';
import {Proto3Parser} from '../../../parser/parser';
import { BooleanToken, IntegerToken } from '../../../parser/tokens';

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
    option (my_option).bool_ = true;
    option (my_option).int_ = -1;
    option (my_option).float_ = -inf;
    option (my_option).float_ = -3.3e+2;
    option (my_option).ident_ = IDENT;

    message B {}
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

        let messageA = result.children![3] as MessageNode;
        expect(messageA.type).to.equal(NodeType.message);
        expect(messageA.name).to.equal('A');
        expect(messageA.children).to.have.lengthOf(1);
        expect(messageA.children![0].type).to.equal(NodeType.message);
        expect((messageA.children![0] as MessageNode).name).to.equal('B');

        expect(messageA.options).to.have.lengthOf(5);
        expect(messageA.options![0].name).to.equal('(my_option).bool_');
        expect((messageA.options![0].value as BooleanToken).text).to.equal('true');
        expect(messageA.options![1].name).to.equal('(my_option).int_');
        expect((messageA.options![1].value as IntegerToken).text).to.equal('-1');
    });
});
