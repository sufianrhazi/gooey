/**
 * A ref object that can be passed to native elements.
 */
export class Ref<in out T> {
    declare current: T;
    constructor(current: T) {
        this.current = current;
    }
}

/**
 * Make a ref object that can be passed to native elements.
 */
export function ref<T>(val: T): Ref<T>;
export function ref<T>(val?: T): Ref<T | undefined>;
export function ref<T>(val?: T): Ref<T | undefined> {
    return new Ref(val);
}

/**
 * A standard ref callback
 */
export type RefCallback<T> = (val: T | undefined) => void;

/**
 * Ref types may be passed as the ref prop to intrinsic elements to obtain a
 * reference to the underlying Element
 */
export type RefObjectOrCallback<T> = Ref<T> | RefCallback<T>;
