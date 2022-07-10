import { TrackedData } from './trackeddata';
import { SymDebugName, SymRefcount, SymAlive, SymDead } from './engine';
import { View } from './collection';
declare const ModelPrototype: {
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive]: () => void;
    [SymDead]: () => void;
};
export declare enum ModelEventType {
    ADD = 0,
    SET = 1,
    DEL = 2
}
declare type ModelEvent = {
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
};
export declare type Model<T extends {}> = TrackedData<T, typeof ModelPrototype, ModelEvent, ModelEvent>;
export declare function model<T extends {}>(target: T, debugName?: string): Model<T>;
export declare namespace model {
    var keys: <T extends {}>(sourceModel: Model<T>, debugName?: string | undefined) => View<string, ModelEvent>;
}
export {};
//# sourceMappingURL=model.d.ts.map