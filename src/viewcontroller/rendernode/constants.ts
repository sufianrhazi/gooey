// Committing is performed in five steps:
// - 1: UNMOUNT: before any node removal occurs, we can notify "onUnmount"
// - 2: EMIT: render any new content, which may emit DOM nodes
// - 3: UPDATE: perform the insertion of DOM nodes
// - 4: MOUNT: notify "onMount" (probably can be removed)
export enum RenderNodeCommitPhase {
    COMMIT_UNMOUNT,
    COMMIT_EMIT,
    COMMIT_UPDATE,
    COMMIT_MOUNT,
}
