// Committing is performed in five steps:
// - 1: UNMOUNT: before any node removal occurs, we can notify "onUnmount"
// - 2: DELETE: perform the removal of DOM nodes
// - 3: RENDER: render any new content, which may emit DOM nodes
// - 4: INSERT: perform the insertion of DOM nodes
// - 5: MOUNT: notify "onMount" (probably can be removed)
export enum RenderNodeCommitPhase {
    COMMIT_UNMOUNT,
    COMMIT_DELETE,
    COMMIT_RENDER,
    COMMIT_INSERT,
    COMMIT_MOUNT,
}
