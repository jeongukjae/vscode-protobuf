export function isWhitespace(charCode: number): boolean {
    // space (0x20), tab (0x09), form feed (0x0c)
    return charCode === 0x20 || charCode === 0x09 || charCode === 0x0c;
}

export function isLineBreak(charCode: number): boolean {
    // line feed (0x0a), carriage return (0x0d)
    return charCode === 0x0a || charCode === 0x0d;
}
