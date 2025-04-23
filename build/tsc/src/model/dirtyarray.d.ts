export declare class DirtyArray {
    private rangeAssociation;
    private dirtyLength;
    private clock;
    constructor();
    markDirty(key: 'length' | {
        start: number;
        end: number;
    }): void;
    tickClock(): void;
    clear(): void;
    resetClock(): void;
    getClock(): number;
    get(key: 'length' | number): number | null;
}
//# sourceMappingURL=dirtyarray.d.ts.map