import { Model, View } from './types';
export declare function model<T extends {}>(obj: T, debugName?: string): Model<T>;
export declare namespace model {
    var keys: <T>(target: Model<T>, debugName?: string | undefined) => View<keyof T>;
}
//# sourceMappingURL=model.d.ts.map