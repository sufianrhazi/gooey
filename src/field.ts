import * as log from './log';
import { Sentinel } from './sentinel';
import {
    Processable,
    Retainable,
    addVertex,
    markDirty,
    removeVertex,
    addDependencyToActiveCalculation,
    SymDebugName,
    SymDestroy,
    SymRecalculate,
    SymRefcount,
} from './engine';

type FieldObserver<T> = (val: T) => void;

export interface Field<T> extends Processable, Retainable {
    _name: string;
    get: () => T;
    set: (val: T) => void;
    update: (val: (prev: T) => T) => void;
    observe: (observer: FieldObserver<T>) => () => void;
    _val: Sentinel | T;
    _observers?: Set<FieldObserver<T>>;
}

export function field<T>(name: string, val: T, debugName?: string): Field<T> {
    const field: Field<T> = {
        _name: name,
        _val: val,
        get: fieldGet,
        set: fieldSet,
        update: fieldUpdate,
        observe: fieldObserve,

        [SymRefcount]: 1,
        [SymDestroy]: fieldDestroy,

        [SymDebugName]: debugName ?? name,
        [SymRecalculate]: fieldFlush,
    };

    addVertex(field);

    return field;
}

function fieldGet<T>(this: Field<T>): T {
    log.assert(this._val !== Sentinel, 'read dead field');
    addDependencyToActiveCalculation(this);
    return this._val;
}

function fieldSet<T>(this: Field<T>, newVal: T) {
    log.assert(this._val !== Sentinel, 'wrote dead field');
    if (newVal !== this._val) {
        this._val = newVal;
        markDirty(this);
    }
}

function fieldUpdate<T>(this: Field<T>, updater: (val: T) => T) {
    log.assert(this._val !== Sentinel, 'wrote dead field');
    const newVal = updater(this._val);
    if (newVal !== this._val) {
        this._val = newVal;
        markDirty(this);
    }
}

function fieldObserve<T>(this: Field<T>, observer: FieldObserver<T>) {
    log.assert(this._val !== Sentinel, 'wrote dead field');
    if (!this._observers) this._observers = new Set();
    this._observers.add(observer);
    return () => this._observers?.delete(observer);
}

function fieldDestroy<T>(this: Field<T>) {
    removeVertex(this);

    this._val = Sentinel;
}

function fieldFlush<T>(this: Field<T>) {
    log.assert(this._val !== Sentinel, 'flushed dead field');
    if (this._observers) {
        for (const observer of this._observers) {
            observer(this._val);
        }
    }
    return true;
}
