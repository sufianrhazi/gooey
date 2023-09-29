import { Retainable } from './engine';
import { Field } from './field';
import { View } from './collection';
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
export declare class Dict<K, V> implements Retainable {
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
    get(key: K): V | undefined;
    has(key: K): boolean;
    set(key: K, value: V): this;
    entries(debugName?: string): View<[K, V]>;
    keys(debugName?: string): View<K>;
    values(debugName?: string): View<V>;
    subscribe(handler: (events: DictEvent<K, V>[]) => void): () => void;
    field(key: K): Field<V | undefined>;
    __alive(): void;
    __dead(): void;
}
export declare function dict<K, V>(entries?: [K, V][], debugName?: string): Dict<K, V>;
//# sourceMappingURL=dict.d.ts.map