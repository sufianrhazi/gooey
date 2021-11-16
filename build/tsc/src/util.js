// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => { };
export const sleep = (ms) => new Promise((resolve) => setTimeout(() => resolve(), ms));
export function makePromise() {
    let resolve = noop;
    let reject = noop;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}
export function groupBy2(items, grouper) {
    const grouped = new Map();
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
//# sourceMappingURL=util.js.map