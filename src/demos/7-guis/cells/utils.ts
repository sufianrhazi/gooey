export type Position = {
    col: number;
    row: number;
};

export const NUM_COL = 26;
export const NUM_ROW = 99;

export const COLS = Array(NUM_COL)
    .fill(null)
    .map((_, index) => index);
export const ROWS = Array(NUM_ROW)
    .fill(null)
    .map((_, index) => index);

export function colToString(col: number) {
    return String.fromCharCode('A'.charCodeAt(0) + col);
}

export function stringToCol(colStr: string) {
    if (colStr.length !== 1 || colStr[0] < 'A' || colStr[0] > 'Z')
        throw new Error('Invalid column string');
    return colStr.charCodeAt(0) - 'A'.charCodeAt(0);
}

export function rowToString(row: number) {
    return row.toString();
}

export function stringToRow(rowStr: string) {
    const num = parseInt(rowStr, 10);
    if (isNaN(num) || num < 0 || num >= NUM_ROW)
        throw new Error('Invalid row string');
    return num;
}

export function positionToString({ col, row }: Position) {
    return `${colToString(col)}${rowToString(row)}`;
}
