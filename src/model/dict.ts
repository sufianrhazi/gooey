import { ArraySub } from './arraysub';
import { view } from './collection';
import type { View } from './collection';
import { release, retain } from './engine';
import type { Retainable } from './engine';
import { TrackedData } from './trackeddata';

export enum DictEventType {
    ADD = 'add',
    SET = 'set',
    DEL = 'del',
}
export type DictEvent<K, V> =
    | { type: DictEventType.ADD; prop: K; value: V }
    | { type: DictEventType.SET; prop: K; value: V }
    | { type: DictEventType.DEL; prop: K; value?: V };

export type Model<T extends {}> = T;

function* mergeDictEvents<K, V>(events: DictEvent<K, V>[]) {
    if (events.length === 0) {
        return;
    }
    let lastEvent: DictEvent<K, V> | undefined = events[0];
    for (let i = 1; i < events.length; ++i) {
        const event = events[i];
        if (lastEvent?.prop === event.prop) {
            switch (lastEvent.type) {
                case DictEventType.ADD:
                case DictEventType.SET:
                    if (event.type === DictEventType.SET) {
                        lastEvent = {
                            type: lastEvent.type, // ADD/SET followed by SET overwrites with the new value
                            prop: event.prop,
                            value: event.value, // Use overridden value
                        };
                        return;
                    }
                    if (event.type === DictEventType.DEL) {
                        lastEvent = undefined; // ADD/SET followed by DEL is a no-op, so *both* can be omitted
                        return;
                    }
                    break;
                case DictEventType.DEL:
                    if (event.type === DictEventType.ADD) {
                        lastEvent = {
                            type: DictEventType.SET, // DEL followed by ADD is a SET
                            prop: event.prop,
                            value: event.value,
                        };
                    }
                    break;
            }
        } else {
            if (lastEvent) {
                yield lastEvent;
            }
            lastEvent = event;
        }
    }
    if (lastEvent) {
        yield lastEvent;
    }
}

const sizeSymbol = Symbol('dictSize');
const keysSymbol = Symbol('dictKeys');
const trackedDataSymbol = Symbol('trackedData');

export class Dict<K, V> implements Retainable {
    private declare items: Map<K, V>;
    declare [trackedDataSymbol]: TrackedData<
        K | typeof sizeSymbol | typeof keysSymbol,
        DictEvent<K, V>
    >;

    declare __refcount: number;
    declare __debugName: string;

    constructor(init?: [key: K, value: V][] | undefined, debugName?: string) {
        this.items = new Map(init ?? []);
        this[trackedDataSymbol] = new TrackedData(
            mergeDictEvents,
            {},
            debugName
        );

        this.__refcount = 0;
        this.__debugName = debugName ?? 'arraysub';
    }

    getItemsUnsafe() {
        return this.items;
    }

    get(key: K): V | undefined {
        this[trackedDataSymbol].notifyRead(key);
        return this.items.get(key);
    }

    has(key: K): boolean {
        this[trackedDataSymbol].notifyRead(key);
        return this.items.has(key);
    }

    set(key: K, value: V) {
        if (this.items.get(key) === value) {
            // Avoid doing anything if the write is a noop
            return;
        }
        const hasKey = this.items.has(key);
        this.items.set(key, value);
        this[trackedDataSymbol].markDirty(key);

        if (!hasKey) {
            this[trackedDataSymbol].markDirty(sizeSymbol);
            this[trackedDataSymbol].markDirty(keysSymbol);
        }

        this[trackedDataSymbol].addEvent({
            type: hasKey ? DictEventType.SET : DictEventType.ADD,
            prop: key,
            value,
        });

        this[trackedDataSymbol].tickClock();
    }

    delete(key: K) {
        if (!this.items.has(key)) {
            // Avoid doing anything if the delete is a noop
            return;
        }
        this.items.delete(key);
        this[trackedDataSymbol].markDirty(key);
        this[trackedDataSymbol].markDirty(sizeSymbol);
        this[trackedDataSymbol].markDirty(keysSymbol);

        this[trackedDataSymbol].addEvent({
            type: DictEventType.DEL,
            prop: key,
        });

        this[trackedDataSymbol].tickClock();
    }

    clear() {
        if (this.items.size === 0) {
            // Avoid doing anything if clear is noop
            return;
        }
        const keys = Array.from(this.items.keys());
        this.items.clear();
        for (const key of keys) {
            this[trackedDataSymbol].markDirty(key);
            this[trackedDataSymbol].addEvent({
                type: DictEventType.DEL,
                prop: key,
            });
        }
        this[trackedDataSymbol].markDirty(sizeSymbol);

        this[trackedDataSymbol].tickClock();
    }

    forEach(fn: (value: V, key: K) => void) {
        for (const [key, value] of this.entries()) {
            fn(value, key);
        }
    }

    keysView(debugName?: string): View<K> {
        let subscription: undefined | (() => void);
        const arrSub = new ArraySub<K>([], debugName, {
            onAlive: () => {
                subscription = this.subscribe((events) => {
                    for (const event of events) {
                        switch (event.type) {
                            case DictEventType.ADD:
                                arrSub.splice(Infinity, 0, [event.prop]);
                                break;
                            case DictEventType.SET:
                                break;
                            case DictEventType.DEL: {
                                const items = arrSub.getItemsUnsafe();
                                const index = items.indexOf(event.prop);
                                if (index !== -1) {
                                    arrSub.splice(index, 1, []);
                                }
                                break;
                            }
                        }
                    }
                });
            },
            onDead: () => {
                subscription?.();
                subscription = undefined;
            },
        });
        const keysView = view(arrSub, debugName);
        return keysView;
    }

    *keys() {
        this[trackedDataSymbol].notifyRead(keysSymbol);
        const keys = Array.from(this.items.keys());
        for (const key of keys) {
            yield key;
        }
    }

    *values() {
        this[trackedDataSymbol].notifyRead(keysSymbol);
        const keys = Array.from(this.items.keys());
        const values: V[] = [];
        for (const key of keys) {
            this[trackedDataSymbol].notifyRead(key);
            values.push(this.items.get(key)!);
        }
        for (const value of values) {
            yield value;
        }
    }

    *entries() {
        this[trackedDataSymbol].notifyRead(keysSymbol);
        const keys = Array.from(this.items.keys());
        const entries: [K, V][] = [];
        for (const key of keys) {
            this[trackedDataSymbol].notifyRead(key);
            entries.push([key, this.items.get(key)!]);
        }
        for (const entry of entries) {
            yield entry;
        }
    }

    get size() {
        this[trackedDataSymbol].notifyRead(sizeSymbol);
        return this.items.size;
    }

    subscribe(handler: (events: Iterable<DictEvent<K, V>>) => void) {
        this.retain();

        const initialEvents: Iterable<DictEvent<K, V>> = mergeDictEvents(
            Array.from(this.items.entries()).map(([key, value]) => ({
                type: DictEventType.ADD,
                prop: key,
                value,
            }))
        );
        handler(initialEvents);

        const unsubscribe = this[trackedDataSymbol].subscribe(handler);
        return () => {
            unsubscribe();
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
        this[trackedDataSymbol].retain();
    }

    __dead() {
        this[trackedDataSymbol].release();
    }
}

export function getDictTrackedData<K, V>(
    dict: Dict<K, V>
): TrackedData<K | typeof sizeSymbol | typeof keysSymbol, DictEvent<K, V>> {
    return dict[trackedDataSymbol];
}

export function dict<K, V>(entries: [K, V][] = [], debugName?: string) {
    return new Dict<K, V>(entries, debugName);
}

export function isDict(value: unknown): value is Dict<unknown, unknown> {
    return value instanceof Dict;
}
