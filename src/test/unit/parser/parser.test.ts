import {expect} from 'chai';
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
        { input: 'import a.proto', expectedError: "Expected package name after 'package'" },
    ].forEach((test) => {
        it(`parse error: \`${test.input}\` -> ${test.expectedError}`, () => {
            let parser = new Proto3Parser();
            expect(() => parser.parse(test.input)).to.throw(test.expectedError);
        });
    });
});
