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

export class Field<T> implements Processable, Retainable {
    private _isAlive: boolean;
    private _val: T;
    // Map of subscriber to the clock time
    private _subscribers?: Map<FieldSubscriber<T>, number>;
    private _changeClock: number;

    [SymProcessable]: true;
    [SymRefcount]: number;
    [SymDebugName]: string;

    constructor(val: T, debugName?: string) {
        this._val = val;
        this._isAlive = false;
        this._changeClock = 0;

        this[SymProcessable] = true;
        this[SymRefcount] = 0;

        this[SymDebugName] = debugName ?? 'field';
    }

    get(): T {
        notifyRead(this);
        return this._val;
    }

    set(newVal: T) {
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

    subscribe(subscriber: FieldSubscriber<T>): () => void {
        if (!this._subscribers) this._subscribers = new Map();
        this._subscribers.set(subscriber, this._changeClock);
        return () => this._subscribers?.delete(subscriber);
    }

    [SymAlive]() {
        this._isAlive = true;
        addVertex(this);
    }

    [SymDead]() {
        removeVertex(this);
        this._isAlive = false;
    }

    [SymRecalculate]() {
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
}

export function field<T>(val: T, debugName?: string): Field<T> {
    return new Field(val, debugName);
}
