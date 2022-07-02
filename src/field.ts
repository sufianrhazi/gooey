import * as log from './log';
import {
    Processable,
    Retainable,
    addVertex,
    markDirty,
    removeVertex,
    addDependencyToActiveCalculation,
    SymDebugName,
    SymDead,
    SymAlive,
    SymRecalculate,
    SymRefcount,
} from './engine';

type FieldObserver<T> = (val: T) => void;

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

export function field<T>(name: string, val: T, debugName?: string): Field<T> {
    const field: Field<T> = {
        _name: name,
        _val: val,
        _isAlive: false,
        get: fieldGet,
        set: fieldSet,
        update: fieldUpdate,
        observe: fieldObserve,

        [SymRefcount]: 0,
        [SymAlive]: fieldAlive,
        [SymDead]: fieldDead,

        [SymDebugName]: debugName ?? name,
        [SymRecalculate]: fieldFlush,
    };

    return field;
}

function fieldGet<T>(this: Field<T>): T {
    addDependencyToActiveCalculation(this);
    return this._val;
}

function fieldSet<T>(this: Field<T>, newVal: T) {
    if (newVal !== this._val) {
        this._val = newVal;
        if (this._isAlive) {
            markDirty(this);
        }
    }
}

function fieldUpdate<T>(this: Field<T>, updater: (val: T) => T) {
    const newVal = updater(this._val);
    if (newVal !== this._val) {
        this._val = newVal;
        if (this._isAlive) {
            markDirty(this);
        }
    }
}

function fieldObserve<T>(this: Field<T>, observer: FieldObserver<T>) {
    if (!this._observers) this._observers = new Set();
    this._observers.add(observer);
    return () => this._observers?.delete(observer);
}

function fieldAlive<T>(this: Field<T>) {
    this._isAlive = true;
    addVertex(this);
}

function fieldDead<T>(this: Field<T>) {
    removeVertex(this);
    this._isAlive = false;
}

function fieldFlush<T>(this: Field<T>) {
    log.assert(this._isAlive, 'cannot flush dead field');
    if (this._observers) {
        for (const observer of this._observers) {
            observer(this._val);
        }
    }
    return true;
}
