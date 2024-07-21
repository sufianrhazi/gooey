import type { RenderNode } from './rendernode';
export declare enum IntrinsicObserverEventType {
    MOUNT = "mount",
    UNMOUNT = "unmount"
}
export type IntrinsicObserverNodeCallback = (node: Node, event: IntrinsicObserverEventType) => void;
export type IntrinsicObserverElementCallback = (element: Element, event: IntrinsicObserverEventType) => void;
export declare function IntrinsicObserverRenderNode(nodeCallback: IntrinsicObserverNodeCallback | undefined, elementCallback: IntrinsicObserverElementCallback | undefined, child: RenderNode, debugName?: string): RenderNode;
//# sourceMappingURL=intrinsicobserverrendernode.d.ts.map