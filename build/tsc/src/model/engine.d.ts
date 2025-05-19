import type { Component } from '../viewcontroller/rendernode/componentrendernode';
import type { Collection, View } from './collection';
export interface Retainable {
    __debugName: string;
    __refcount: number;
    __alive: () => void;
    __dead: () => void;
}
export interface Processable {
    __processable: true;
    __debugName: string;
    __recalculate?: (vertexSet: Set<Processable>) => Processable[];
    __cycle?: () => void;
    __invalidate?: () => void;
}
export declare function isProcessable(val: any): val is Processable;
/**
 * When reader R reads data D, data D calls `const reader = notifyRead(data)`
 *
 *   An edge is added between data D -> reader R
 *   Data D should be retained if it is a new dependency (by reader R, responsibility to do this is on the reader R)
 *   Data D gets a reference back to Reader R so it may markDirty(reader) when D is processed and needs to propagate change
 */
type OnReadCallback = (vertex: Retainable & Processable) => Retainable & Processable;
export type MountSubscription = () => void;
export declare function reset(): void;
export declare function registerMountPoint(target: Element | ShadowRoot, mountSubscription: MountSubscription): void;
export declare function takeMountPoint(target: Element | ShadowRoot): MountSubscription | undefined;
export declare function registerComponentReload<T>(component: Component<T>, reload: (newComponent: typeof component) => void): void;
export declare function unregisterComponentReload<T>(component: Component<T>, reload: (newComponent: typeof component) => void): void;
export declare function registerCollectionViewReload<T>(coll: Collection<T> | View<T>, reload: (newComponent: typeof coll) => void): void;
export declare function unregisterCollectionViewReload<T>(coll: Collection<T> | View<T>, reload: (newComponent: typeof coll) => void): void;
export declare function hotSwap(beforeExport: unknown, afterExport: unknown): void;
export declare function flush(): void;
export declare function subscribe(scheduler?: (callback: () => void) => () => void): void;
export declare function retain(retainable: Retainable): void;
export declare function release(retainable: Retainable): void;
export declare function addVertex(vertex: Processable): void;
export declare function removeVertex(vertex: Processable): void;
export declare function addEdge(fromVertex: Processable, toVertex: Processable): void;
export declare function removeEdge(fromVertex: Processable, toVertex: Processable): void;
export declare function markDirty(vertex: Processable): void;
export declare function unmarkDirty(vertex: Processable): void;
export declare function markCycleInformed(vertex: Processable): void;
export declare function trackReads<T>(onRead: OnReadCallback, fn: () => T, debugName?: string): T;
export declare function untrackReads<T>(fn: () => T, debugName?: string): T;
export declare function notifyRead(dependency: Retainable & Processable): undefined | (Retainable & Processable);
export declare function getForwardDependencies(dependency: Retainable & Processable): Generator<Processable, void, unknown>;
export declare function debug(activeVertex?: Processable, label?: string): string;
export declare function debugSubscribe(fn: (label: string, graphviz: string) => void): () => void;
export declare function debugGetGraph(): {
    vertices: Processable[];
    edges: [Processable, Processable][];
    labels: Map<Processable, string>;
};
export {};
//# sourceMappingURL=engine.d.ts.map