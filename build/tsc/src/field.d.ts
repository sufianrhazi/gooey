import { Processable, Retainable } from './engine';
declare type FieldSubscriber<T> = (val: T) => void;
export declare class Field<T> implements Processable, Retainable {
    private _isAlive?;
    private _val;
    private _subscribers?;
    private _changeClock;
    __processable: true;
    __refcount: number;
    __debugName: string;
    constructor(val: T, debugName?: string);
    get(): T;
    set(newVal: T): void;
    subscribe(subscriber: FieldSubscriber<T>): () => void;
    __alive(): void;
    __dead(): void;
    __recalculate(): boolean;
}
export declare function field<T>(val: T, debugName?: string): Field<T>;
export {};
//# sourceMappingURL=field.d.ts.map