// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {};

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
