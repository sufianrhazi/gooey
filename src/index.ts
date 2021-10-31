import {
    InvariantError,
    TypeTag,
    Calculation,
    Model,
    Collection,
    CollectionEvent,
    CollectionObserver,
    ModelField,
    isCalculation,
    isEffect,
    isCollection,
    makeCalculation,
    makeEffect,
} from './types';
import * as log from './log';
export { setLogLevel } from './log';
import { DAG } from './dag';
import { createElement } from './view';
export { Fragment, mount } from './view';
export { Component } from './jsx';

export {
    ref,
    Ref,
    InvariantError,
    Calculation,
    Collection,
    Model,
    OnCollectionRelease,
} from './types';

export default createElement;

export const VERSION = 'development';

let activeCalculations: Calculation<unknown>[] = [];
let calculationToInvalidationMap: Map<
    Calculation<unknown>,
    Function
> = new Map();
let nameMap: WeakMap<any, string> = new WeakMap();

function debugNameFor(
    item: Collection<unknown> | Calculation<unknown> | ModelField<unknown>
): string {
    if (isCollection(item)) {
        return `coll:${nameMap.get(item) ?? '?'}`;
    }
    if (isCalculation(item)) {
        return `${isEffect(item) ? 'eff' : 'comp'}:${nameMap.get(item) ?? '?'}`;
    }
    return `model:${nameMap.get(item.model) ?? '?'}:${String(item.key)}`;
}

let partialDag = new DAG<
    Collection<unknown> | Calculation<unknown> | ModelField<unknown>
>();
let globalDependencyGraph = new DAG<
    Collection<unknown> | Calculation<unknown> | ModelField<unknown>
>();

export function reset() {
    partialDag = new DAG();
    activeCalculations = [];
    calculationToInvalidationMap = new Map();

    globalDependencyGraph = new DAG();
    nameMap = new WeakMap();
}

export function name<T>(item: T, name: string): T {
    nameMap.set(item, name);
    return item;
}

export function model<T extends {}>(obj: T): Model<T> {
    if (typeof obj !== 'object' || !obj) {
        throw new InvariantError('model must be provided an object');
    }

    const fields: Map<string | number | symbol, ModelField<T>> = new Map();

    const proxy = new Proxy(obj, {
        get(target: any, key: string | symbol) {
            if (key === TypeTag) {
                return 'model';
            }
            let field = fields.get(key);
            if (!field) {
                field = {
                    model: proxy,
                    key,
                };
                fields.set(key, field);
            }
            addDepToCurrentCalculation(field);
            return target[key];
        },

        set(target: any, key: string | number | symbol, value: any) {
            let field = fields.get(key);
            if (!field) {
                field = {
                    model: proxy,
                    key,
                };
                fields.set(key, field);
            }
            processChange(field);
            target[key] = value;
            return true;
        },
    }) as Model<T>;

    return proxy;
}

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
        proxy.observe((event) => {
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
        observe,
        sort,
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

export function calc<Ret>(func: () => Ret): Calculation<Ret> {
    return trackCalculation(func, false);
}

export function effect(func: () => void): Calculation<void> {
    return trackCalculation(func, true);
}

function trackCalculation<Ret>(
    func: () => Ret,
    isEffect: boolean
): Calculation<Ret> {
    if (typeof func !== 'function') {
        throw new InvariantError('calculation must be provided a function');
    }

    let result: { result: Ret } | undefined = undefined;

    const invalidate = () => {
        result = undefined;
    };

    const trackedCalculation = (isEffect ? makeEffect : makeCalculation)(
        function runCalculation() {
            if (!isEffect) {
                // effects return void, so they **cannot** have an effect on the current calculation
                addDepToCurrentCalculation(trackedCalculation);
            }

            if (result) {
                return result.result;
            }

            const edgesToRemove: [
                Collection<any> | Calculation<any> | ModelField<any>,
                Calculation<any>
            ][] = globalDependencyGraph
                .getReverseDependencies(trackedCalculation)
                .map((fromNode) => {
                    return [fromNode, trackedCalculation];
                });
            globalDependencyGraph.removeEdges(edgesToRemove);

            activeCalculations.push(trackedCalculation);
            result = { result: func() };

            const sanityCheck = activeCalculations.pop();
            if (sanityCheck !== trackedCalculation) {
                throw new InvariantError(
                    'Active calculation stack inconsistency!'
                );
            }
            return result.result;
        }
    );

    globalDependencyGraph.addNode(trackedCalculation);

    calculationToInvalidationMap.set(trackedCalculation, invalidate);

    // Note: typescript gets confused, this *should* be
    // - Calculation<Ret> when isEffect is true and
    // - Calculation<Ret> when isEffect is false
    // But infers to Calculation<void> because makeEffect is present
    return trackedCalculation as Calculation<Ret>;
}

function addDepToCurrentCalculation<T, Ret>(
    item: Calculation<Ret> | ModelField<T>
) {
    const dependentCalculation =
        activeCalculations[activeCalculations.length - 1];
    if (dependentCalculation) {
        globalDependencyGraph.addNode(item);
        if (!globalDependencyGraph.hasNode(dependentCalculation)) {
            globalDependencyGraph.addNode(dependentCalculation);
        }
        // Confirmed this is correct
        if (globalDependencyGraph.addEdge(item, dependentCalculation)) {
            log.debug(
                'New global dependency',
                debugNameFor(item),
                '->',
                debugNameFor(dependentCalculation)
            );
        }
    }
}

function addCollectionDep<T, V>(
    fromNode: Collection<T>,
    toNode: Collection<V> | ModelField<V>
) {
    globalDependencyGraph.addNode(fromNode);
    globalDependencyGraph.addNode(toNode);
    // Confirmed this is correct
    if (globalDependencyGraph.addEdge(fromNode, toNode)) {
        log.debug(
            'New global collection dependency',
            debugNameFor(fromNode),
            '->',
            debugNameFor(toNode)
        );
    }
}

function processChange(item: ModelField<unknown>) {
    const addNode = (
        node: Collection<unknown> | Calculation<unknown> | ModelField<unknown>
    ) => {
        partialDag.addNode(node);
        const dependencies = globalDependencyGraph.getDependencies(node);
        dependencies.forEach((dependentItem) => {
            if (!partialDag.hasNode(dependentItem)) {
                addNode(dependentItem);
            }
            if (partialDag.addEdge(node, dependentItem)) {
                log.debug(
                    'New local dependency',
                    debugNameFor(item),
                    '->',
                    debugNameFor(dependentItem)
                );
            }
            if (!needsFlush) {
                needsFlush = true;
                notify();
            }
        });
    };
    addNode(item);
}

type Listener = () => void;
let needsFlush = false;

const listeners: Set<Listener> = new Set();
export function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function notify() {
    listeners.forEach((listener) => {
        try {
            listener();
        } catch (e) {
            log.exception(e, 'unhandled exception in subscriber');
        }
    });
}

// build_partial_DAG
export function flush() {
    if (!needsFlush) {
        return;
    }
    needsFlush = false;
    const oldPartialDag = partialDag;
    partialDag = new DAG();
    oldPartialDag.visitTopological((item) => {
        if (isCalculation(item)) {
            log.debug('flushing calculation', debugNameFor(item));
            const invalidation = calculationToInvalidationMap.get(item);
            if (invalidation) {
                invalidation();
            }
            item();
        } else {
            log.debug('flushing model', debugNameFor(item));
        }
    });
    globalDependencyGraph.garbageCollect().forEach((item) => {
        if (isCalculation(item)) {
            log.debug('GC calculation', debugNameFor(item));
        } else {
            log.debug('GC model', debugNameFor(item));
        }
    });
}

export function retain(item: Calculation<any> | Collection<any>) {
    log.debug('retain', debugNameFor(item));
    if (!globalDependencyGraph.hasNode(item)) {
        globalDependencyGraph.addNode(item);
    }
    globalDependencyGraph.retain(item);
}

export function release(item: Calculation<any> | Collection<any>) {
    log.debug('release', debugNameFor(item));
    globalDependencyGraph.release(item);

    // Can probably incrementally implement garbage collection via:
    //
    // Move retain/release into the DAG and
    // - ADD a -> b means a is retained
    // - DEL a -> b means a is released
}

export function debug(): string {
    return globalDependencyGraph.graphviz((id, item) => {
        return `${id}\n${debugNameFor(item)}`;
    });
}
