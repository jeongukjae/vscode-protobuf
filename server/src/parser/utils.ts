import Char from "typescript-char";

export function isWhitespace(charCode: number): boolean {
    return charCode === Char.Space || charCode === Char.Tab || charCode === Char.FormFeed || isLineBreak(charCode);
}

export function isLineBreak(charCode: number): boolean {
    return charCode === Char.LineFeed || charCode === Char.CarriageReturn;
}

export function isDecimal(charCode: number): boolean {
    return charCode >= Char._0 && charCode <= Char._9;
}

export function isHex(charCode: number): boolean {
    return isDecimal(charCode) || (charCode >= Char.a && charCode <= Char.f) || (charCode >= Char.A && charCode <= Char.F);
}

export function isOctal(charCode: number): boolean {
    return charCode >= Char._0 && charCode <= Char._7;
}

export function canBeStartIdentifier(charCode: number): boolean {
    return (charCode >= Char.a && charCode <= Char.z) || (charCode >= Char.A && charCode <= Char.Z) || charCode === Char.Underscore;
}

export function canBeIdentifier(charCode: number): boolean {
    return (charCode >= Char.a && charCode <= Char.z) || (charCode >= Char.A && charCode <= Char.Z) || isDecimal(charCode) ||  charCode === Char.Underscore;
}
