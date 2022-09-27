import * as Parsinator from 'parsinator';
import { Position, stringToRow, stringToCol } from './utils';

/*
 * Formula parser combinators
 */
export type LiteralNumberExpression = { type: 'number'; value: number };
export type LiteralStringExpression = { type: 'string'; value: string };
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
export type ArithmeticExpression =
    | { type: 'pos'; value: Expression }
    | { type: 'neg'; value: Expression }
    | { type: 'add'; left: Expression; right: Expression }
    | { type: 'sub'; left: Expression; right: Expression }
    | { type: 'mul'; left: Expression; right: Expression }
    | { type: 'div'; left: Expression; right: Expression };
export type Expression =
    | LiteralNumberExpression
    | LiteralStringExpression
    | ArithmeticExpression
    | FunctionExpression
    | CellExpression
    | CellRangeExpression;

const parseCell = Parsinator.fromGenerator<CellExpression>(function* () {
    const col = yield* Parsinator.regex(/[A-Z]/);
    const row = yield* Parsinator.regex(/[0-9]+/);
    return {
        type: 'cell',
        position: {
            col: stringToCol(col),
            row: stringToRow(row),
        },
    };
});

const parseCellRange = Parsinator.fromGenerator<CellRangeExpression>(
    function* () {
        const start = yield* parseCell;
        yield* Parsinator.str(':');
        const end = yield* parseCell;
        return {
            type: 'range',
            // Note: start is the upper-left col,row; end is the lower-right col,row
            start: {
                col: Math.min(start.position.col, end.position.col),
                row: Math.min(start.position.row, end.position.row),
            },
            end: {
                col: Math.max(start.position.col, end.position.col),
                row: Math.max(start.position.row, end.position.row),
            },
        };
    }
);

const parseNumber = Parsinator.fromGenerator<LiteralNumberExpression>(
    function* () {
        const numStr = yield* Parsinator.regex(/[0-9]*\.[0-9]+|[0-9]+/);
        const value = parseFloat(numStr);
        if (isNaN(value)) {
            yield* Parsinator.fail('Invalid number');
        }
        return { type: 'number' as const, value };
    }
);

const parseString = Parsinator.fromGenerator<LiteralStringExpression>(
    function* () {
        yield* Parsinator.str('"');
        const string = yield* Parsinator.until(Parsinator.str('"'));
        yield* Parsinator.str('"');
        return { type: 'string' as const, value: string };
    }
);

const parseFunction = Parsinator.fromGenerator<FunctionExpression>(
    function* () {
        const funcName = yield* Parsinator.choice([
            Parsinator.str('sum'),
            Parsinator.str('avg'),
            Parsinator.str('min'),
            Parsinator.str('max'),
        ]);
        const args = yield* Parsinator.surround(
            Parsinator.str('('),
            Parsinator.sepBy(Parsinator.str(','), parseExpression),
            Parsinator.str(')')
        );
        return { type: 'func' as const, name: funcName, args };
    }
);

function makeOp<T>(op: string, action: T) {
    return Parsinator.fromGenerator(function* () {
        yield* Parsinator.regex(/\s*/);
        yield* Parsinator.str(op);
        yield* Parsinator.regex(/\s*/);
        return action;
    });
}

const parseExpressionValue = Parsinator.choice<
    | LiteralStringExpression
    | LiteralNumberExpression
    | CellRangeExpression
    | CellExpression
    | FunctionExpression
>([parseString, parseNumber, parseCellRange, parseCell, parseFunction]);

const parseExpression: Parsinator.Parser<Expression> =
    Parsinator.buildExpressionParser<Expression>(
        [
            {
                fixity: 'prefix',
                parser: makeOp(
                    '-',
                    (val: Expression): Expression => ({
                        type: 'neg',
                        value: val,
                    })
                ),
            },
            {
                fixity: 'prefix',
                parser: makeOp(
                    '+',
                    (val: Expression): Expression => ({
                        type: 'pos',
                        value: val,
                    })
                ),
            },
            {
                fixity: 'infix',
                associativity: 'left',
                parser: makeOp(
                    '*',
                    (left: Expression, right: Expression): Expression => ({
                        type: 'mul',
                        left,
                        right,
                    })
                ),
            },
            {
                fixity: 'infix',
                associativity: 'left',
                parser: makeOp(
                    '/',
                    (left: Expression, right: Expression): Expression => ({
                        type: 'div',
                        left,
                        right,
                    })
                ),
            },
            {
                fixity: 'infix',
                associativity: 'left',
                parser: makeOp(
                    '+',
                    (left: Expression, right: Expression): Expression => ({
                        type: 'add',
                        left,
                        right,
                    })
                ),
            },
            {
                fixity: 'infix',
                associativity: 'left',
                parser: makeOp(
                    '-',
                    (left: Expression, right: Expression): Expression => ({
                        type: 'sub',
                        left,
                        right,
                    })
                ),
            },
        ],
        () =>
            Parsinator.choice<Expression>([
                Parsinator.surround(
                    Parsinator.regex(/\s*\(\s*/),
                    parseExpressionValue,
                    Parsinator.regex(/\s*\)\s*/)
                ),
                parseExpressionValue,
            ])
    );

const parseCellContents = Parsinator.fromGenerator<Expression>(function* () {
    if (yield* Parsinator.maybe(Parsinator.str('='))) {
        return yield* parseExpression;
    }
    const maybeNumber = yield* Parsinator.maybe(
        Parsinator.sequence([parseNumber, Parsinator.end])
    );
    if (maybeNumber && maybeNumber[0] !== null) return maybeNumber[0];
    const string = yield* Parsinator.until(Parsinator.end);
    return { type: 'string', value: string };
});

export function parseFormula(str: string) {
    return Parsinator.runToEnd(parseCellContents, str);
}
