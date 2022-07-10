/**
 * A ref object that can be passed to native elements.
 */
export declare class RefObject<T> {
    current: T | undefined;
    constructor(current?: T | undefined);
}
/**
 * Make a ref object that can be passed to native elements.
 */
export declare function ref<T>(val?: T): RefObject<T>;
/**
 * A standard ref callback
 */
export declare type RefCallback<T> = (val: T | undefined) => void;
/**
 * Ref types may be passed as the ref prop to intrinsic elements to obtain a
 * reference to the underlying Element
 */
export declare type Ref<T> = RefObject<T> | RefCallback<T>;
//# sourceMappingURL=ref.d.ts.map