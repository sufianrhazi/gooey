import {
    AddDeferredWorkKey,
    FlushKey,
    InvariantError,
    MakeModelViewKey,
    ModelViewSpec,
    Model,
    ModelEvent,
    ModelField,
    ModelObserver,
    ObserveKey,
    Subscription,
    TypeTag,
    View,
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

export function model<T extends {}>(obj: T, debugName?: string): Model<T> {
    if (typeof obj !== 'object' || !obj) {
        throw new InvariantError('model must be provided an object');
    }

    const fields: Map<string | number | symbol, ModelField<T>> = new Map();
    let observers: ModelObserver[] = [];
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

    function notify(event: ModelEvent) {
        observers.forEach((observer) => {
            observer(event);
        });
    }

    function getField(key: string | number | symbol): ModelField<T> {
        let field = fields.get(key);
        if (!field) {
            field = {
                model: proxy,
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

    const knownFields: Set<string | number | symbol> = new Set(
        Object.keys(obj)
    );

    function observe(observer: ModelObserver) {
        if (observers.length === 0) {
            // Initialize the subscription node so events are ordered correctly
            fields.forEach((field) => {
                addManualDep(field, subscriptionNode);
            });
        }
        addManualDep(proxy, subscriptionNode);
        observers.push(observer);
        retain(subscriptionNode);
        return () => {
            observers = observers.filter((obs) => obs !== observer);
            release(subscriptionNode);
        };
    }

    function makeModelView<V>(
        spec: ModelViewSpec<T, V>,
        viewDebugName?: string | undefined
    ) {
        const viewArray: V[] = [];
        untracked(() => {
            spec.initialize(viewArray, obj);
        });
        const view = collection(viewArray, viewDebugName);
        observe((event: ModelEvent) => {
            view[AddDeferredWorkKey](() => spec.processEvent(view, event));
        });
        addManualDep(subscriptionNode, view);
        return view;
    }

    const methods = {
        [ObserveKey]: observe,
        [FlushKey]: flush,
        [AddDeferredWorkKey]: addDeferredWork,
        [MakeModelViewKey]: makeModelView,
    };

    const proxy = new Proxy(obj, {
        get(target: any, key: string | symbol) {
            if (key === TypeTag) {
                return 'model';
            }
            if (key in methods) {
                return (methods as any)[key];
            }
            const field = getField(key);
            addDepToCurrentCalculation(field);
            return target[key];
        },

        has(target: any, key: string | symbol) {
            if (key === TypeTag) {
                return true;
            }
            if (key in methods) {
                return true;
            }
            const field = getField(key);
            addDepToCurrentCalculation(field);
            return knownFields.has(key);
        },

        set(target: any, key: string | number | symbol, value: any) {
            const field = getField(key);
            const changed = !knownFields.has(key) || target[key] !== value;
            target[key] = value;
            if (changed) {
                processChange(field);
                if (!knownFields.has(key)) {
                    knownFields.add(key);
                    notify({ type: 'add', key });
                }
                notify({ type: 'set', key, value });
            }
            return true;
        },

        deleteProperty(target: any, key: string | number | symbol) {
            const field = getField(key);
            const changed = knownFields.has(key);
            if (changed) {
                processChange(field);
                knownFields.delete(key);
                notify({ type: 'delete', key });
            }
            delete target[key];
            removeManualDep(field, subscriptionNode);
            return true;
        },
    }) as Model<T>;

    if (debugName) name(proxy, debugName);

    return proxy;
}
model.keys = function keys<T>(
    target: Model<T>,
    debugName?: string
): View<string> {
    const keysSet = new Set<string>();

    const view = target[MakeModelViewKey]<string>(
        {
            initialize: (array, obj) => {
                const keys = Object.keys(obj);
                array.push(...keys);
                keys.forEach((key) => keysSet.add(key));
            },
            processEvent: (modelView, event) => {
                if (event.type === 'add') {
                    const { key } = event;
                    if (typeof key === 'number' || typeof key === 'string') {
                        const stringKey = key.toString();
                        if (!keysSet.has(stringKey)) {
                            keysSet.add(stringKey);
                            modelView.push(stringKey);
                        }
                    }
                } else if (event.type === 'delete') {
                    const { key } = event;
                    if (typeof key === 'number' || typeof key === 'string') {
                        const stringKey = key.toString();
                        if (keysSet.has(stringKey)) {
                            keysSet.delete(stringKey);
                            modelView.reject((k) => k === stringKey);
                        }
                    }
                }
            },
        },
        debugName
    );

    return view;
};
