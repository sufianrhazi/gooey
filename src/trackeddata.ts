import {
    Collection,
    Subscription,
    ViewSpec,
    FlushKey,
    AddDeferredWorkKey,
    ObserveKey,
    NotifyKey,
    GetSubscriptionNodeKey,
    TypeTag,
    DataTypeTag,
    ModelField,
    TrackedData,
} from './types';
import { collection } from './collection';
import {
    untracked,
    addManualDep,
    removeManualDep,
    addOrderingDep,
    removeOrderingDep,
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
        notify: (event: TEvent) => void;
        observe: (observer: (events: TEvent[]) => void) => () => void;
        makeView: <V>(
            spec: ViewSpec<TData, V, TEvent>,
            viewDebugName?: string | undefined
        ) => Collection<V>;
        subscriptionNode: Subscription;
        processFieldChange: (field: string | symbol) => void;
        processFieldDelete: (field: string | symbol) => void;
    }) => TMethods,
    debugName?: string
): TrackedData<TData & TMethods, TDataTypeTag, TEvent> {
    const fieldRecords: Map<string | number | symbol, ModelField> = new Map();

    let subscriptionEvents: TEvent[] = [];
    let observers: ((events: TEvent[]) => void)[] = [];

    let deferredTasks: (() => void)[] = [];

    const subscriptionNode: Subscription = {
        [TypeTag]: 'subscription',
        [FlushKey]: flushSubscription,
        item: null, // assigned later
    };
    name(subscriptionNode, `${debugName || '?'}:sub`);

    function flushSubscription() {
        const toProcess = subscriptionEvents;
        subscriptionEvents = [];
        if (toProcess.length) {
            observers.forEach((observer) => {
                observer(toProcess);
            });
        }
    }

    function flush() {
        const toProcess = deferredTasks;
        deferredTasks = [];
        toProcess.forEach((task) => {
            task();
        });
    }

    function addDeferredTask(task: () => void) {
        deferredTasks.push(task);
        processChange(proxy);
    }

    function notify(event: TEvent) {
        /*
         * TODO: this is subtly wrong!
         * Subscription events need to be sent to the observers at the time the observers are subscribed.
         *
         * Given the following sequence of events:
         * 1. trackedData instantiated with no observers
         * 2. notify() gets called with event 'E1'
         * 3. observer A starts observing
         * 4. notify() gets called with event 'E2'
         * 5. observer B starts observing
         * 6. notify() gets called with event 'E3'
         * 7. flush() occurs
         *
         * Then the following will be seen:
         * - observer A will get [E2, E3] (correct)
         * - observer B will get [E2, E3] (incorrect!) it should only get [E3]
         */
        if (observers.length > 0) {
            subscriptionEvents.push(event);
            processChange(subscriptionNode);
        }
    }

    function getSubscriptionNode() {
        return subscriptionNode;
    }

    function observe(observer: (events: TEvent[]) => void) {
        if (observers.length === 0) {
            addManualDep(proxy, subscriptionNode);
            fieldRecords.forEach((field) => {
                addOrderingDep(proxy, field);
                addOrderingDep(field, subscriptionNode);
            });
        }
        observers.push(observer);
        return () => {
            observers = observers.filter((obs) => obs !== observer);
            if (observers.length === 0) {
                removeManualDep(proxy, subscriptionNode);
                fieldRecords.forEach((field) => {
                    removeOrderingDep(proxy, field);
                    removeOrderingDep(field, subscriptionNode);
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
        observe((events: TEvent[]) => {
            view[AddDeferredWorkKey](() => {
                events.forEach((event) => {
                    spec.processEvent(view, event, viewArray);
                });
            });
        });
        addManualDep(subscriptionNode, view);
        return view;
    }

    function processFieldChange(key: string | symbol) {
        const field = getField(key);
        processChange(field);
    }

    function processFieldDelete(key: string | symbol) {
        const field = getField(key);
        processChange(field);
    }

    const pseudoPrototype = {
        [TypeTag]: 'data',
        [DataTypeTag]: typeTag,
        [FlushKey]: flush,
        [AddDeferredWorkKey]: addDeferredTask,
        [ObserveKey]: observe,
        [NotifyKey]: notify,
        [GetSubscriptionNodeKey]: getSubscriptionNode,
        ...bindMethods({
            observe,
            notify,
            makeView,
            subscriptionNode,
            processFieldChange,
            processFieldDelete,
        }),
    };

    function getField(key: string | number | symbol): ModelField {
        let field = fieldRecords.get(key);
        if (!field) {
            field = {
                model: proxy as any,
                key,
            };
            if (debugName) name(field, debugName);
            fieldRecords.set(key, field);
            if (observers.length > 0) {
                addOrderingDep(proxy, field);
                addOrderingDep(field, subscriptionNode);
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
                }
                return changed;
            },
        });

    subscriptionNode.item = proxy;

    if (debugName) name(proxy, debugName);

    return proxy;
}
