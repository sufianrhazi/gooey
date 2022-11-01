import { Processable, Retainable } from './engine';
import { Field } from './field';
export declare class FieldMap implements Retainable {
    private keysField;
    private fieldMap;
    private consumer;
    private emitter;
    __debugName: string;
    __refcount: number;
    constructor(keysField: Field<number>, consumer: (Retainable & Processable) | null, emitter: (Retainable & Processable) | null, debugName?: string);
    getOrMake(prop: string, val: any): Field<any>;
    set(prop: string, val: any): void;
    delete(prop: string): void;
    __dead(): void;
    __alive(): void;
}
//# sourceMappingURL=fieldmap.d.ts.map