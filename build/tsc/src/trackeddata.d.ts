import { Collection, Subscription, ViewSpec, TrackedData } from './types';
interface DataImplementation<TEvent> {
    get(notify: (event: TEvent) => void, target: any, key: string | symbol): any;
    has(notify: (event: TEvent) => void, target: any, key: string | symbol): boolean;
    set(notify: (event: TEvent) => void, target: any, key: string | symbol, value: any): boolean;
    deleteProperty(notify: (event: TEvent) => void, target: any, key: string | symbol): boolean;
}
export declare function trackedData<TDataTypeTag, TData extends object, TEvent, TMethods extends object>(initialValue: TData, typeTag: TDataTypeTag, implSpec: DataImplementation<TEvent>, bindMethods: (bindSpec: {
    addDeferredWork: (task: () => void) => void;
    notify: (event: TEvent) => void;
    observe: (observer: (event: TEvent) => void) => () => void;
    makeView: <V>(spec: ViewSpec<TData, V, TEvent>, viewDebugName?: string | undefined) => Collection<V>;
    subscriptionNode: Subscription;
    processFieldChange: (field: string | symbol) => void;
    removeSubscriptionField: (field: string | symbol) => void;
}) => TMethods, debugName?: string): TrackedData<TData & TMethods, TDataTypeTag, TEvent>;
export {};
//# sourceMappingURL=trackeddata.d.ts.map