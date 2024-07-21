import type { Position } from './utils';
export type LiteralNumberExpression = {
    type: 'number';
    value: number;
};
export type LiteralStringExpression = {
    type: 'string';
    value: string;
};
export type CellExpression = {
    type: 'cell';
    position: Position;
};
export type CellRangeExpression = {
    type: 'range';
    start: Position;
    end: Position;
};
export type FunctionExpression = {
    type: 'func';
    name: string;
    args: Expression[];
};
export type ArithmeticExpression = {
    type: 'pos';
    value: Expression;
} | {
    type: 'neg';
    value: Expression;
} | {
    type: 'add';
    left: Expression;
    right: Expression;
} | {
    type: 'sub';
    left: Expression;
    right: Expression;
} | {
    type: 'mul';
    left: Expression;
    right: Expression;
} | {
    type: 'div';
    left: Expression;
    right: Expression;
};
export type Expression = LiteralNumberExpression | LiteralStringExpression | ArithmeticExpression | FunctionExpression | CellExpression | CellRangeExpression;
export declare function parseFormula(str: string): Expression;
//# sourceMappingURL=parser.d.ts.map