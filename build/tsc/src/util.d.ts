export declare const noop: () => void;
export declare function noopGenerator(): Generator<never, void, unknown>;
export declare const dead: () => any;
export declare const uniqueid: () => number;
export declare const sleep: (ms: number) => Promise<void>;
export declare function makePromise<T>(): {
    promise: Promise<T>;
    resolve: (val: T) => void;
    reject: (val: T) => void;
};
export declare function groupBy<TItem, TKey, TVal>(items: TItem[], grouper: (item: TItem) => [TKey, TVal]): Map<TKey, TVal[]>;
export declare function groupBy2<TItem, TOuterKey, TInnerKey, TVal>(items: TItem[], grouper: (item: TItem) => [TOuterKey, TInnerKey, TVal]): Map<TOuterKey, Map<TInnerKey, TVal[]>>;
export declare function alwaysTrue(): true;
export declare function alwaysFalse(): false;
export declare function strictEqual<T>(a: T, b: T): boolean;
export declare function randint(low: number, high: number): number;
export declare function median(numbers: number[]): number;
export declare function wrapError(e: unknown, msg?: string): Error;
//# sourceMappingURL=util.d.ts.map