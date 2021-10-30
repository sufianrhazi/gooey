export declare class InvariantError extends Error {
}
export declare const TypeTag: unique symbol;
declare const CalculationTypeTag: unique symbol;
export declare type Ref<T> = {
    [TypeTag]: 'ref';
    current?: T;
};
export declare function isRef(ref: any): ref is Ref<unknown>;
export declare function ref<T>(val?: T): Ref<T>;
export declare type CollectionEvent<T> = {
    type: 'splice';
    index: number;
    count: number;
    items: readonly T[];
} | {
    type: 'init';
    items: readonly T[];
} | {
    type: 'sort';
};
export declare type CollectionObserver<T> = (event: CollectionEvent<T>) => void;
export declare type Model<T> = T & {
    [TypeTag]: 'model';
};
declare type MappingFunction<T, V> = (item: T, index: number, array: T[]) => V;
export declare const OnCollectionRelease: unique symbol;
export interface Collection<T> extends Array<T> {
    [TypeTag]: 'collection';
    observe(observer: CollectionObserver<T>): () => void;
    mapView<V>(fn: MappingFunction<T, V>): Readonly<Collection<V>>;
    retain(): void;
    release(): void;
    [OnCollectionRelease]: (fn: () => void) => void;
}
export declare type Calculation<Result> = (() => Result) & {
    [TypeTag]: 'calculation';
    [CalculationTypeTag]: 'calculation' | 'effect';
};
export interface ModelField<T> {
    model: Model<T> | Collection<T>;
    key: string | number | symbol;
}
export declare function makeCalculation<Ret>(fn: () => Ret): Calculation<Ret>;
export declare function makeEffect(fn: () => void): Calculation<void>;
export declare function isCollection(thing: any): thing is Collection<unknown>;
export declare function isCalculation(thing: any): thing is Calculation<unknown>;
export declare function isEffect<T>(thing: Calculation<unknown>): boolean;
export {};
//# sourceMappingURL=types.d.ts.map