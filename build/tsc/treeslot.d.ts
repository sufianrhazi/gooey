import { RenderChild } from './renderchild';
declare const TreeSlotSymbol: unique symbol;
/**
 * A TreeSlot represents the pre-rendered tree structure for a given node.
 *
 * Since a JsxChild may render to 0, 1, or many DOM nodes, which may be at any
 * index within the DOM tree.
 */
export declare type TreeSlot = {
    domNode: Node | null;
    children: TreeSlot[];
    renderChild: RenderChild | null;
    onUnmount: Function[];
    [TreeSlotSymbol]: true;
};
export declare type TreeSlotIndex = number[];
export declare function makeTreeSlot({ renderChild, domNode, onUnmount, }: {
    renderChild: RenderChild | null;
    domNode: Node | null;
    onUnmount: Function[];
}): TreeSlot;
export declare function isTreeSlot(x: any): x is TreeSlot;
export declare function getTreeSlotParent(root: TreeSlot, treeSlotIndex: TreeSlotIndex): {
    immediateParent: TreeSlot;
    childIndex: number;
    domParent: TreeSlot;
};
export declare function setTreeSlot(root: TreeSlot, treeSlotIndex: TreeSlotIndex, newNode: TreeSlot): TreeSlot | undefined;
export declare function spliceTreeSlot(root: TreeSlot, treeSlotIndex: TreeSlotIndex, removeCount: number, newNodes: TreeSlot[]): TreeSlot[];
export {};
//# sourceMappingURL=treeslot.d.ts.map