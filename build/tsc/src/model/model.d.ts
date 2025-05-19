import type { DynamicMut } from '../common/dyn';
import type { Dict } from './dict';
export declare enum ModelEventType {
    SET = "set"
}
export type ModelEvent<T extends {}, K extends keyof T> = {
    type: ModelEventType;
    prop: K;
    value: T[K];
};
export type Model<T extends {}> = T;
export declare function getModelDict<T extends {}>(model: Model<T>): Dict<keyof T, any>;
export declare function isModel(value: unknown): value is Model<object>;
export declare function model<T extends {}>(target: T, debugName?: string): Model<T>;
export declare namespace model {
    var subscribe: <T extends {}, K extends keyof T>(sourceModel: Model<T>, handler: (event: ModelEvent<T, K>[]) => void, debugName?: string) => () => void;
    var field: <T extends {}, K extends keyof T>(sourceModel: Model<T>, field: K) => DynamicMut<T[K]>;
}
//# sourceMappingURL=model.d.ts.map