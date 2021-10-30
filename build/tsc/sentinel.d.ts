declare const sentinelMarker: unique symbol;
/**
 * A unique singleton type
 */
export declare type Sentinel = Readonly<{
    [sentinelMarker]: true;
}>;
export declare const sentinel: Readonly<{
    [sentinelMarker]: true;
}>;
export declare const isSentinel: (value: any) => value is Readonly<{
    [sentinelMarker]: true;
}>;
export {};
//# sourceMappingURL=sentinel.d.ts.map