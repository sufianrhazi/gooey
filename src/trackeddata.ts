import {
    Collection,
    SubscriptionConsumer,
    SubscriptionEmitter,
    ViewSpec,
    FlushKey,
    AddSubscriptionConsumerWorkKey,
    ObserveKey,
    NotifyKey,
    GetSubscriptionConsumerKey,
    GetSubscriptionEmitterKey,
    TypeTag,
    DataTypeTag,
    ModelField,
    TrackedData,
    DisposeKey,
} from './types';
import { makeCollectionInner } from './collection';
import {
    untracked,
    addManualDep,
    removeManualDep,
    addOrderingDep,
    removeOrderingDep,
    addDepToCurrentCalculation,
    markDirty,
    registerNode,
    disposeNode,
    nextFlush,
    retain,
    release,
} from './calc';
import { uniqueid } from './util';
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
        subscriptionEmitter: SubscriptionEmitter;
        processFieldChange: (field: string | symbol) => void;
        processFieldDelete: (field: string | symbol) => void;
    }) => TMethods,
    derivedSubscriptionEmitter: null | SubscriptionEmitter,
    debugName?: string
): TrackedData<TDataTypeTag, TEvent> & TData & TMethods {
    type Observer = (events: TEvent[]) => void;

    const fieldRecords: Map<string | number | symbol, ModelField> = new Map();

    let subscriptionEvents: Map<Observer, TEvent[]> = new Map();
    let observers: Observer[] = [];
    let isDisposed = false;

    let deferredTasks: (() => void)[] = [];

    // How memory management should work for trackedData
    // - The trackedData's memory "root" is the subscription emitter
    // - The subscription emitter owns/retains all of the fields
    // - If the trackedData is derived, the subscription emitter owns the subscription consumer (weird, but ok)
    // - If the trackedData is derived, the subscription consumer owns the subscription emitter it is derived from (needs to be passed in instead of isDerived)
    const subscriptionEmitter: SubscriptionEmitter = {
        $__id: uniqueid(),
        [TypeTag]: 'subscriptionEmitter',
        [FlushKey]: flushSubscriptionEmitter,
        item: null, // assigned later
    };
    name(subscriptionEmitter, `${debugName ?? 'trackeddata'}:emitter`);
    registerNode(subscriptionEmitter); // TODO: is this right? Shouldn't it be added on retain?

    let subscriptionConsumer: SubscriptionConsumer | null = null;
    if (derivedSubscriptionEmitter) {
        subscriptionConsumer = {
            $__id: uniqueid(),
            [TypeTag]: 'subscriptionConsumer',
            [FlushKey]: flushSubscriptionConsumer,
            item: null, // assigned later
        };
        name(subscriptionConsumer, `${debugName ?? 'trackeddata'}:consumer`);
        retain(subscriptionConsumer, subscriptionEmitter);
        retain(derivedSubscriptionEmitter, subscriptionConsumer);
        addManualDep(derivedSubscriptionEmitter, subscriptionConsumer);
        addOrderingDep(subscriptionConsumer, subscriptionEmitter);
    }

    function flushSubscriptionEmitter() {
        log.assert(!isDisposed, 'data already disposed');
        let processed = false;
        const toProcess = subscriptionEvents;
        subscriptionEvents = new Map();
        toProcess.forEach((events, observer) => {
            processed = true;
            observer(events);
        });
        return processed;
    }

    function flushSubscriptionConsumer() {
        log.assert(!isDisposed, 'data already disposed');
        const toProcess = deferredTasks;
        let processed = false;
        deferredTasks = [];
        toProcess.forEach((task) => {
            processed = true;
            task();
        });
        return processed;
    }

    function addSubscriptionConsumerWork(task: () => void) {
        log.assert(!isDisposed, 'data already disposed');
        log.assert(
            subscriptionConsumer,
            'cannot add subscription consumer work to non-derived trackeddata'
        );
        deferredTasks.push(task);
        markDirty(subscriptionConsumer);
    }

    function notify(event: TEvent) {
        log.assert(!isDisposed, 'data already disposed');
        if (observers.length > 0) {
            observers.forEach((observer) => {
                let observerEvents = subscriptionEvents.get(observer);
                if (!observerEvents) {
                    observerEvents = [];
                    subscriptionEvents.set(observer, observerEvents);
                }
                observerEvents.push(event);
            });
            markDirty(subscriptionEmitter);
        }
    }

    function getSubscriptionConsumer() {
        log.assert(!isDisposed, 'data already disposed');
        return subscriptionConsumer;
    }

    function getSubscriptionEmitter() {
        log.assert(!isDisposed, 'data already disposed');
        return subscriptionEmitter;
    }

    function observe(observer: (events: TEvent[]) => void) {
        log.assert(!isDisposed, 'data already disposed');
        if (observers.length === 0) {
            fieldRecords.forEach((field) => {
                addOrderingDep(field, subscriptionEmitter);
            });
        }
        observers.push(observer);
        return () => {
            observers = observers.filter((obs) => obs !== observer);
            if (observers.length === 0) {
                fieldRecords.forEach((field) => {
                    removeOrderingDep(field, subscriptionEmitter);
                });
            }
        };
    }

    function makeView<V>(
        spec: ViewSpec<TData, V, TEvent>,
        viewDebugName?: string | undefined
    ) {
        log.assert(!isDisposed, 'data already disposed');
        const viewArray: V[] = untracked(() => spec.initialize(initialValue));
        const view = makeCollectionInner(
            viewArray,
            subscriptionEmitter,
            viewDebugName
        );
        observe((events: TEvent[]) => {
            view[AddSubscriptionConsumerWorkKey](() => {
                events.forEach((event) => {
                    spec.processEvent(view, event, viewArray);
                });
            });
        });
        return view;
    }

    function processFieldChange(key: string | symbol) {
        log.assert(!isDisposed, 'data already disposed');
        const field = getField(key);
        markDirty(field);
    }

    function processFieldDelete(key: string | symbol) {
        log.assert(!isDisposed, 'data already disposed');
        const field = getField(key);
        markDirty(field);
    }

    function onSubscriptionEmitterDisposed() {
        log.assert(!isDisposed, 'data already disposed');
        // Delete and clean everything up
        fieldRecords.forEach((field) => {
            if (subscriptionConsumer) {
                removeOrderingDep(subscriptionConsumer, field);
            }
            if (observers.length > 0) {
                removeOrderingDep(field, subscriptionEmitter);
            }
            disposeNode(field);
        });
        fieldRecords.clear();

        if (derivedSubscriptionEmitter && subscriptionConsumer) {
            removeManualDep(derivedSubscriptionEmitter, subscriptionConsumer);
            removeOrderingDep(subscriptionConsumer, subscriptionEmitter);
            release(derivedSubscriptionEmitter);
            release(subscriptionConsumer);
        }

        observers.splice(0, observers.length);
        subscriptionEvents.clear();
        deferredTasks.splice(0, deferredTasks.length);
        // TODO: Is there a better way to say "after the subscription emitter is actually released, revoke this thing?"
        nextFlush().then(() => {
            revokableProxy.revoke();
        });
        isDisposed = true;
    }

    const pseudoPrototype = {
        $__id: uniqueid(),
        [TypeTag]: 'data',
        [DataTypeTag]: typeTag,
        [AddSubscriptionConsumerWorkKey]: addSubscriptionConsumerWork,
        [ObserveKey]: observe,
        [NotifyKey]: notify,
        [GetSubscriptionConsumerKey]: getSubscriptionConsumer,
        [GetSubscriptionEmitterKey]: getSubscriptionEmitter,
        [DisposeKey]: onSubscriptionEmitterDisposed,
        ...bindMethods({
            observe,
            notify,
            makeView,
            subscriptionEmitter,
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
                $__id: uniqueid(),
            };
            if (debugName) name(field, debugName);
            fieldRecords.set(key, field);
            registerNode(field);
            if (subscriptionConsumer) {
                addOrderingDep(subscriptionConsumer, field);
            }
            addOrderingDep(field, subscriptionEmitter);
            retain(field, subscriptionEmitter);
        }
        return field;
    }

    const revokableProxy = Proxy.revocable(initialValue, {
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
                markDirty(field);
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
                markDirty(field); // Anything depending on this value will need to be recalculated
            }
            return changed;
        },
    });
    const proxy: TrackedData<TDataTypeTag, TEvent> & TData & TMethods =
        revokableProxy.proxy;

    name(proxy, `${debugName ?? 'trackeddata'}`);

    subscriptionEmitter.item = proxy;
    if (subscriptionConsumer) {
        subscriptionConsumer.item = proxy;
    }

    return proxy;
}
