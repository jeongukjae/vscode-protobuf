import { expect } from "chai";

import { TokenStream } from "../../../parser/tokenstream";

class TestStreamUnit {
    start: number;
    length: number;

    constructor(start: number, length: number) {
        this.start = start;
        this.length = length;
    }
}

describe("TokenStream", () => {
    it("should return the correct token text", () => {
        const st = new TokenStream("abc", [
            new TestStreamUnit(0, 1),
            new TestStreamUnit(1, 1),
            new TestStreamUnit(2, 1),
        ]);

        expect(st.getCurrentTokenText()).to.equal("a");
        expect(st.getNextTokenText()).to.equal("b");
        expect(st.lookAheadText(2)).to.equal("c");
    });

    it("should detect end of stream", () => {
        const st = new TokenStream("abc", [
            new TestStreamUnit(0, 1),
            new TestStreamUnit(1, 1),
            new TestStreamUnit(2, 1),
        ]);

        expect(st.isEndOfStream()).to.be.false;

        st.moveNext();

        expect(st.isEndOfStream()).to.be.false;

        st.moveNext();

        expect(st.isEndOfStream()).to.be.true;
    });
});
