import { Retainable } from './engine';
import { Field } from './field';
import { View } from './collection';
export declare enum MapEventType {
    ADD = "add",
    SET = "set",
    DEL = "del"
}
export type MapEvent<K, V> = {
    type: MapEventType.ADD;
    prop: K;
    value: V;
} | {
    type: MapEventType.SET;
    prop: K;
    value: V;
} | {
    type: MapEventType.DEL;
    prop: K;
    value?: V;
};
export type Model<T extends {}> = T;
export declare function addMapEvent<K, V>(events: MapEvent<K, V>[], event: MapEvent<K, V>): void;
export declare class TrackedMap<K, V> implements Retainable {
    private keysField;
    private emitter;
    private fieldMap;
    private ownKeys;
    __refcount: number;
    __debugName: string;
    constructor(entries?: [K, V][], debugName?: string);
    clear(): void;
    delete(key: K): void;
    forEach(fn: (value: V, key: K) => void): void;
    get(key: K): any;
    has(key: K): boolean;
    set(key: K, value: V): this;
    entries(debugName?: string): View<[K, V]>;
    keys(debugName?: string): View<K>;
    values(debugName?: string): View<V>;
    subscribe(handler: (events: MapEvent<K, V>[]) => void): () => void;
    field(key: K): Field<V | undefined>;
    __alive(): void;
    __dead(): void;
}
export declare function map<K, V>(entries?: [K, V][], debugName?: string): TrackedMap<K, V>;
//# sourceMappingURL=map.d.ts.map