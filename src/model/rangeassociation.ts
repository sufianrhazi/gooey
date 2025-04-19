type Interval<T> = {
    start: number;
    end: number;
    value: T;
};

export class RangeAssociation<T> {
    private intervals: Interval<T>[] = [];

    setAssociation(start: number, end: number, value: T): void {
        if (start >= end) return;

        const result: Interval<T>[] = [];

        // Find left boundary (first interval whose end > start)
        const left = this.findFirstOverlap(start);
        let i = left;

        // Skip overlapping intervals, building up new ones if needed
        while (i < this.intervals.length && this.intervals[i].start < end) {
            const current = this.intervals[i];

            // Add gaps before current
            if (start < current.start) {
                result.push({
                    start,
                    end: Math.min(current.start, end),
                    value,
                });
            }

            // Skip overlapping part
            start = Math.max(start, current.end);
            result.push(current);
            i++;
        }

        // Add tail if any remaining uncovered part
        if (start < end) {
            result.push({ start, end, value });
        }

        // Replace in-place: splice out [left, i), insert result
        this.intervals.splice(left, i - left, ...result);
    }

    getAssociation(index: number): T | null {
        if (isNaN(index)) {
            return null;
        }
        if (this.intervals.length === 0) {
            return null;
        }
        if (index < 0) {
            return null;
        }
        const highestIndex = this.intervals[this.intervals.length - 1];
        if (index >= highestIndex.end) {
            return null;
        }
        let lo = 0,
            hi = this.intervals.length - 1;

        while (lo <= hi) {
            const mid = (lo + hi) >>> 1;
            const { start, end, value } = this.intervals[mid];
            if (index < start) hi = mid - 1;
            else if (index >= end) lo = mid + 1;
            else return value;
        }

        return null;
    }

    private findFirstOverlap(pos: number): number {
        // Binary search: first interval whose `end > pos`
        let lo = 0,
            hi = this.intervals.length;

        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (this.intervals[mid].end <= pos) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }

        return lo;
    }

    clear() {
        console.log('CLEAR how big', this.intervals.length);
        this.intervals = [];
    }
}
