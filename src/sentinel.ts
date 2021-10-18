declare const sentinelMarker: unique symbol;

/**
 * A unique singleton type
 */
export type Sentinel = Readonly<{
    [sentinelMarker]: true;
}>;

export const sentinel = {} as Sentinel;

export const isSentinel = (value: any): value is Sentinel => {
    return value === sentinel;
};
