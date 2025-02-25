import type {
    DynamicMut,
    DynamicNonErrorSubscriptionHandler,
} from '../common/dyn';
import * as log from '../common/log';
import type { Calculation } from './calc';
import { calc } from './calc';
import type { Processable, Retainable } from './engine';
import {
    addVertex,
    markDirty,
    notifyRead,
    release,
    removeVertex,
    retain,
} from './engine';

export class Field<T> implements Processable, Retainable, DynamicMut<T> {
    private declare _val: T;
    // Map of subscriber to the clock time
    private declare _subscribers?: Map<
        DynamicNonErrorSubscriptionHandler<T>,
        number
    >;
    private declare _changeClock: number;

    declare __processable: true;
    declare __refcount: number;
    declare __debugName: string;

    constructor(val: T, debugName?: string) {
        this._val = val;
        this._changeClock = 0;

        this.__processable = true;
        this.__refcount = 0;

        this.__debugName = debugName ?? 'field';
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
            if (this.__refcount > 0) {
                markDirty(this);
            }
        }
    }

    subscribe(subscriber: DynamicNonErrorSubscriptionHandler<T>): () => void {
        this.retain();
        if (!this._subscribers) this._subscribers = new Map();
        this._subscribers.set(subscriber, this._changeClock);
        subscriber(undefined, this._val);
        return () => {
            if (this._subscribers?.has(subscriber)) {
                this._subscribers?.delete(subscriber);
                this.release();
            }
        };
    }

    retain() {
        retain(this);
    }

    release() {
        release(this);
    }

    __alive() {
        addVertex(this);
    }

    __dead() {
        removeVertex(this);
    }

    __recalculate() {
        log.assert(this.__refcount > 0, 'cannot flush dead field');
        if (this._subscribers) {
            for (const [subscriber, observeClock] of this._subscribers) {
                if (observeClock < this._changeClock) {
                    subscriber(undefined, this._val);
                }
                this._subscribers.set(subscriber, 0);
            }
            this._changeClock = 0;
        }
        return true;
    }

    map<V>(fn: (val: T) => V): Calculation<V> {
        return calc(() => fn(this.get()));
    }
}

export function field<T>(val: T, debugName?: string): Field<T> {
    return new Field(val, debugName);
}
