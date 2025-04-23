export declare class SumArray {
    bucketBits: number;
    bucketSize: number;
    slots: number[];
    buckets: number[];
    constructor(bucketBits: number, items: number[]);
    private recreate;
    private updateBuckets;
    splice(index: number, count: number, items: number[]): void;
    move(fromIndex: number, count: number, toIndex: number): void;
    sort(fromIndex: number, indices: number[]): void;
    getSum(index: number): number;
    get(index: number): number;
    set(index: number, value: number): void;
}
//# sourceMappingURL=sumarray.d.ts.map