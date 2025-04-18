import type { Dynamic, DynamicSubscriptionHandler } from '../common/dyn';
import type { Processable, Retainable } from './engine';
type CalcUnsubscribe = () => void;
type CalcErrorHandler<T> = (error: Error) => T;
type CalculationResult<T> = {
    ok: false;
    error: Error;
} | {
    ok: true;
    stale: boolean;
    value: T;
};
export declare class Calculation<T> implements Retainable, Processable, Dynamic<T> {
    __processable: true;
    __refcount: number;
    __debugName: string;
    private _fn;
    private _errorHandler;
    private _result;
    private _calculating;
    private _eq;
    private _dependencies;
    private _subscriptions;
    private ensureResult;
    get(): T;
    recalc(): CalculationResult<T>;
    constructor(fn: () => T, debugName?: string);
    onError(handler: CalcErrorHandler<T>): this;
    setCmp(eq: (a: T, b: T) => boolean): this;
    subscribe(handler: DynamicSubscriptionHandler<T>): CalcUnsubscribe;
    retain(): void;
    release(): void;
    __alive(): void;
    __dead(): void;
    __recalculate(vertexGroup: Set<Processable>): Processable[];
    __invalidate(): void;
    __cycle(): Processable[];
    private notifySubscriptions;
    map<V>(fn: (val: T) => V): Calculation<V>;
}
export declare class CycleError extends Error {
}
export declare class SynchronousCycleError extends CycleError {
    sourceCalculation: Calculation<any>;
    passthruCalculations: Set<Calculation<any>>;
    constructor(msg: string, sourceCalculation: Calculation<any>);
}
export declare function calc<T>(fn: () => T, debugName?: string): Calculation<T>;
export {};
//# sourceMappingURL=calc.d.ts.map