import type { ArrayEvent } from '../common/arrayevent';
import type { JSXNode } from '../viewcontroller/jsx';
import type { RenderNode } from '../viewcontroller/rendernode/rendernode';
import type { DerivedArraySub } from './arraysub';
import { ArraySub } from './arraysub';
interface CollectionViewSharedInterface<T> {
    /** Destroy the collection */
    dispose(): void;
    /** Retain the collection */
    retain(): void;
    /** Release the collection */
    release(): void;
    __debugName: string;
    mapView<V>(mapFn: (value: T) => V, debugName?: string): View<V>;
    filterView(filterFn: (value: T) => boolean, debugName?: string): View<T>;
    flatMapView<V>(flatMapFn: (value: T) => V[], debugName?: string): View<V>;
    subscribe: (handler: (events: Iterable<ArrayEvent<T>>) => void) => () => void;
}
export interface Collection<T> extends Array<T>, CollectionViewSharedInterface<T> {
    /** Mutate the collection, rejecting items that pass the predicate fn */
    reject(predicate: (value: T) => boolean): T[];
    /** Move portion of the collection to another index */
    moveSlice(from: number, count: number, to: number): void;
    asView(): View<T>;
    __renderNode(renderJsxNode: (jsxNode: JSXNode) => RenderNode): RenderNode;
}
export interface View<T> extends ReadonlyArray<T>, CollectionViewSharedInterface<T> {
    __renderNode(renderJsxNode: (jsxNode: JSXNode) => RenderNode): RenderNode;
}
export declare function collection<T>(values?: T[], debugName?: string): Collection<T>;
export declare function view<T>(arraySub: ArraySub<T> | DerivedArraySub<T, any>, debugName?: string): View<T>;
export {};
//# sourceMappingURL=collection.d.ts.map