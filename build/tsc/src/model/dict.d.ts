import type { View } from './collection';
import type { Retainable } from './engine';
import { TrackedData } from './trackeddata';
export declare enum DictEventType {
    ADD = "add",
    SET = "set",
    DEL = "del"
}
export type DictEvent<K, V> = {
    type: DictEventType.ADD;
    prop: K;
    value: V;
} | {
    type: DictEventType.SET;
    prop: K;
    value: V;
} | {
    type: DictEventType.DEL;
    prop: K;
    value?: V;
};
export type Model<T extends {}> = T;
declare const sizeSymbol: unique symbol;
declare const keysSymbol: unique symbol;
declare const trackedDataSymbol: unique symbol;
export declare class Dict<K, V> implements Retainable {
    private items;
    [trackedDataSymbol]: TrackedData<K | typeof sizeSymbol | typeof keysSymbol, DictEvent<K, V>>;
    __refcount: number;
    __debugName: string;
    constructor(init?: [key: K, value: V][] | undefined, debugName?: string);
    getItemsUnsafe(): Map<K, V>;
    get(key: K): V | undefined;
    has(key: K): boolean;
    set(key: K, value: V): void;
    delete(key: K): void;
    clear(): void;
    forEach(fn: (value: V, key: K) => void): void;
    keysView(debugName?: string): View<K>;
    keys(): Generator<K, void, unknown>;
    values(): Generator<V, void, unknown>;
    entries(): Generator<[K, V], void, unknown>;
    get size(): number;
    subscribe(handler: (events: Iterable<DictEvent<K, V>>) => void): () => void;
    retain(): void;
    release(): void;
    __alive(): void;
    __dead(): void;
}
export declare function getDictTrackedData<K, V>(dict: Dict<K, V>): TrackedData<K | typeof sizeSymbol | typeof keysSymbol, DictEvent<K, V>>;
export declare function dict<K, V>(entries?: [K, V][], debugName?: string): Dict<K, V>;
export declare function isDict(value: unknown): value is Dict<unknown, unknown>;
export {};
//# sourceMappingURL=dict.d.ts.map