import { Processable, Retainable } from './engine';
export declare enum CalculationErrorType {
    CYCLE = 0,
    EXCEPTION = 1
}
declare const CalculationUnsubscribeSymbol: unique symbol;
interface CalcSubscriptionHandlerHack<T> {
    bivarianceHack(errorType: undefined, val: T, addPostAction: (postAction: () => void) => void): void;
    bivarianceHack(errorType: CalculationErrorType, val: Error, addPostAction: (postAction: () => void) => void): void;
}
type CalcSubscriptionHandler<T> = CalcSubscriptionHandlerHack<T>['bivarianceHack'];
interface CalcUnsubscribe<T> {
    (): void;
    _type: typeof CalculationUnsubscribeSymbol;
    calculation: Calculation<T>;
}
type CalcErrorHandler<T> = (errorType: CalculationErrorType, val: Error) => T;
export declare class Calculation<out T> extends Function implements Retainable, Processable {
    private _subscriptions?;
    private _type;
    private _errorHandler?;
    private _state;
    private _retained?;
    private _val?;
    private _error?;
    __processable: true;
    __debugName: string;
    __refcount: number;
    _call(): T;
    constructor(fn: () => T, debugName?: string);
    onError(handler: CalcErrorHandler<T>): this;
    _eq(a: T, b: T): boolean;
    setCmp(eq: (a: T, b: T) => boolean): this;
    subscribe(handler: CalcSubscriptionHandler<T>): CalcUnsubscribe<T>;
    retain(): void;
    release(): void;
    __alive(): void;
    __dead(): void;
    __recalculate(addPostAction: (postAction: () => void) => void): boolean;
    __invalidate(): boolean;
    __cycle(addPostAction: (postAction: () => void) => void): boolean;
}
export declare function isCalculation(val: any): val is Calculation<unknown>;
export declare function isCalcUnsubscribe(val: any): val is CalcUnsubscribe<unknown>;
export declare function calc<T>(fn: () => T, debugName?: string): Calculation<T>;
export {};
//# sourceMappingURL=calc.d.ts.map