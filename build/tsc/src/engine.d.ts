import type { RenderNode } from './rendernode';
export interface Retainable {
    __debugName: string;
    __refcount: number;
    __alive: () => void;
    __dead: () => void;
}
export interface Processable {
    __processable: true;
    __debugName: string;
    __recalculate?: (addPostAction: (postAction: () => void) => void) => boolean;
    __cycle?: (addPostAction: (postAction: () => void) => void) => boolean;
    __invalidate?: () => boolean;
}
export declare function isProcessable(val: any): val is Processable;
export declare function reset(): void;
export declare function flush(): void;
export declare function subscribe(scheduler?: (callback: () => void) => () => void): void;
export declare function retain(retainable: Retainable): void;
export declare function release(retainable: Retainable): void;
export declare function addVertex(vertex: Processable): void;
export declare function removeVertex(vertex: Processable): void;
export declare function removeRenderNode(vertex: RenderNode): void;
export declare function dirtyRenderNode(renderNode: RenderNode): void;
export declare function addHardEdge(fromVertex: Processable, toVertex: Processable): void;
export declare function addSoftEdge(fromVertex: Processable, toVertex: Processable): void;
export declare function removeHardEdge(fromVertex: Processable, toVertex: Processable): void;
export declare function removeSoftEdge(fromVertex: Processable, toVertex: Processable): void;
export declare function markDirty(vertex: Processable): void;
export declare function unmarkDirty(vertex: Processable): void;
export declare function markCycleInformed(vertex: Processable): void;
export declare function trackReads<T>(set: Set<Retainable>, fn: () => T, debugName?: string): T;
export declare function untrackReads<T>(fn: () => T, debugName?: string): T;
export declare function trackCreates<T>(set: Set<Retainable | (Retainable & Processable)>, fn: () => T, debugName?: string): T;
export declare function untrackCreates<T>(fn: () => T, debugName?: string): T;
export declare function notifyCreate(retainable: Retainable): void;
export declare function notifyRead(dependency: Retainable): void;
export declare function debug(activeVertex?: Processable, label?: string): string;
export declare function debugSubscribe(fn: (label: string, graphviz: string) => void): () => void;
export declare function debugGetGraph(): {
    vertices: Processable[];
    edges: [Processable, Processable][];
    labels: Map<Processable, string>;
};
//# sourceMappingURL=engine.d.ts.map