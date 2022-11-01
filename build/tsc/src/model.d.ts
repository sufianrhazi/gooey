import { View } from './collection';
export declare enum ModelEventType {
    ADD = "add",
    SET = "set",
    DEL = "del"
}
export declare type ModelEvent = {
    type: ModelEventType.ADD;
    prop: string;
    value: any;
} | {
    type: ModelEventType.SET;
    prop: string;
    value: any;
} | {
    type: ModelEventType.DEL;
    prop: string;
    value?: undefined;
};
export declare type Model<T extends {}> = T;
export declare function model<T extends {}>(target: T, debugName?: string): Model<T>;
export declare namespace model {
    var subscribe: <T extends {}>(sourceModel: T, handler: (event: ModelEvent[]) => void, debugName?: string | undefined) => () => void;
    var keys: <T extends {}>(sourceModel: T, debugName?: string | undefined) => View<string, ModelEvent>;
}
//# sourceMappingURL=model.d.ts.map