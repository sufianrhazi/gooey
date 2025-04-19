// Dirtiness tracking for dictionaries (exact keys)
import { RangeAssociation } from './rangeassociation';

export class DirtyArray {
    private declare rangeAssociation: RangeAssociation<number>;
    private declare dirtyLength: number | null;
    private declare clock: number;

    constructor() {
        this.rangeAssociation = new RangeAssociation<number>();
        this.dirtyLength = null;
        this.clock = 0;
    }

    markDirty(key: 'length' | { start: number; end: number }) {
        if (key === 'length') {
            if (this.dirtyLength === null) {
                this.dirtyLength = this.clock;
            }
            return;
        }
        this.rangeAssociation.setAssociation(key.start, key.end, this.clock);
    }

    tickClock() {
        this.clock += 1;
    }

    clear() {
        this.dirtyLength = null;
        this.rangeAssociation.clear();
    }

    resetClock() {
        this.clock = 0;
    }

    getClock() {
        return this.clock;
    }

    get(key: 'length' | number) {
        if (key === 'length') {
            return this.dirtyLength;
        }
        return this.rangeAssociation.getAssociation(key);
    }
}
