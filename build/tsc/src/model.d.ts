import { Field } from './field';
export declare enum ModelEventType {
    SET = "set"
}
export type ModelEvent = {
    type: ModelEventType.SET;
    prop: string;
    value: any;
};
export type Model<T extends {}> = T;
export declare function addModelEvent(events: ModelEvent[], event: ModelEvent): void;
export declare function model<T extends {}>(target: T, debugName?: string): Model<T>;
export declare namespace model {
    var subscribe: <T extends {}>(sourceModel: T, handler: (event: ModelEvent[]) => void, debugName?: string | undefined) => () => void;
    var field: <T extends {}, K extends keyof T>(sourceModel: T, field: K) => Field<T[K]> | undefined;
}
//# sourceMappingURL=model.d.ts.map