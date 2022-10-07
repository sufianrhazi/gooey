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
    private fieldMap: Map<string, Field<any>>;
    private consumer: (Retainable & Processable) | null;
    private emitter: (Retainable & Processable) | null;

    [SymDebugName]: string;
    [SymRefcount] = 0;

    constructor(
        consumer: (Retainable & Processable) | null,
        emitter: (Retainable & Processable) | null,
        debugName?: string
    ) {
        this[SymDebugName] = debugName ?? 'fieldmap';
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
        if (this.emitter) release(this.emitter);
        if (this.consumer) release(this.consumer);
    }

    [SymAlive]() {
        if (this.emitter) retain(this.emitter);
        if (this.consumer) retain(this.consumer);
        for (const field of this.fieldMap.values()) {
            retain(field);
            if (this.emitter) addSoftEdge(field, this.emitter);
            if (this.consumer) addSoftEdge(this.consumer, field);
        }
    }
}
