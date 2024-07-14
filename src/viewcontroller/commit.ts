import { noop } from '../common/util';
import { RenderNodeCommitPhase } from './rendernode/constants';
import type { RenderNode } from './rendernode/rendernode';

/**
 * Global state
 */
const COMMIT_SEQUENCE = [
    RenderNodeCommitPhase.COMMIT_UNMOUNT,
    RenderNodeCommitPhase.COMMIT_DELETE,
    RenderNodeCommitPhase.COMMIT_RENDER,
    RenderNodeCommitPhase.COMMIT_INSERT,
    RenderNodeCommitPhase.COMMIT_MOUNT,
];
let commitPhases = {
    [RenderNodeCommitPhase.COMMIT_UNMOUNT]: new Set<RenderNode>(),
    [RenderNodeCommitPhase.COMMIT_DELETE]: new Set<RenderNode>(),
    [RenderNodeCommitPhase.COMMIT_RENDER]: new Set<RenderNode>(),
    [RenderNodeCommitPhase.COMMIT_INSERT]: new Set<RenderNode>(),
    [RenderNodeCommitPhase.COMMIT_MOUNT]: new Set<RenderNode>(),
};
let commitHandle: undefined | (() => void);
let commitScheduler = defaultScheduler;

function defaultScheduler(callback: () => void) {
    if ((window as any).queueMicrotask) {
        let cancelled = false;
        queueMicrotask(() => {
            if (cancelled) return;
            callback();
        });
        return () => {
            cancelled = true;
        };
    }
    const handle = setTimeout(callback, 0);
    return () => clearTimeout(handle);
}

function noopScheduler(callback: () => void) {
    return noop;
}

export function reset() {
    commitPhases = {
        [RenderNodeCommitPhase.COMMIT_UNMOUNT]: new Set<RenderNode>(),
        [RenderNodeCommitPhase.COMMIT_DELETE]: new Set<RenderNode>(),
        [RenderNodeCommitPhase.COMMIT_RENDER]: new Set<RenderNode>(),
        [RenderNodeCommitPhase.COMMIT_INSERT]: new Set<RenderNode>(),
        [RenderNodeCommitPhase.COMMIT_MOUNT]: new Set<RenderNode>(),
    };
    commitHandle = undefined;
    commitScheduler = defaultScheduler;
}

export function commit() {
    while (commitHandle !== undefined) {
        commitHandle = undefined;
        performCommit();
    }
}

export function subscribe(scheduler?: (callback: () => void) => () => void) {
    commitScheduler = scheduler ?? noopScheduler;
}

// Committing has a few phases:
// - 1: notify "onUnmount"
// - 1.5: record document.activeElement
// - 2: commit DOM deletions (notify "raw" DOM deletions)
// - 3: commit DOM insertions (notify "raw" DOM insertions)
// - 3.5: restore document.activeElement if it was moved
// - 4: notify "onMount"
function performCommit() {
    let activeElement: Element | null = null;
    for (const phase of COMMIT_SEQUENCE) {
        if (phase === RenderNodeCommitPhase.COMMIT_DELETE) {
            activeElement = document.activeElement;
        }
        const toCommit = Array.from(commitPhases[phase]).sort(
            (a, b) => b.getDepth() - a.getDepth()
        );
        commitPhases[phase] = new Set();
        for (const renderNode of toCommit) {
            renderNode.commit(phase);
        }
        if (
            phase === RenderNodeCommitPhase.COMMIT_INSERT &&
            activeElement &&
            document.documentElement.contains(activeElement)
        ) {
            (activeElement as HTMLElement).focus();
        }
    }
}

export function requestCommit(
    target: RenderNode,
    phase: RenderNodeCommitPhase
) {
    commitPhases[phase].add(target);
    if (!commitHandle) {
        commitHandle = commitScheduler(commit);
    }
}
