import {
    InvariantError,
    TypeTag,
    Model,
    ModelEvent,
    ModelObserver,
    Collection,
    ModelField,
    ObserveKey,
} from './types';
import { collection } from './collection';
import { addDepToCurrentCalculation, processChange } from './calc';

const ownKeysField = Symbol('ownKeys');

export function model<T extends {}>(obj: T): Model<T> {
    if (typeof obj !== 'object' || !obj) {
        throw new InvariantError('model must be provided an object');
    }

    const fields: Map<string | number | symbol, ModelField<T>> = new Map();
    let observers: ModelObserver[] = [];

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
            fields.set(key, field);
        }
        return field;
    }

    const knownFields: Set<string | number | symbol> = new Set(
        Object.keys(obj)
    );

    function observe(observer: ModelObserver) {
        observers.push(observer);
        observer({
            type: 'init',
            keys: Object.keys(obj),
        });
        return () => {
            observers = observers.filter((obs) => obs !== observer);
        };
    }

    const methods = {
        [ObserveKey]: observe,
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
                    if (typeof key !== 'symbol') {
                        processChange(getField(ownKeysField));
                    }
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
                if (typeof key !== 'symbol') {
                    processChange(getField(ownKeysField));
                }
                notify({ type: 'delete', key });
            }
            delete target[key];
            return true;
        },

        ownKeys(target: any) {
            const field = getField(ownKeysField);
            addDepToCurrentCalculation(field);
            return Reflect.ownKeys(target);
        },
    }) as Model<T>;

    return proxy;
}
model.keys = function keys<T>(target: Model<T>): Readonly<Collection<string>> {
    const view: Collection<string> = collection([]);

    const keysSet = new Set<string>();

    function addKey(key: string | number | symbol) {
        if (typeof key === 'number' || typeof key === 'string') {
            const stringKey = key.toString();
            if (!keysSet.has(stringKey)) {
                keysSet.add(stringKey);
                view.push(stringKey);
            }
        }
    }

    function delKey(key: string | number | symbol) {
        if (typeof key === 'number' || typeof key === 'string') {
            const stringKey = key.toString();
            if (keysSet.has(stringKey)) {
                keysSet.delete(stringKey);
                view.reject((k) => k !== stringKey);
            }
        }
    }

    target[ObserveKey]((event) => {
        if (event.type === 'init') {
            event.keys.forEach((key) => {
                addKey(key);
            });
        }
        if (event.type === 'add') {
            addKey(event.key);
        }
        if (event.type === 'delete') {
            delKey(event.key);
        }
    });

    return view;
};
