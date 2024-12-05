import type { DynamicMut, DynamicNonErrorSubscriptionHandler } from '../common/dyn';
import type { Calculation } from './calc';
import type { Processable, Retainable } from './engine';
export declare class Field<T> implements Processable, Retainable, DynamicMut<T> {
    private _val;
    private _subscribers?;
    private _changeClock;
    __processable: true;
    __refcount: number;
    __debugName: string;
    constructor(val: T, debugName?: string);
    get(): T;
    set(newVal: T): void;
    subscribe(subscriber: DynamicNonErrorSubscriptionHandler<T>): () => void;
    retain(): void;
    release(): void;
    __alive(): void;
    __dead(): void;
    __recalculate(): boolean;
    map<V>(fn: (val: T) => V): Calculation<V>;
}
export declare function field<T>(val: T, debugName?: string): Field<T>;
//# sourceMappingURL=field.d.ts.map