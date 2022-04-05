import { Collection } from './types';
/**
 * Make a mutable array to hold state, with some additional convenience methods
 */
export declare function collection<T>(array: T[], debugName?: string): Collection<T>;
export declare namespace collection {
    var dispose: (c: Collection<any>) => void;
}
//# sourceMappingURL=collection.d.ts.map