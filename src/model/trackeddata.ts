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

type TrackedDataSubscriptions<TEvent> = {
    handler: (events: TEvent[]) => void;
    clock: number;
};

export class TrackedData<TKey, TEvent> implements Processable, Retainable {
    private declare itemSubscriptions: Map<
        Retainable & Processable,
        Map<TKey, number>
    >;
    private declare eventSubscriptions: Set<TrackedDataSubscriptions<TEvent>>;
    private declare events: { event: TEvent; clock: number }[];
    private declare dirtyKeys: Map<TKey, number>;
    private declare clock: number;
    private declare onAlive?: (() => void) | undefined;
    private declare onDead?: (() => void) | undefined;
    private declare appendEvent: (events: TEvent[], event: TEvent) => void;

    declare __processable: true;
    declare __refcount: number;
    declare __debugName: string;

    constructor(
        appendEvent: (events: TEvent[], event: TEvent) => void,
        lifecycle?: { onAlive?: () => void; onDead?: () => void },
        debugName?: string
    ) {
        this.appendEvent = appendEvent;
        this.itemSubscriptions = new Map();
        this.eventSubscriptions = new Set();
        this.dirtyKeys = new Map();
        this.clock = 0;
        this.events = [];
        this.onAlive = lifecycle?.onAlive;
        this.onDead = lifecycle?.onDead;

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
        markDirty(this);
    }

    addEvent(event: TEvent) {
        if (this.__refcount === 0) {
            return;
        }
        if (this.eventSubscriptions.size > 0) {
            this.events.push({ event, clock: this.clock });
            markDirty(this);
        }
    }

    subscribe(handler: (event: TEvent[]) => void) {
        this.retain(); // yes, by virtue of subscribing to this, it is retained
        const subscription = {
            handler,
            clock: this.clock,
        };
        this.eventSubscriptions.add(subscription);

        return () => {
            this.eventSubscriptions.delete(subscription);
            this.release();
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
        this.onAlive?.();
    }

    __dead() {
        this.onDead?.();
        removeVertex(this);

        this.itemSubscriptions.clear();
        this.eventSubscriptions.clear();
        this.events = [];
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
            for (const [key, whenRead] of subscriptions.entries()) {
                const whenChanged = this.dirtyKeys.get(key);
                if (whenChanged !== undefined && whenRead <= whenChanged) {
                    toPropagate.add(reader);
                }
            }
        }

        // For all the readers that have been dirtied, clear their subscriptions since they will re-evaluate
        for (const reader of toPropagate) {
            this.itemSubscriptions.delete(reader);
        }

        this.eventSubscriptions.forEach((subscription) => {
            const events: TEvent[] = [];
            this.events.forEach(({ event, clock }) => {
                if (subscription.clock <= clock) {
                    this.appendEvent(events, event);
                }
            });
            if (events.length) {
                subscription.handler(events);
            }
        });

        this.events = [];
        this.dirtyKeys.clear();

        // Propagate dirtiness
        return [...toPropagate];
    }
}
