import { applyMove, applySort } from './arrayevent';

export class SumArray {
    bucketBits: number;
    bucketSize: number;
    slots: number[];
    buckets: number[];

    constructor(bucketBits: number, items: number[]) {
        this.bucketBits = bucketBits;
        this.bucketSize = 1 << bucketBits;
        this.slots = items;
        this.buckets = this.recreate(this.slots);
    }

    private recreate(items: number[]) {
        const buckets: number[] = [];
        for (let i = 0; i < items.length; i += this.bucketSize) {
            let bucket = 0;
            for (let j = 0; j < this.bucketSize && i + j < items.length; ++j) {
                bucket += items[i + j];
            }
            buckets.push(bucket);
        }
        return buckets;
    }

    private updateBuckets(from: number, to: number) {
        const startBucket = from >> this.bucketBits;
        const endBucket = to >> this.bucketBits;

        // If the array has grown, we may need to resize the buckets
        for (let i = this.buckets.length; i < endBucket; ++i) {
            this.buckets.push(0);
        }

        for (let i = startBucket; i <= endBucket; ++i) {
            let bucket = 0;
            const shift = i << this.bucketBits;
            for (
                let j = 0;
                j < this.bucketSize && shift + j < this.slots.length;
                ++j
            ) {
                bucket += this.slots[shift + j];
            }
            this.buckets[i] = bucket;
        }
    }

    splice(index: number, count: number, items: number[]) {
        this.slots.splice(index, count, ...items);
        this.updateBuckets(
            index,
            count === items.length ? index + count : this.slots.length
        );
        if (count - items.length > 0) {
            // If the array has shrunk, we may need to resize the buckets
            const bucketSize = this.slots.length >> this.bucketBits;
            if (this.buckets.length > bucketSize) {
                this.buckets.length = bucketSize;
            }
        }
    }

    move(fromIndex: number, count: number, toIndex: number) {
        applyMove(this.slots, fromIndex, count, toIndex);
        this.updateBuckets(
            Math.min(fromIndex, toIndex),
            Math.max(fromIndex, toIndex) + count
        );
    }

    sort(fromIndex: number, indices: number[]) {
        applySort(this.slots, fromIndex, indices);
        this.updateBuckets(fromIndex, fromIndex + indices.length);
    }

    getSum(index: number) {
        if (index === 0) {
            return 0;
        }
        let sum = 0;
        for (
            let bucketIndex = 0, i = this.bucketSize;
            bucketIndex < this.buckets.length && i <= index;
            ++bucketIndex, i += this.bucketSize
        ) {
            sum += this.buckets[bucketIndex];
        }
        const start = index & ~(this.bucketSize - 1);
        for (let j = start; j < index && j < this.slots.length; ++j) {
            sum += this.slots[j];
        }
        return sum;
    }

    get(index: number) {
        return this.slots[index];
    }

    set(index: number, value: number) {
        const diff = value - this.slots[index];
        this.slots[index] = value;
        const bucketIndex = index >> this.bucketBits;
        this.buckets[bucketIndex] += diff;
    }
}
