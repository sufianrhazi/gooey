import {
    Processable,
    Retainable,
    addSoftEdge,
    removeSoftEdge,
    retain,
    release,
} from './engine';
import { SymDebugName, SymAlive, SymDead, SymRefcount } from './symbols';
import { Field } from './field';

export class FieldMap implements Retainable {
    private declare keysField: Field<number>;
    private declare fieldMap: Map<string, Field<any>>;
    private declare consumer: (Retainable & Processable) | null;
    private declare emitter: (Retainable & Processable) | null;

    declare [SymDebugName]: string;
    declare [SymRefcount]: number;

    constructor(
        keysField: Field<number>,
        consumer: (Retainable & Processable) | null,
        emitter: (Retainable & Processable) | null,
        debugName?: string
    ) {
        this[SymRefcount] = 0;
        this[SymDebugName] = debugName ?? 'fieldmap';
        this.keysField = keysField;
        this.fieldMap = new Map();
        this.consumer = consumer;
        this.emitter = emitter;
    }

    getOrMake(prop: string, val: any) {
        let field = this.fieldMap.get(prop);
        if (!field) {
            field = new Field(val, `${this[SymDebugName]}:${prop}`);
            this.fieldMap.set(prop, field);

            if (this[SymRefcount] > 0) {
                retain(field);
                if (this.consumer) addSoftEdge(this.consumer, field);
                if (this.emitter) addSoftEdge(field, this.emitter);
            }
        }
        return field;
    }

    set(prop: string, val: any) {
        const field = this.getOrMake(prop, val);
        return field.set(val);
    }

    delete(prop: string) {
        const field = this.fieldMap.get(prop);
        if (field) {
            field.set(undefined);
            this.fieldMap.delete(prop);

            if (this[SymRefcount] > 0) {
                if (this.emitter) removeSoftEdge(field, this.emitter);
                if (this.consumer) removeSoftEdge(this.consumer, field);
                release(field);
            }
        }
    }

    [SymDead]() {
        for (const field of this.fieldMap.values()) {
            if (this.emitter) removeSoftEdge(field, this.emitter);
            if (this.consumer) removeSoftEdge(this.consumer, field);
            release(field);
        }

        if (this.emitter) removeSoftEdge(this.keysField, this.emitter);
        if (this.consumer) removeSoftEdge(this.consumer, this.keysField);
        release(this.keysField);

        if (this.emitter) release(this.emitter);
        if (this.consumer) release(this.consumer);
    }

    [SymAlive]() {
        if (this.emitter) retain(this.emitter);
        if (this.consumer) retain(this.consumer);

        retain(this.keysField);
        if (this.emitter) addSoftEdge(this.keysField, this.emitter);
        if (this.consumer) addSoftEdge(this.consumer, this.keysField);

        for (const field of this.fieldMap.values()) {
            retain(field);
            if (this.emitter) addSoftEdge(field, this.emitter);
            if (this.consumer) addSoftEdge(this.consumer, field);
        }
    }
}
