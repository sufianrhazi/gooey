import type { Processable, Retainable } from './engine';
import { Field } from './field';
export declare class FieldMap implements Retainable {
    private keysField;
    private fieldMap;
    private consumer;
    private emitter;
    __debugName: string;
    __refcount: number;
    constructor(keysField: Field<number>, consumer: (Retainable & Processable) | null, emitter: (Retainable & Processable) | null, debugName?: string);
    getOrMake(key: any, val: any): Field<any>;
    set(key: any, val: any): void;
    delete(key: any): void;
    keys(): IterableIterator<any>;
    values(): IterableIterator<Field<any>>;
    entries(): IterableIterator<[any, Field<any>]>;
    clear(): void;
    __dead(): void;
    __alive(): void;
}
//# sourceMappingURL=fieldmap.d.ts.map