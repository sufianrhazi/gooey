export declare type Position = {
    col: number;
    row: number;
};
export declare const NUM_COL = 26;
export declare const NUM_ROW = 99;
export declare const COLS: number[];
export declare const ROWS: number[];
export declare function colToString(col: number): string;
export declare function stringToCol(colStr: string): number;
export declare function rowToString(row: number): string;
export declare function stringToRow(rowStr: string): number;
export declare function positionToString({ col, row }: Position): string;
//# sourceMappingURL=utils.d.ts.map