import * as log from '../common/log';
import {
    addVertex,
    markDirty,
    notifyRead,
    release,
    removeVertex,
    retain,
} from './engine';
import type { Processable, Retainable } from './engine';

export type TrackedDataSubscription<TEvent> = {
    onUnsubscribe: () => void;
    handler: (events: Iterable<TEvent>) => void;
    events: TEvent[];
};

export class TrackedData<TKey, TEvent> implements Processable, Retainable {
    private declare itemSubscriptions: Map<
        Retainable & Processable,
        Map<TKey, number>
    >;
    private declare eventSubscriptions: TrackedDataSubscription<TEvent>[];
    private declare dirtyKeys: Map<TKey, number>;
    private declare clock: number;
    private declare onAlive?: (() => void) | undefined;
    private declare onDead?: (() => void) | undefined;
    private declare mergeEvents: (events: TEvent[]) => Iterable<TEvent>;
    private declare isDirty: boolean;

    declare __processable: true;
    declare __refcount: number;
    declare __debugName: string;

    constructor(
        mergeEvents: (events: TEvent[]) => Iterable<TEvent>,
        lifecycle?: { onAlive?: () => void; onDead?: () => void },
        debugName?: string
    ) {
        this.mergeEvents = mergeEvents;
        this.itemSubscriptions = new Map();
        this.eventSubscriptions = [];
        this.dirtyKeys = new Map();
        this.clock = 0;
        this.onAlive = lifecycle?.onAlive;
        this.onDead = lifecycle?.onDead;
        this.isDirty = false;

        this.__processable = true;
        this.__refcount = 0;
        this.__debugName = debugName ?? 'arraysub';
    }

    tickClock() {
        this.clock += 1;
    }

    notifyRead(key: TKey) {
        const reader = notifyRead(this);
        if (reader && reader.__refcount > 0) {
            let subscriptions = this.itemSubscriptions.get(reader);
            if (!subscriptions) {
                subscriptions = new Map();
                this.itemSubscriptions.set(reader, subscriptions);
            }
            if (!subscriptions.has(key)) {
                subscriptions.set(key, this.clock);
            }
        }
    }

    markDirty(key: TKey) {
        if (this.__refcount === 0) {
            return;
        }
        if (!this.dirtyKeys.has(key)) {
            this.dirtyKeys.set(key, this.clock);
        }
        if (!this.isDirty) {
            markDirty(this);
            this.isDirty = true;
        }
    }

    addEvent(event: TEvent) {
        if (this.__refcount === 0) {
            return;
        }
        if (this.eventSubscriptions.length > 0) {
            for (const subscription of this.eventSubscriptions) {
                subscription.events.push(event);
            }
            if (!this.isDirty) {
                markDirty(this);
                this.isDirty = true;
            }
        }
    }

    subscribe(handler: (events: Iterable<TEvent>) => void) {
        this.retain(); // yes, by virtue of subscribing to this, it is retained
        const subscription = {
            onUnsubscribe: () => {
                const index = this.eventSubscriptions.indexOf(subscription);
                if (index >= 0) {
                    this.eventSubscriptions.splice(index, 1);
                    this.release();
                }
            },
            handler,
            events: [],
        };
        this.eventSubscriptions.push(subscription);

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
        this.onAlive?.();
    }

    __dead() {
        this.onDead?.();
        removeVertex(this);

        this.itemSubscriptions.clear();
        this.eventSubscriptions = [];
        this.dirtyKeys.clear();
        this.clock = 0;
    }

    __recalculate(): Processable[] {
        log.assert(this.__refcount > 0, 'cannot flush dead trackeddata');

        const toPropagate = new Set<Retainable & Processable>();

        // First propagate dirtiness for keys
        for (const [
            reader,
            subscriptions,
        ] of this.itemSubscriptions.entries()) {
            if (reader.__refcount > 0) {
                for (const [key, whenRead] of subscriptions.entries()) {
                    const whenChanged = this.dirtyKeys.get(key);
                    if (whenChanged !== undefined && whenRead <= whenChanged) {
                        toPropagate.add(reader);
                    }
                }
            }
        }

        // For all the readers that have been dirtied, clear their subscriptions since they will re-evaluate
        for (const reader of toPropagate) {
            this.itemSubscriptions.delete(reader);
        }

        this.eventSubscriptions.forEach((subscription) => {
            if (subscription.events.length) {
                subscription.handler(this.mergeEvents(subscription.events));
                subscription.events = [];
            }
        });

        this.dirtyKeys.clear();
        this.isDirty = false;

        // Propagate dirtiness
        return [...toPropagate];
    }

    takeSubscriptions() {
        const toReturn = this.eventSubscriptions;
        this.eventSubscriptions = [];
        return toReturn;
    }
}
