import { Position } from './utils';
export declare type LiteralNumberExpression = {
    type: 'number';
    value: number;
};
export declare type LiteralStringExpression = {
    type: 'string';
    value: string;
};
export declare type CellExpression = {
    type: 'cell';
    position: Position;
};
export declare type CellRangeExpression = {
    type: 'range';
    start: Position;
    end: Position;
};
export declare type FunctionExpression = {
    type: 'func';
    name: string;
    args: Expression[];
};
export declare type ArithmeticExpression = {
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
export declare type Expression = LiteralNumberExpression | LiteralStringExpression | ArithmeticExpression | FunctionExpression | CellExpression | CellRangeExpression;
export declare function parseFormula(str: string): Expression;
//# sourceMappingURL=parser.d.ts.map