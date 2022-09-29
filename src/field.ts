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

type FieldSubscriber<T> = (val: T) => void;

export interface Field<T> extends Processable, Retainable {
    _isAlive: boolean;
    get: () => T;
    set: (val: T) => void;
    subscribe: (subscriber: FieldSubscriber<T>) => () => void;
    _val: T;
    // Map of subscriber to the clock time
    _subscribers?: Map<FieldSubscriber<T>, number>;
    _changeClock: number;
}

export function field<T>(val: T, debugName?: string): Field<T> {
    const field: Field<T> = {
        _val: val,
        _isAlive: false,
        _changeClock: 0,
        get: fieldGet,
        set: fieldSet,
        subscribe: fieldSubscribe,

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
        if (this._subscribers) {
            this._changeClock += 1;
        }
        this._val = newVal;
        if (this._isAlive) {
            markDirty(this);
        }
    }
}

function fieldSubscribe<T>(this: Field<T>, subscriber: FieldSubscriber<T>) {
    if (!this._subscribers) this._subscribers = new Map();
    this._subscribers.set(subscriber, this._changeClock);
    return () => this._subscribers?.delete(subscriber);
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
    if (this._subscribers) {
        for (const [subscriber, observeClock] of this._subscribers) {
            if (observeClock < this._changeClock) {
                subscriber(this._val);
            }
            this._subscribers.set(subscriber, 0);
        }
        this._changeClock = 0;
    }
    return true;
}
