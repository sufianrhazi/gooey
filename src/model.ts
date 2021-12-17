import {
    Collection,
    FlushKey,
    InvariantError,
    Model,
    ModelEvent,
    ModelField,
    ModelObserver,
    ObserveKey,
    TypeTag,
    View,
} from './types';
import { collection } from './collection';
import {
    untracked,
    addManualDep,
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
    let events: ModelEvent[] = [];

    function flush() {
        const toProcess = events;
        events = [];
        toProcess.forEach((event) => {
            observers.forEach((observer) => {
                observer(event);
            });
        });
    }

    function notify(event: ModelEvent) {
        events.push(event);
        processChange(proxy);
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
        }
        return field;
    }

    const knownFields: Set<string | number | symbol> = new Set(
        Object.keys(obj)
    );

    function observe(observer: ModelObserver) {
        observers.push(observer);
        return () => {
            observers = observers.filter((obs) => obs !== observer);
        };
    }

    const methods = {
        [ObserveKey]: observe,
        [FlushKey]: flush,
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
            return true;
        },
    }) as Model<T>;

    if (debugName) name(proxy, debugName);

    return proxy;
}
model.keys = function keys<T>(
    target: Model<T>,
    debugName?: string
): View<keyof T> {
    const initialKeys = untracked(() => {
        return Object.keys(target);
    });
    const view: Collection<keyof T> = collection(
        initialKeys as (keyof T)[],
        debugName
    );

    const keysSet = new Set<string>(initialKeys);

    function addKey(key: string | number | symbol) {
        if (typeof key === 'number' || typeof key === 'string') {
            const stringKey = key.toString();
            if (!keysSet.has(stringKey)) {
                keysSet.add(stringKey);
                view.push(stringKey as keyof T);
            }
        }
    }

    function delKey(key: string | number | symbol) {
        if (typeof key === 'number' || typeof key === 'string') {
            const stringKey = key.toString();
            if (keysSet.has(stringKey)) {
                keysSet.delete(stringKey);
                view.reject((k) => k === stringKey);
            }
        }
    }

    target[ObserveKey]((event) => {
        if (event.type === 'add') {
            untracked(() => {
                addKey(event.key);
            });
        } else if (event.type === 'delete') {
            untracked(() => {
                delKey(event.key);
            });
        }
    });

    addManualDep(target, view);

    return view;
};
