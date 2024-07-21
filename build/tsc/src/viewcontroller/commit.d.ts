import { RenderNodeCommitPhase } from './rendernode/constants';
import type { RenderNode } from './rendernode/rendernode';
export declare function reset(): void;
export declare function commit(): void;
export declare function subscribe(scheduler?: (callback: () => void) => () => void): void;
export declare function requestCommit(target: RenderNode, phase: RenderNodeCommitPhase): void;
//# sourceMappingURL=commit.d.ts.map