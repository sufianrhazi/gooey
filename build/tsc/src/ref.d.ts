/**
 * A ref object that can be passed to native elements.
 */
export declare class Ref<T> {
    current: T | undefined;
    constructor(current?: T | undefined);
}
/**
 * Make a ref object that can be passed to native elements.
 */
export declare function ref<T>(val?: T): Ref<T>;
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