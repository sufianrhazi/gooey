/**
 * An unchanging, internal sentinel value, used to identify a lack of assignment
 */
export const Sentinel = Symbol('sentinel');
export type Sentinel = typeof Sentinel;
