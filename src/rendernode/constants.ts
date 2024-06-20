export enum RenderNodeCommitPhase {
    COMMIT_UNMOUNT = 0b0001,
    COMMIT_DEL = 0b0010,
    COMMIT_INS = 0b0100,
    COMMIT_MOUNT = 0b1000,
}
