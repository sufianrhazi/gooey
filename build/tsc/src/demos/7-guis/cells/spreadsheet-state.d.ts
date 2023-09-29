import { Dict, Calculation } from '../../..';
import { Expression, FunctionExpression } from './parser';
import { Position } from './utils';
export type EvalResult = {
    ok: true;
    value: string | number;
} | {
    ok: false;
    isCycle: true;
} | {
    ok: false;
    isCycle: false;
    error: Error;
};
export declare class SpreadsheetState {
    rawData: Dict<string, string>;
    evaluatedData: Dict<string, Calculation<EvalResult>>;
    constructor();
    set(position: Position, value: string): void;
    read(position: Position): EvalResult;
    readRaw(position: Position): string;
    evalExpression(expression: Expression): string | number;
    evalFunction(func: FunctionExpression): string | number;
}
//# sourceMappingURL=spreadsheet-state.d.ts.map