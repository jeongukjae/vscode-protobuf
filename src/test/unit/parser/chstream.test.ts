import { expect } from "chai";

import { CharacterStream } from "../../../parser/chstream";

describe("CharacterStream", () => {
  it("should be able to move forward", () => {
    let chstream = new CharacterStream("test");
    expect(chstream.moveNext()).to.be.true;
  });

  it("should be able to skip whitespace", () => {
    let chstream = new CharacterStream(" \ttest");
    expect(chstream.isAtWhitespace()).to.be.true;
    chstream.skipWhitespace();
    expect(chstream.isAtWhitespace()).to.be.false;
    expect(chstream.position).to.equal(2);
    expect(chstream.getCurrentChar()).to.equal("t".charCodeAt(0));
  });

  it("should be able to skip to linebreak", () => {
    let chstream = new CharacterStream("test\n");
    expect(chstream.isAtLineBreak()).to.be.false;
    chstream.skipToLineBreak();
    expect(chstream.isAtLineBreak()).to.be.true;
    expect(chstream.position).to.equal(4);
  });

  it("should be able to look ahead", () => {
    let chstream = new CharacterStream("test");
    expect(chstream.lookAhead(1)).to.equal("e".charCodeAt(0));
    expect(chstream.lookAhead(2)).to.equal("s".charCodeAt(0));
    expect(chstream.lookAhead(3)).to.equal("t".charCodeAt(0));
    expect(chstream.lookAhead(4)).to.equal(0);
  });
});
