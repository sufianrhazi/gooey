/**
 * A ref object that can be passed to native elements.
 */
export class RefObject<T> {
    current: T | undefined;
    constructor(current?: T | undefined) {
        this.current = current;
    }
}

/**
 * Make a ref object that can be passed to native elements.
 */
export function ref<T>(val?: T): Ref<T> {
    return new RefObject(val);
}

/**
 * A standard ref callback
 */
export type RefCallback<T> = (val: T | undefined) => void;

/**
 * Ref types may be passed as the ref prop to intrinsic elements to obtain a
 * reference to the underlying Element
 */
export type Ref<T> = RefObject<T> | RefCallback<T>;
