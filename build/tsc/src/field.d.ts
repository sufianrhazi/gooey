import { Processable, Retainable } from './engine';
declare type FieldSubscriber<T> = (val: T) => void;
export interface Field<T> extends Processable, Retainable {
    _isAlive: boolean;
    get: () => T;
    set: (val: T) => void;
    subscribe: (subscriber: FieldSubscriber<T>) => () => void;
    _val: T;
    _subscribers?: Map<FieldSubscriber<T>, number>;
    _changeClock: number;
}
export declare function field<T>(val: T, debugName?: string): Field<T>;
export {};
//# sourceMappingURL=field.d.ts.map