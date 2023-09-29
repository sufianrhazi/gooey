import { Field } from './field';
import { Calculation } from './calc';
export type Dyn<T> = T | Field<T> | Calculation<T>;
export declare function dynGet<T>(wrapper: Dyn<T>): T;
export declare function dynSet<T>(wrapper: Dyn<T>, value: T): boolean;
export declare function dynSubscribe<T>(wrapper: Dyn<T>, callback: (val: T) => void): () => void;
//# sourceMappingURL=dyn.d.ts.map