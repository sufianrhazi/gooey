import * as log from './log';
import {
    Processable,
    Retainable,
    addVertex,
    markDirty,
    removeVertex,
    notifyRead,
} from './engine';
import {
    SymProcessable,
    SymDebugName,
    SymDead,
    SymAlive,
    SymRecalculate,
    SymRefcount,
} from './symbols';

type FieldObserver<T> = (val: T) => void;

export interface Field<T> extends Processable, Retainable {
    _isAlive: boolean;
    get: () => T;
    set: (val: T) => void;
    observe: (observer: FieldObserver<T>) => () => void;
    _val: T;
    // Map of observer to the clock time
    _observers?: Map<FieldObserver<T>, number>;
    _changeClock: number;
}

export function field<T>(val: T, debugName?: string): Field<T> {
    const field: Field<T> = {
        _val: val,
        _isAlive: false,
        _changeClock: 0,
        get: fieldGet,
        set: fieldSet,
        observe: fieldObserve,

        [SymProcessable]: true,
        [SymRefcount]: 0,
        [SymAlive]: fieldAlive,
        [SymDead]: fieldDead,

        [SymDebugName]: debugName ?? 'field',
        [SymRecalculate]: fieldFlush,
    };

    return field;
}

function fieldGet<T>(this: Field<T>): T {
    notifyRead(this);
    return this._val;
}

function fieldSet<T>(this: Field<T>, newVal: T) {
    if (newVal !== this._val) {
        if (this._observers) {
            this._changeClock += 1;
        }
        this._val = newVal;
        if (this._isAlive) {
            markDirty(this);
        }
    }
}

function fieldObserve<T>(this: Field<T>, observer: FieldObserver<T>) {
    if (!this._observers) this._observers = new Map();
    this._observers.set(observer, this._changeClock);
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
        for (const [observer, observeClock] of this._observers) {
            if (observeClock < this._changeClock) {
                observer(this._val);
            }
            this._observers.set(observer, 0);
        }
        this._changeClock = 0;
    }
    return true;
}
