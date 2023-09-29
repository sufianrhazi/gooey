import { Processable, Retainable } from './engine';
export declare const CalculationSubscribeWithPostAction: unique symbol;
interface CalcSubscriptionHandlerHack<T> {
    bivarianceHack(...args: [
        errorType: undefined,
        val: T,
        addPostAction: (postAction: () => void) => void
    ] | [
        errorType: Error,
        val: undefined,
        addPostAction: (postAction: () => void) => void
    ]): void;
}
type CalcSubscriptionHandler<out T> = CalcSubscriptionHandlerHack<T>['bivarianceHack'];
type CalcUnsubscribe = () => void;
type CalcErrorHandler<T> = (error: Error) => T;
export declare class Calculation<out T> implements Retainable, Processable {
    private _subscriptions?;
    private _type;
    private _errorHandler?;
    private _state;
    private _retained?;
    private _val?;
    private _error?;
    private _fn;
    __processable: true;
    __debugName: string;
    __refcount: number;
    get(): T;
    constructor(fn: () => T, debugName?: string);
    onError(handler: CalcErrorHandler<T>): this;
    _eq(a: T, b: T): boolean;
    setCmp(eq: (a: T, b: T) => boolean): this;
    subscribe(handler: (value: T) => void): CalcUnsubscribe;
    subscribeWithError(handler: (...args: [error: undefined, value: T] | [error: Error, value: undefined]) => void): CalcUnsubscribe;
    [CalculationSubscribeWithPostAction](handler: CalcSubscriptionHandler<T>): CalcUnsubscribe;
    retain(): void;
    release(): void;
    __alive(): void;
    __dead(): void;
    __recalculate(addPostAction: (postAction: () => void) => void): boolean;
    __invalidate(): boolean;
    __cycle(addPostAction: (postAction: () => void) => void): boolean;
}
export declare class CycleError extends Error {
    sourceCalculation: Calculation<any>;
    constructor(msg: string, sourceCalculation: Calculation<any>);
}
export declare function calc<T>(fn: () => T, debugName?: string): Calculation<T>;
export {};
//# sourceMappingURL=calc.d.ts.map