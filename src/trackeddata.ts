import {
    Collection,
    Subscription,
    ViewSpec,
    AddDeferredWorkKey,
    FlushKey,
    ObserveKey,
    TypeTag,
    DataTypeTag,
    ModelField,
    TrackedData,
} from './types';
import { collection } from './collection';
import {
    untracked,
    retain,
    release,
    addManualDep,
    removeManualDep,
    addDepToCurrentCalculation,
    processChange,
} from './calc';
import { name } from './debug';
import * as log from './log';

interface DataImplementation<TEvent> {
    get(
        notify: (event: TEvent) => void,
        target: any,
        key: string | symbol
    ): any;

    has(
        notify: (event: TEvent) => void,
        target: any,
        key: string | symbol
    ): boolean;

    set(
        notify: (event: TEvent) => void,
        target: any,
        key: string | symbol,
        value: any
    ): boolean;

    deleteProperty(
        notify: (event: TEvent) => void,
        target: any,
        key: string | symbol
    ): boolean;
}

export function trackedData<
    TDataTypeTag,
    TData extends object,
    TEvent,
    TMethods extends object
>(
    initialValue: TData,
    typeTag: TDataTypeTag,
    implSpec: DataImplementation<TEvent>,
    bindMethods: (bindSpec: {
        addDeferredWork: (task: () => void) => void;
        notify: (event: TEvent) => void;
        observe: (observer: (event: TEvent) => void) => () => void;
        makeView: <V>(
            spec: ViewSpec<TData, V, TEvent>,
            viewDebugName?: string | undefined
        ) => Collection<V>;
        subscriptionNode: Subscription;
        processFieldChange: (field: string | symbol) => void;
        removeSubscriptionField: (field: string | symbol) => void;
    }) => TMethods,
    debugName?: string
): TrackedData<TData & TMethods, TDataTypeTag, TEvent> {
    const fields: Map<string | number | symbol, ModelField> = new Map();

    let observers: ((event: TEvent) => void)[] = [];

    let deferredTasks: (() => void)[] = [];

    const subscriptionNode: Subscription = {
        [TypeTag]: 'subscription',
    };
    name(subscriptionNode, `${debugName || '?'}:sub`);

    function addDeferredWork(task: () => void) {
        deferredTasks.push(task);
        processChange(proxy);
    }

    function flush() {
        const toProcess = deferredTasks;
        deferredTasks = [];
        toProcess.forEach((task) => {
            task();
        });
    }

    function notify(event: TEvent) {
        observers.forEach((observer) => {
            observer(event);
        });
    }

    function observe(observer: (event: TEvent) => void) {
        if (observers.length === 0) {
            // Initialize the subscription node so events are ordered correctly
            fields.forEach((field) => {
                addManualDep(field, subscriptionNode);
            });
        }
        observers.push(observer);
        retain(subscriptionNode);
        return () => {
            observers = observers.filter((obs) => obs !== observer);
            release(subscriptionNode);
            if (observers.length === 0) {
                // Deinitialize the subscription node so events are ordered correctly
                fields.forEach((field) => {
                    removeManualDep(field, subscriptionNode);
                });
            }
        };
    }

    function makeView<V>(
        spec: ViewSpec<TData, V, TEvent>,
        viewDebugName?: string | undefined
    ) {
        const viewArray: V[] = untracked(() => spec.initialize(initialValue));
        const view = collection(viewArray, viewDebugName);
        observe((event: TEvent) => {
            view[AddDeferredWorkKey](() => spec.processEvent(view, event));
        });
        addManualDep(proxy, view);
        addManualDep(subscriptionNode, view);
        return view;
    }

    function processFieldChange(key: string | symbol) {
        const field = getField(key);
        processChange(field);
    }

    function removeSubscriptionField(key: string | symbol) {
        if (observers.length > 0) {
            const field = getField(key);
            removeManualDep(field, subscriptionNode);
        }
    }

    const pseudoPrototype = {
        [TypeTag]: 'data',
        [DataTypeTag]: typeTag,
        [FlushKey]: flush,
        [AddDeferredWorkKey]: addDeferredWork,
        [ObserveKey]: observe,
        ...bindMethods({
            addDeferredWork,
            notify,
            observe,
            makeView,
            subscriptionNode,
            processFieldChange,
            removeSubscriptionField,
        }),
    };

    function getField(key: string | number | symbol) {
        let field: ModelField | undefined = fields.get(key);
        if (!field) {
            field = {
                model: proxy as any,
                key,
            };
            if (debugName) name(field, debugName);
            fields.set(key, field);
            addManualDep(proxy, field);
            if (observers.length > 0) {
                addManualDep(field, subscriptionNode);
            }
        }
        return field;
    }

    const proxy: TrackedData<TData & TMethods, TDataTypeTag, TEvent> =
        new Proxy(initialValue, {
            get(target: any, key: string | symbol) {
                if (key in pseudoPrototype) {
                    return (pseudoPrototype as any)[key];
                }
                const field = getField(key);
                addDepToCurrentCalculation(field);
                return implSpec.get.call(proxy, notify, target, key);
            },

            has(target: any, key: string | symbol) {
                if (key in pseudoPrototype) {
                    return true;
                }
                const field = getField(key);
                addDepToCurrentCalculation(field);
                return implSpec.has.call(proxy, notify, target, key);
            },

            set(target: any, key: string | symbol, value: any) {
                if (key in pseudoPrototype) {
                    log.error(`Overriding ${String(key)} not supported`, key);
                    return false;
                }
                const changed = implSpec.set.call(
                    proxy,
                    notify,
                    target,
                    key,
                    value
                );
                if (changed) {
                    const field = getField(key);
                    processChange(field);
                }
                return changed;
            },

            deleteProperty(target: any, key: string | symbol) {
                if (key in pseudoPrototype) {
                    log.error(`Deleting ${String(key)} not supported`, key);
                    return false;
                }
                const changed = implSpec.deleteProperty.call(
                    proxy,
                    notify,
                    target,
                    key
                );
                if (changed) {
                    const field = getField(key);
                    processChange(field); // Anything depending on this value will need to be recalculated
                    if (observers.length > 0) {
                        removeManualDep(field, subscriptionNode);
                    }
                }
                return changed;
            },
        });

    if (debugName) name(proxy, debugName);

    return proxy;
}
