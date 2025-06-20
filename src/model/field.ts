import type {
    DynamicInternalSubscription,
    DynamicMut,
    DynamicNonErrorSubscriptionHandler,
    DynamicSubscriptionHandler,
} from '../common/dyn';
import * as log from '../common/log';
import type { Calculation } from './calc';
import { calc } from './calc';
import type { Processable, Retainable } from './engine';
import {
    addVertex,
    getForwardDependencies,
    markDirty,
    notifyRead,
    release,
    removeVertex,
    retain,
} from './engine';

const takeFieldSubscriptionsSymbol = Symbol('takeFieldSubscriptions');

export class Field<T> implements Processable, Retainable, DynamicMut<T> {
    private declare _val: T;
    // Map of subscriber to the clock time
    private declare _subscribers?: Map<
        DynamicNonErrorSubscriptionHandler<T>,
        number
    >;
    private declare _subscriptions: DynamicInternalSubscription<T>[];
    private declare _changeClock: number;

    declare __processable: true;
    declare __refcount: number;
    declare __debugName: string;

    constructor(val: T, debugName?: string) {
        this._val = val;
        this._changeClock = 0;
        this._subscriptions = [];

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

    subscribe(handler: DynamicNonErrorSubscriptionHandler<T>): () => void {
        this.retain();
        if (!this._subscribers) this._subscribers = new Map();
        const subscription: DynamicInternalSubscription<T> = {
            onUnsubscribe: () => {
                if (this._subscribers?.has(handler)) {
                    this._subscribers?.delete(handler);
                    this.release();
                }
                this._subscriptions = this._subscriptions.filter(
                    (sub) => sub !== subscription
                );
            },
            // Yes, this is type incompatible. If a field is replaced by a
            // calc; it's possible the subscription will be passed errors and
            // the caller is not expecting that. This can only occur during hot
            // swapping, and the type error will surface if it is incompatible,
            // so this is "safe"
            handler: handler as DynamicSubscriptionHandler<T>,
        };
        this._subscriptions.push(subscription);
        this._subscribers.set(handler, this._changeClock);
        handler(undefined, this._val);
        return () => subscription.onUnsubscribe();
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
        this._subscribers = undefined;
        this._subscriptions = [];
    }

    __recalculate(): Processable[] {
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
        return [...getForwardDependencies(this)];
    }

    mapCalc<V>(fn: (val: T) => V): Calculation<V> {
        return calc(() => fn(this.get()));
    }

    [takeFieldSubscriptionsSymbol]() {
        const toReturn = this._subscriptions;
        this._subscriptions = [];
        return toReturn;
    }
}

export function field<T>(val: T, debugName?: string): Field<T> {
    return new Field(val, debugName);
}

export function takeFieldSubscriptions<T>(field: Field<T>) {
    return field[takeFieldSubscriptionsSymbol]();
}
