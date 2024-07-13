import type { ArrayEvent } from '../common/arrayevent';
import { addArrayEvent, ArrayEventType } from '../common/arrayevent';
import * as log from '../common/log';
import { Sentinel } from '../common/sentinel';
import type { View, ViewImpl } from './collection';
import { makeViewPrototype, ViewHandler } from './collection';
import type { Retainable } from './engine';
import { release, retain } from './engine';
import { Field } from './field';
import { FieldMap } from './fieldmap';
import { SubscriptionEmitter } from './subscriptionemitter';
import { TrackedDataHandle } from './trackeddata';

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

function addDictEvent<K, V>(events: DictEvent<K, V>[], event: DictEvent<K, V>) {
    // TODO: make smarter
    events.push(event);
}

export class Dict<K, V> implements Retainable {
    private declare keysField: Field<number>;
    private declare emitter: SubscriptionEmitter<DictEvent<K, V>>;
    private declare fieldMap: FieldMap;
    private declare ownKeys: Set<K>;
    declare __refcount: number;
    declare __debugName: string;

    constructor(entries: [K, V][] = [], debugName?: string) {
        this.ownKeys = new Set();
        this.keysField = new Field<number>(entries.length);
        this.emitter = new SubscriptionEmitter<DictEvent<K, V>>(
            addDictEvent,
            debugName ?? 'map'
        );
        this.fieldMap = new FieldMap(
            this.keysField,
            null,
            this.emitter,
            debugName
        );
        for (const [key, value] of entries) {
            this.ownKeys.add(key);
            this.fieldMap.getOrMake(key, value);
        }
        this.__refcount = 0;
        this.__debugName = debugName || 'map';
    }

    // Map interface
    clear() {
        this.fieldMap.clear();
        this.ownKeys.forEach((key) => {
            this.emitter.addEvent({
                type: DictEventType.DEL,
                prop: key,
            });
        });
        this.ownKeys.clear();
        this.keysField.set(this.ownKeys.size);
    }

    delete(key: K) {
        this.fieldMap.delete(key);
        if (this.ownKeys.has(key)) {
            this.ownKeys.delete(key);
            this.emitter.addEvent({
                type: DictEventType.DEL,
                prop: key,
            });
            this.keysField.set(this.ownKeys.size);
        }
    }

    forEach(fn: (value: V, key: K) => void) {
        for (const [key, value] of this.fieldMap.entries()) {
            fn(value.get(), key);
        }
    }

    get(key: K): V | undefined {
        const field = this.fieldMap.getOrMake(key, Sentinel);
        const value = field.get();
        if (value === Sentinel) return undefined;
        return value;
    }

    has(key: K) {
        const field = this.fieldMap.getOrMake(key, Sentinel);
        const value = field.get();
        if (value === Sentinel) return false;
        return true;
    }

    set(key: K, value: V): this {
        this.fieldMap.set(key, value);
        if (this.ownKeys.has(key)) {
            this.emitter.addEvent({
                type: DictEventType.SET,
                prop: key,
                value,
            });
        } else {
            this.ownKeys.add(key);
            this.emitter.addEvent({
                type: DictEventType.ADD,
                prop: key,
                value,
            });
            this.keysField.set(this.ownKeys.size);
        }
        return this;
    }

    entries(debugName?: string): View<[K, V]> {
        const initialEntries: [K, V][] = [...this.fieldMap.entries()] as any;
        const derivedCollection = new TrackedDataHandle<
            [K, V][],
            ViewImpl<[K, V]>,
            ArrayEvent<[K, V]>,
            DictEvent<K, V>
        >(
            initialEntries,
            ViewHandler,
            makeViewPrototype(this),
            this.emitter,
            function* keysHandler(
                target: [K, V][],
                events: DictEvent<K, V>[]
            ): IterableIterator<ArrayEvent<[K, V]>> {
                const addEvent = (prop: K, value: V): ArrayEvent<[K, V]> => {
                    const length = target.length;
                    target.push([prop, value]);

                    // Invalidate ranges
                    derivedCollection.fieldMap.set(length.toString(), prop);
                    derivedCollection.fieldMap.set('length', target.length);

                    return {
                        type: ArrayEventType.SPLICE,
                        index: length,
                        count: 0,
                        items: [[prop, value]],
                    };
                };

                for (const event of events) {
                    switch (event.type) {
                        case DictEventType.DEL: {
                            const index = target.findIndex(
                                (item) => item[0] === event.prop
                            );
                            if (index !== -1) {
                                const prevLength = target.length;
                                target.splice(index, 1);
                                const newLength = target.length;

                                // Invalidate ranges
                                for (let i = index; i < target.length; ++i) {
                                    derivedCollection.fieldMap.set(
                                        i.toString(),
                                        target[i]
                                    );
                                }
                                for (let i = newLength; i < prevLength; ++i) {
                                    derivedCollection.fieldMap.delete(
                                        i.toString()
                                    );
                                }
                                derivedCollection.fieldMap.set(
                                    'length',
                                    target.length
                                );

                                yield {
                                    type: ArrayEventType.SPLICE,
                                    index,
                                    count: 1,
                                    items: [],
                                };
                            }
                            break;
                        }
                        case DictEventType.ADD: {
                            yield addEvent(event.prop, event.value);
                            break;
                        }
                        case DictEventType.SET: {
                            const index = target.findIndex(
                                (item) => item[0] === event.prop
                            );
                            if (index === -1) {
                                yield addEvent(event.prop, event.value);
                            } else {
                                const entry: [K, V] = [event.prop, event.value];
                                target.splice(index, 1, entry);
                                yield {
                                    type: ArrayEventType.SPLICE,
                                    index,
                                    count: 1,
                                    items: [entry],
                                };
                            }
                            break;
                        }
                        default:
                            log.assertExhausted(event);
                    }
                }
            },
            addArrayEvent,
            addDictEvent,
            debugName
        );
        return derivedCollection.revocable.proxy;
    }

    keys(debugName?: string): View<K> {
        return this.entries(debugName).mapView(([key, value]) => key);
    }

    values(debugName?: string): View<V> {
        return this.entries(debugName).mapView(([key, value]) => value);
    }

    subscribe(handler: (events: DictEvent<K, V>[]) => void) {
        retain(this.fieldMap);
        const unsubscribe = this.emitter.subscribe((events) => {
            handler(events);
        });
        return () => {
            unsubscribe();
            release(this.fieldMap);
        };
    }

    field(key: K): Field<V | undefined> {
        return this.fieldMap.getOrMake(key, undefined);
    }

    __alive() {
        retain(this.fieldMap);
    }
    __dead() {
        retain(this.emitter);
    }
}

export function dict<K, V>(entries: [K, V][] = [], debugName?: string) {
    return new Dict<K, V>(entries, debugName);
}
