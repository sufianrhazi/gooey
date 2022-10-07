import { Processable, Retainable } from './engine';
import { SymDebugName, SymAlive, SymDead, SymRefcount } from './symbols';
import { Field } from './field';
export declare class FieldMap implements Retainable {
    private keysField;
    private fieldMap;
    private consumer;
    private emitter;
    [SymDebugName]: string;
    [SymRefcount]: number;
    constructor(keysField: Field<number>, consumer: (Retainable & Processable) | null, emitter: (Retainable & Processable) | null, debugName?: string);
    getOrMake(prop: string, val: any): Field<any>;
    set(prop: string, val: any): void;
    delete(prop: string): void;
    [SymDead](): void;
    [SymAlive](): void;
}
//# sourceMappingURL=fieldmap.d.ts.map