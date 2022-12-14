// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {};

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function* noopGenerator() {}

export const dead = (): any => {
    throw new Error('Cannot call dead function');
};

export const uniqueid = (() => {
    let id = 1;
    return () => id++;
})();

export const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(() => resolve(), ms));

export function makePromise<T>(): {
    promise: Promise<T>;
    resolve: (val: T) => void;
    reject: (val: T) => void;
} {
    let resolve: (val: T) => void = noop;
    let reject: (val: T) => void = noop;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

export function groupBy<TItem, TKey, TVal>(
    items: TItem[],
    grouper: (item: TItem) => [TKey, TVal]
): Map<TKey, TVal[]> {
    const grouped: Map<TKey, TVal[]> = new Map();
    items.forEach((item) => {
        const [key, val] = grouper(item);
        let inner = grouped.get(key);
        if (!inner) {
            inner = [];
            grouped.set(key, inner);
        }
        inner.push(val);
    });
    return grouped;
}

export function groupBy2<TItem, TOuterKey, TInnerKey, TVal>(
    items: TItem[],
    grouper: (item: TItem) => [TOuterKey, TInnerKey, TVal]
) {
    const grouped: Map<TOuterKey, Map<TInnerKey, TVal[]>> = new Map();
    items.forEach((item) => {
        const [outerKey, innerKey, val] = grouper(item);
        let outer = grouped.get(outerKey);
        if (!outer) {
            outer = new Map();
            grouped.set(outerKey, outer);
        }
        let inner = outer.get(innerKey);
        if (!inner) {
            inner = [];
            outer.set(innerKey, inner);
        }
        inner.push(val);
    });
    return grouped;
}

export function alwaysTrue(): true {
    return true;
}

export function alwaysFalse(): false {
    return false;
}

export function strictEqual<T>(a: T, b: T): boolean {
    return a === b;
}

export function randint(low: number, high: number): number {
    return Math.floor(Math.random() * (high - low)) + low;
}

export function median(numbers: number[]): number {
    const sorted = numbers.slice().sort((a, b) => a - b);
    return (
        (sorted[Math.floor((numbers.length - 1) / 2)] +
            sorted[Math.ceil((numbers.length - 1) / 2)]) /
        2
    );
}

export function wrapError(e: unknown, msg?: string): Error {
    if (e instanceof Error) return e;
    // @ts-ignore -- 2nd error cause param harmless to add
    const err = new Error(msg ?? 'Unknown error', { cause: e });
    return err;
}
