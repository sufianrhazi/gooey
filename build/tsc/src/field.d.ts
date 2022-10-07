import { Processable, Retainable } from './engine';
import { SymProcessable, SymDebugName, SymDead, SymAlive, SymRecalculate, SymRefcount } from './symbols';
declare type FieldSubscriber<T> = (val: T) => void;
export declare class Field<T> implements Processable, Retainable {
    private _isAlive;
    private _val;
    private _subscribers?;
    private _changeClock;
    [SymProcessable]: true;
    [SymRefcount]: number;
    [SymDebugName]: string;
    constructor(val: T, debugName?: string);
    get(): T;
    set(newVal: T): void;
    subscribe(subscriber: FieldSubscriber<T>): () => void;
    [SymAlive](): void;
    [SymDead](): void;
    [SymRecalculate](): boolean;
}
export declare function field<T>(val: T, debugName?: string): Field<T>;
export {};
//# sourceMappingURL=field.d.ts.map