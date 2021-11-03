import {
    InvariantError,
    TypeTag,
    Collection,
    CollectionEvent,
    CollectionObserver,
    ModelField,
    ObserveKey,
} from './types';
import {
    processChange,
    addCollectionDep,
    addDepToCurrentCalculation,
} from './calc';
import * as log from './log';

export function collection<T>(array: T[]): Collection<T> {
    if (!Array.isArray(array)) {
        throw new InvariantError('collection must be provided an array');
    }

    const fields: Map<string | number | symbol, ModelField<T>> = new Map();
    let observers: CollectionObserver<T>[] = [];

    function notify(event: CollectionEvent<T>) {
        observers.forEach((observer) => {
            observer(event);
        });
    }

    function splice(index: number, count: number, ...items: T[]): T[] {
        if (count < 1 && items.length === 0) return []; // noop
        const origLength = array.length;
        const removed = array.splice(index, count, ...items);
        const newLength = array.length;
        notify({
            type: 'splice',
            index,
            count,
            items,
        });

        // Cases to consider:
        // 1. count === items.length: we are replacing count items
        // 2. count > items.length: we are adding (count - items.length items), notify index to new end
        // 3. count < items.length: we are removing (items.length - count items), notify index to old end

        // Process changes in *added* items
        if (origLength === newLength) {
            for (let i = index; i < index + count; ++i) {
                processChange(getField(i.toString()));
            }
        } else {
            for (let i = index; i < Math.max(newLength, origLength); ++i) {
                processChange(getField(i.toString()));
            }
            processChange(getField('length'));
        }
        return removed;
    }

    function pop(): T | undefined {
        const removed = splice(array.length - 1, 1);
        return removed[0];
    }

    function shift(): T | undefined {
        const removed = splice(0, 1);
        return removed[0];
    }

    function push(...items: T[]): number {
        splice(array.length, 0, ...items);
        return array.length;
    }

    function unshift(...items: T[]): number {
        splice(0, 0, ...items);
        return array.length;
    }

    function reject(func: (item: T, index: number) => boolean) {
        for (let i = proxy.length - 1; i >= 0; --i) {
            if (!func(proxy[i], i)) {
                proxy.splice(i, 1);
            }
        }
    }

    function sort(sorter: (a: T, b: T) => number): T[] {
        // TODO: figure out how to send position differences to observer
        array.sort(sorter);
        observers.forEach((observer) => {
            observer({
                type: 'sort',
            });
        });
        return proxy;
    }

    function mapView<V>(
        mapper: (item: T, index: number, array: readonly T[]) => V
    ): Readonly<Collection<V>> {
        const mapped = collection(array.map(mapper));
        // This probably needs to:
        // - Live in the global DAG... this _may_ not be needed if we manually retain/release? But that seems wrong...
        // - Have the ability to "delete" this mapped collection, removing the dependencies from the global DAG (and unobserving)
        // - Get triggered on flush() instead of immediately via .observe?
        //
        // Add tests:
        // - changing .length changes mapped collection
        // - push/pop/shift/unshift gets reflected in mapped collection (on flush?)
        // - splice gets reflected in mapped collection
        // - sort gets reflected in mapped collection
        //
        // Make it live in the global DAG:
        // - addCollectionDep(proxy, mapped);
        proxy[ObserveKey]((event) => {
            if (event.type === 'sort') {
                // TODO: implement mapped sort (reposition items... somehow)
                return;
            } else if (event.type === 'splice') {
                const { index, count, items } = event;
                // Well that's deceptively easy
                mapped.splice(index, count, ...items.map(mapper));
            }
        });
        return mapped;
    }

    function set(index: number, val: T): void {
        splice(index, 1, val);
    }

    function observe(observer: CollectionObserver<T>) {
        observers.push(observer);
        observer({
            type: 'init',
            items: array,
        });
        return () => {
            observers = observers.filter((obs) => obs !== observer);
        };
    }

    const methods = {
        splice,
        pop,
        shift,
        push,
        unshift,
        [ObserveKey]: observe,
        sort,
        reject,
        mapView,
    };

    function getField(key: string | number | symbol) {
        let field = fields.get(key);
        if (!field) {
            field = {
                model: proxy,
                key,
            };
            fields.set(key, field);
        }
        return field;
    }

    const proxy = new Proxy(array, {
        get(target: any, key: string | symbol) {
            if (key in methods) {
                return (methods as any)[key];
            }
            if (key === TypeTag) {
                return 'collection';
            }
            const field = getField(key);
            addCollectionDep(proxy, field);
            addDepToCurrentCalculation(field);
            return target[key];
        },

        set(target: any, key: string | number | symbol, value: any) {
            if (key in methods) {
                log.error(
                    'Overriding certain collection methods not supported',
                    key
                );
                // TODO(sufian): maybe support this?
                return false;
            }
            const numericKey = Number(key);
            if (!isNaN(numericKey) && numericKey <= array.length) {
                set(numericKey, value);
                return true;
            }
            const field = getField(key);
            processChange(field);
            target[key] = value;
            return true;
        },

        deleteProperty(target: any, key) {
            if (key in methods) {
                log.error(
                    'Deleting certain collection methods not supported',
                    key
                );
                // TODO(sufian): maybe support this?
                return false;
            }
            const field = getField(key);
            processChange(field); // TODO(sufian): what to do here?
            delete target[key];
            return true;
        },
    }) as Collection<T>;

    return proxy;
}
