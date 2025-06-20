import type { DynamicInternalSubscription, DynamicMut, DynamicNonErrorSubscriptionHandler } from '../common/dyn';
import type { Calculation } from './calc';
import type { Processable, Retainable } from './engine';
declare const takeFieldSubscriptionsSymbol: unique symbol;
export declare class Field<T> implements Processable, Retainable, DynamicMut<T> {
    private _val;
    private _subscribers?;
    private _subscriptions;
    private _changeClock;
    __processable: true;
    __refcount: number;
    __debugName: string;
    constructor(val: T, debugName?: string);
    get(): T;
    set(newVal: T): void;
    subscribe(handler: DynamicNonErrorSubscriptionHandler<T>): () => void;
    retain(): void;
    release(): void;
    __alive(): void;
    __dead(): void;
    __recalculate(): Processable[];
    mapCalc<V>(fn: (val: T) => V): Calculation<V>;
    [takeFieldSubscriptionsSymbol](): DynamicInternalSubscription<T>[];
}
export declare function field<T>(val: T, debugName?: string): Field<T>;
export declare function takeFieldSubscriptions<T>(field: Field<T>): DynamicInternalSubscription<T>[];
export {};
//# sourceMappingURL=field.d.ts.map