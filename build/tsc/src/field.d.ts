import { Processable, Retainable } from './engine';
declare type FieldObserver<T> = (val: T) => void;
export interface Field<T> extends Processable, Retainable {
    _name: string;
    _isAlive: boolean;
    get: () => T;
    set: (val: T) => void;
    update: (val: (prev: T) => T) => void;
    observe: (observer: FieldObserver<T>) => () => void;
    _val: T;
    _observers?: Set<FieldObserver<T>>;
}
export declare function field<T>(name: string, val: T, debugName?: string): Field<T>;
export {};
//# sourceMappingURL=field.d.ts.map