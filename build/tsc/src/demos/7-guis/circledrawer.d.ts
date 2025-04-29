import type { Calculation, Collection, Model, Ref } from '../..';
import { ClassComponent } from '../..';
import type { WindowPosition } from './window';
declare class UndoStack<TAction, TResult> {
    accum: TResult;
    canUndo: Calculation<boolean>;
    canRedo: Calculation<boolean>;
    private actions;
    private state;
    private doAction;
    private undoAction;
    constructor(init: TResult, config: {
        doAction: (val: TResult, action: TAction) => TResult;
        undoAction: (val: TResult, action: TAction) => TResult;
    });
    addAction(action: TAction): void;
    undo(): void;
    redo(): void;
}
type Circle = Model<{
    x: number;
    y: number;
    r: number;
}>;
type Action = {
    type: 'new';
    circle: Circle;
} | {
    type: 'adjust';
    from: Circle;
    to: Circle;
};
export declare class CircleDrawer extends ClassComponent {
    childWindowPosition: undefined | WindowPosition;
    undoStack: UndoStack<Action, Collection<Circle>>;
    state: Model<{
        width: number;
        height: number;
        selected: null | Circle;
        dynamicR: number;
    }>;
    svgContainerEl: Ref<HTMLDivElement | undefined>;
    actions: Action[];
    constructor(props: {});
    renderChildWindow(): import("../../viewcontroller/rendernode/rendernode").RenderNode;
    onMount(): () => void;
    onUndoClick: () => void;
    onRedoClick: () => void;
    saveAdjustment(): void;
    onSvgClick: (event: MouseEvent) => void;
    render(): import("../../viewcontroller/rendernode/rendernode").RenderNode;
}
export {};
//# sourceMappingURL=circledrawer.d.ts.map