import {
    TrackedMap,
    Calculation,
    map,
    calc,
    CalculationErrorType,
} from '../../..';
import { Expression, FunctionExpression, parseFormula } from './parser';
import { Position, positionToString } from './utils';

/*
 * Expression evaluator
 */
export type EvalResult =
    | { ok: true; value: string | number }
    | { ok: false; isCycle: true }
    | { ok: false; isCycle: false; error: Error };

export class SpreadsheetState {
    rawData: TrackedMap<string, string>;
    evaluatedData: TrackedMap<string, Calculation<EvalResult>>;

    constructor() {
        this.rawData = map([], 'rawData');
        this.evaluatedData = map([], 'evaluatedData');
    }

    set(position: Position, value: string) {
        const name = positionToString(position);
        if (!value) {
            this.rawData.delete(name);
            this.evaluatedData.delete(name);
            return;
        }
        this.rawData.set(name, value);
        if (!this.evaluatedData.has(name)) {
            this.evaluatedData.set(
                name,
                calc<EvalResult>(() => {
                    const contents = this.rawData.get(name);
                    if (!contents) return { ok: true, value: '' };
                    return {
                        ok: true,
                        value: this.evalExpression(parseFormula(contents)),
                    };
                }, `eval-${position.col}-${position.row}`).onError(
                    (errorType, error) => {
                        if (errorType === CalculationErrorType.CYCLE) {
                            return { ok: false, isCycle: true };
                        }
                        return {
                            ok: false,
                            isCycle: false,
                            error: error ?? new Error('Unknown error'),
                        };
                    }
                )
            );
        }
    }

    read(position: Position): EvalResult {
        const name = positionToString(position);
        const cellCalc = this.evaluatedData.get(name);
        if (!cellCalc) return { ok: true, value: '' };
        return cellCalc();
    }

    readRaw(position: Position): string {
        const name = positionToString(position);
        return this.rawData.get(name) ?? '';
    }

    evalExpression(expression: Expression): string | number {
        switch (expression.type) {
            case 'number':
            case 'string':
                return expression.value;
            case 'pos':
                return this.evalExpression(expression.value);
            case 'neg': {
                const val = this.evalExpression(expression.value);
                if (typeof val === 'string')
                    throw new Error('Cannot negate a string');
                return -val;
            }
            case 'add': {
                const left = this.evalExpression(expression.left);
                const right = this.evalExpression(expression.right);
                return (left as any) + (right as any);
            }
            case 'sub': {
                const left = this.evalExpression(expression.left);
                const right = this.evalExpression(expression.right);
                if (typeof left === 'string' || typeof right === 'string')
                    throw new Error(
                        `Cannot subtract: ${typeof left} - ${typeof right}`
                    );
                return left - right;
            }
            case 'mul': {
                const left = this.evalExpression(expression.left);
                const right = this.evalExpression(expression.right);
                if (typeof left === 'string' || typeof right === 'string')
                    throw new Error(
                        `Cannot multiply: ${typeof left} * ${typeof right}`
                    );
                return left * right;
            }
            case 'div': {
                const left = this.evalExpression(expression.left);
                const right = this.evalExpression(expression.right);
                if (typeof left === 'string' || typeof right === 'string')
                    throw new Error(
                        `Cannot divide: ${typeof left} / ${typeof right}`
                    );
                return left / right;
            }
            case 'range':
                throw new Error('Unexpected cell range');
            case 'cell': {
                const result = this.read(expression.position);
                if (result.ok) return result.value;
                if (result.isCycle) throw new Error('Depends on a cycle');
                throw new Error('References a cell with an error');
            }
            case 'func': {
                return this.evalFunction(expression);
            }
            default:
                throw new Error('Unexpected expression type');
        }
    }

    evalFunction(func: FunctionExpression): string | number {
        const values: number[] = [];
        func.args.forEach((arg) => {
            if (arg.type === 'range') {
                for (let col = arg.start.col; col <= arg.end.col; ++col) {
                    for (let row = arg.start.row; row <= arg.end.row; ++row) {
                        const result = this.read({ col, row });
                        if (!result.ok || typeof result.value !== 'number') {
                            throw new Error(
                                'Cannot call function on non-numeric result'
                            );
                        }
                        values.push(result.value);
                    }
                }
            } else {
                const argVal = this.evalExpression(arg);
                if (typeof argVal !== 'number') {
                    throw new Error(
                        'Cannot call function on non-numeric result'
                    );
                }
                values.push(argVal);
            }
        });

        switch (func.name) {
            case 'sum':
                return values.reduce((acc, val) => acc + val);
            case 'avg':
                return values.reduce((acc, val) => acc + val) / values.length;
            case 'min':
                return Math.min(...values);
            case 'max':
                return Math.max(...values);
            default:
                throw new Error(`Unknown function: ${func.name}`);
        }
    }
}
