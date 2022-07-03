import {
    Retainable,
    SymDebugName,
    SymRefcount,
    SymAlive,
    SymDead,
} from './engine';

enum RenderNodeEventType {
    SPLICE,
    MOVE,
    SORT,
}

type RenderNodeEvent = { type: RenderNodeEventType.SPLICE; from: number };

interface RenderNode extends Retainable {
    detach(): void;
    attach(): void;
    onMount(): void;
    onUnmount(): void;
}

class EmptyRenderNode implements RenderNode {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    detach() {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    attach() {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onMount() {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onUnmount() {}
}
