import type { Dynamic, DynamicSubscriptionHandler } from '../common/dyn';
import type { Processable, Retainable } from './engine';
type CalcUnsubscribe = () => void;
type CalcErrorHandler<T> = (error: Error) => T;
export declare class Calculation<T> implements Retainable, Processable, Dynamic<T> {
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
    subscribe(handler: DynamicSubscriptionHandler<T>): CalcUnsubscribe;
    retain(): void;
    release(): void;
    __alive(): void;
    __dead(): void;
    __recalculate(): boolean;
    __invalidate(): boolean;
    __cycle(): boolean;
}
export declare class CycleError extends Error {
    sourceCalculation: Calculation<any>;
    constructor(msg: string, sourceCalculation: Calculation<any>);
}
export declare function calc<T>(fn: () => T, debugName?: string): Calculation<T>;
export {};
//# sourceMappingURL=calc.d.ts.map