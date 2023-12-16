/**
 * A ref object that can be passed to native elements.
 */
export declare class Ref<in out T> {
    current: T;
    constructor(current: T);
}
/**
 * Make a ref object that can be passed to native elements.
 */
export declare function ref<T>(val: T): Ref<T>;
export declare function ref<T>(val?: T): Ref<T | undefined>;
/**
 * A standard ref callback
 */
export type RefCallback<T> = (val: T | undefined) => void;
/**
 * Ref types may be passed as the ref prop to intrinsic elements to obtain a
 * reference to the underlying Element
 */
export type RefObjectOrCallback<T> = Ref<T> | RefCallback<T>;
//# sourceMappingURL=ref.d.ts.map