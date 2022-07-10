import { Processable, Retainable } from './engine';
declare enum CalculationState {
    READY = 0,
    CALLING = 1,
    CACHED = 2,
    ERROR = 3,
    DEAD = 4
}
export declare enum CalculationErrorType {
    CYCLE = 0,
    EXCEPTION = 1
}
declare const CalculationSymbol: unique symbol;
declare const CalculationUnsubscribeSymbol: unique symbol;
declare type CalcSubscriptionHandler<T> = (val: T) => void;
interface CalcUnsubscribe<T> {
    (): void;
    _type: typeof CalculationUnsubscribeSymbol;
    calculation: Calculation<T>;
}
export interface Calculation<T> extends Retainable, Processable {
    (): T;
    onError: (handler: (errorType: CalculationErrorType) => T) => this;
    setCmp: (eq: (a: T, b: T) => boolean) => this;
    onRecalc: (handler: CalcSubscriptionHandler<T>) => CalcUnsubscribe<T>;
    _subscriptions?: Set<CalcSubscriptionHandler<T>>;
    _type: typeof CalculationSymbol;
    _fn: () => T;
    _eq: (a: T, b: T) => boolean;
    _errorHandler?: (errorType: CalculationErrorType) => T;
    _isEffect: boolean;
    _state: CalculationState;
    _retained?: Set<Retainable | (Processable & Retainable)>;
    _val?: T;
    _error?: any;
}
export declare function isCalculation(val: any): val is Calculation<unknown>;
export declare function isCalcUnsubscribe(val: any): val is CalcUnsubscribe<unknown>;
export declare function calc<T>(fn: () => T, debugName?: string): Calculation<T>;
export declare function effect<T>(fn: () => T, debugName?: string): Calculation<T>;
export {};
//# sourceMappingURL=calc.d.ts.map