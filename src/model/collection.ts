import type { ArrayEvent } from '../common/arrayevent';
import * as log from '../common/log';
import { CollectionRenderNode } from '../modelview/collectionrendernode';
import type { JSXNode } from '../viewcontroller/jsx';
import type { RenderNode } from '../viewcontroller/rendernode/rendernode';
import type { DerivedArraySub, DynamicArray } from './arraysub';
import { ArraySub, filterView, flatMapView, mapView } from './arraysub';

const collectionSymbol = Symbol('collection');

interface CollectionViewSharedInterface<T> {
    //
    // Misc
    //
    /** Destroy the collection */
    dispose(): void;

    /** Retain the collection */
    retain(): void;

    /** Release the collection */
    release(): void;

    __debugName: string;

    //
    // View transformation
    //
    mapView<V>(mapFn: (value: T) => V, debugName?: string): View<V>;
    filterView(filterFn: (value: T) => boolean, debugName?: string): View<T>;
    flatMapView<V>(flatMapFn: (value: T) => V[], debugName?: string): View<V>;

    //
    // Subscription
    //
    subscribe: (handler: (event: ArrayEvent<T>[]) => void) => () => void;
}

export interface Collection<T>
    extends Array<T>,
        CollectionViewSharedInterface<T> {
    //
    // Helper functions
    //
    /** Mutate the collection, rejecting items that pass the predicate fn */
    reject(predicate: (value: T) => boolean): T[];

    /** Move portion of the collection to another index */
    moveSlice(from: number, count: number, to: number): void;

    asView(): View<T>;

    //
    // RenderNode
    //
    __renderNode(renderJsxNode: (jsxNode: JSXNode) => RenderNode): RenderNode;
}

export interface View<T>
    extends ReadonlyArray<T>,
        CollectionViewSharedInterface<T> {
    //
    // RenderNode
    //
    __renderNode(renderJsxNode: (jsxNode: JSXNode) => RenderNode): RenderNode;
}

function makeCollectionOrView<T, I extends { __debugName: string }>(
    dynamicArray: DynamicArray<T>,
    additionalPrototypeProps: I,
    isWritable: boolean,
    setFn: (
        ...args: [prop: 'length', value: number] | [prop: number, value: T]
    ) => boolean
) {
    const values = dynamicArray.getItemsUnsafe();
    const pseudoPrototype: CollectionViewSharedInterface<T> & I = {
        dispose: () => {
            revoke();
        },
        retain: () => {
            dynamicArray.retain();
        },
        release: () => {
            dynamicArray.release();
        },
        mapView: <V>(fn: (val: T) => V, debugName?: string) =>
            view(mapView(dynamicArray, fn), debugName),
        filterView: (fn: (val: T) => boolean, debugName?: string) =>
            view(filterView(dynamicArray, fn), debugName),
        flatMapView: <V>(fn: (val: T) => V[], debugName?: string) =>
            view(flatMapView(dynamicArray, fn), debugName),

        subscribe: (handler: (event: ArrayEvent<T>[]) => void) =>
            dynamicArray.subscribe(handler),

        ...additionalPrototypeProps,
    };

    const getPropertyDescriptor = (prop: string | symbol) => {
        if (prop === collectionSymbol) {
            return {
                value: true,
                writable: false,
                enumerable: false,
                configurable: false,
            };
        }
        if (prop in pseudoPrototype) {
            return {
                value: pseudoPrototype[prop as keyof typeof pseudoPrototype],
                writable: false,
                enumerable: false,
                configurable: false,
            };
        }
        if (prop === 'length') {
            return {
                value: dynamicArray.getLength(),
                writable: false,
                enumerable: true,
                configurable: false,
            };
        }
        const numericProp = typeof prop === 'string' ? parseInt(prop) : null;
        if (numericProp !== null && numericProp.toString() === prop) {
            return {
                value: dynamicArray.get(numericProp),
                writable: isWritable,
                enumerable: true,
                configurable: true,
            };
        }
        return undefined;
    };

    const { proxy, revoke } = Proxy.revocable(values, {
        get: (target, prop, receiver) => {
            const descriptor = getPropertyDescriptor(prop);
            if (!descriptor) {
                return target[prop as any];
            }
            return descriptor.value;
        },
        set: (target, prop, value, receiver) => {
            if (prop === collectionSymbol) {
                return false;
            }
            if (prop in pseudoPrototype) {
                log.warn(
                    'Reassigning built-in methods not supported on collections/views'
                );
                return false;
            }
            if (prop === 'length') {
                return setFn(prop, value);
            }
            const numericProp =
                typeof prop === 'string' ? parseInt(prop) : null;
            if (numericProp !== null && numericProp.toString() === prop) {
                return setFn(numericProp, value);
            }
            log.warn(
                'Cannot assign to unsupported values on collections/views',
                { prop }
            );
            return false;
        },
        has: (target, prop) => {
            return getPropertyDescriptor(prop) !== undefined;
        },
        ownKeys: (target) => {
            const keys: string[] = [];
            const length = dynamicArray.getLength();
            for (let i = 0; i < length; ++i) {
                keys.push(i.toString());
            }
            keys.push('length');
            return keys;
        },
        defineProperty: () => {
            log.warn('defineProperty not supported on collections');
            return false;
        },
        deleteProperty: () => {
            log.warn('delete not supported on collections');
            return false;
        },
        getOwnPropertyDescriptor: (target, prop) => {
            return getPropertyDescriptor(prop);
        },
        setPrototypeOf: () => {
            log.warn('setPrototypeOf not supported on collections');
            return false;
        },
    });
    return proxy;
}

export function collection<T>(
    values: T[] = [],
    debugName: string = 'collection'
): Collection<T> {
    const arraySub = new ArraySub(values);
    const coll = makeCollectionOrView(
        arraySub,
        {
            reject(predicate: (value: T) => boolean): T[] {
                const removed: T[] = [];
                for (let i = arraySub.getLength() - 1; i >= 0; --i) {
                    if (predicate(arraySub.get(i))) {
                        removed.push(arraySub.splice(i, 1, [])![0]);
                    }
                }
                return removed.reverse();
            },
            moveSlice(from: number, count: number, to: number) {
                arraySub.moveSlice(from, count, to);
            },
            splice(index: number, count: number, ...items: T[]) {
                return arraySub.splice(index, count, items);
            },
            sort(fn?: (a: T, b: T) => number) {
                arraySub.sort(fn);
                return this;
            },
            reverse() {
                arraySub.reverse();
                return this;
            },
            pop() {
                const length = arraySub.getItemsUnsafe().length;
                if (length === 0) {
                    return undefined;
                }
                return arraySub.splice(length - 1, 1, [])![0];
            },
            shift() {
                const length = arraySub.getItemsUnsafe().length;
                if (length === 0) {
                    return undefined;
                }
                return arraySub.splice(0, 1, [])![0];
            },
            unshift(...items: T[]) {
                arraySub.splice(0, 0, items);
                return arraySub.getItemsUnsafe().length;
            },
            push(...items: T[]) {
                arraySub.splice(Infinity, 0, items);
                return arraySub.getItemsUnsafe().length;
            },
            asView() {
                return view(arraySub);
            },
            __renderNode: (
                renderJsxNode: (jsxNode: JSXNode) => RenderNode
            ): RenderNode => {
                return CollectionRenderNode(renderJsxNode, coll, debugName);
            },
            __debugName: debugName,
        },
        true,
        (prop, value) => {
            if (prop === 'length') {
                arraySub.setLength(value);
            } else {
                arraySub.set(prop, value);
            }
            return true;
        }
    ) as Collection<T>;
    return coll;
}

export function view<T>(
    arraySub: ArraySub<T> | DerivedArraySub<T, any>,
    debugName: string = `view(${arraySub.__debugName})`
): View<T> {
    function unsupported(): boolean {
        throw new Error('Cannot mutate readonly view');
    }
    const v = makeCollectionOrView(
        arraySub,
        {
            push: unsupported,
            unshift: unsupported,
            pop: unsupported,
            shift: unsupported,
            __renderNode: (
                renderJsxNode: (jsxNode: JSXNode) => RenderNode
            ): RenderNode => {
                return CollectionRenderNode(renderJsxNode, v, debugName);
            },
            __debugName: debugName,
        },
        false,
        unsupported
    ) as unknown as View<T>;
    return v;
}
