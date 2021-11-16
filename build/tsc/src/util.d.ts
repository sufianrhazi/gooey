export declare const noop: () => void;
export declare const sleep: (ms: number) => Promise<void>;
export declare function makePromise<T>(): {
    promise: Promise<T>;
    resolve: (val: T) => void;
    reject: (val: T) => void;
};
export declare function groupBy2<TItem, TOuterKey, TInnerKey, TVal>(items: TItem[], grouper: (item: TItem) => [TOuterKey, TInnerKey, TVal]): Map<TOuterKey, Map<TInnerKey, TVal[]>>;
//# sourceMappingURL=util.d.ts.map