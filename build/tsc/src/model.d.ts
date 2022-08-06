import { TrackedData } from './trackeddata';
import { SymDebugName, SymRefcount, SymAlive, SymDead } from './symbols';
import { View } from './collection';
declare const ModelPrototype: {
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive]: () => void;
    [SymDead]: () => void;
};
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
export declare type Model<T extends {}> = TrackedData<T, typeof ModelPrototype, ModelEvent, ModelEvent>;
export declare function model<T extends {}>(target: T, debugName?: string): Model<T>;
export declare namespace model {
    var subscribe: <T extends {}>(sourceModel: Model<T>, handler: (event: ModelEvent[]) => void, debugName?: string | undefined) => () => void;
    var keys: <T extends {}>(sourceModel: Model<T>, debugName?: string | undefined) => View<string, ModelEvent>;
}
export {};
//# sourceMappingURL=model.d.ts.map