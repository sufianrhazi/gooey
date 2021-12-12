import { InvariantError, TypeTag, OwnKeysField, ObserveKey, } from './types';
import { collection } from './collection';
import { effect, untracked, addManualDep, addDepToCurrentCalculation, processChange, } from './calc';
import { name } from './debug';
export function model(obj, debugName) {
    if (typeof obj !== 'object' || !obj) {
        throw new InvariantError('model must be provided an object');
    }
    const fields = new Map();
    let observers = [];
    function notify(event) {
        observers.forEach((observer) => {
            observer(event);
        });
    }
    function getField(key) {
        let field = fields.get(key);
        if (!field) {
            field = {
                model: proxy,
                key,
            };
            if (debugName)
                name(field, debugName);
            fields.set(key, field);
        }
        return field;
    }
    const knownFields = new Set(Object.keys(obj));
    function observe(observer) {
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
        get(target, key) {
            if (key === TypeTag) {
                return 'model';
            }
            if (key in methods) {
                return methods[key];
            }
            const field = getField(key);
            addDepToCurrentCalculation(field);
            return target[key];
        },
        has(target, key) {
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
        set(target, key, value) {
            const field = getField(key);
            const changed = !knownFields.has(key) || target[key] !== value;
            target[key] = value;
            if (changed) {
                processChange(field);
                if (!knownFields.has(key)) {
                    knownFields.add(key);
                    notify({ type: 'add', key });
                    if (typeof key !== 'symbol') {
                        processChange(getField(OwnKeysField));
                    }
                }
                notify({ type: 'set', key, value });
            }
            return true;
        },
        deleteProperty(target, key) {
            const field = getField(key);
            const changed = knownFields.has(key);
            if (changed) {
                processChange(field);
                knownFields.delete(key);
                if (typeof key !== 'symbol') {
                    processChange(getField(OwnKeysField));
                }
                notify({ type: 'delete', key });
            }
            delete target[key];
            return true;
        },
    });
    if (debugName)
        name(proxy, debugName);
    return proxy;
}
model.keys = function keys(target, debugName) {
    const view = collection([], debugName);
    const keysSet = new Set();
    function addKey(key) {
        if (typeof key === 'number' || typeof key === 'string') {
            const stringKey = key.toString();
            if (!keysSet.has(stringKey)) {
                keysSet.add(stringKey);
                view.push(stringKey);
            }
        }
    }
    function delKey(key) {
        if (typeof key === 'number' || typeof key === 'string') {
            const stringKey = key.toString();
            if (keysSet.has(stringKey)) {
                keysSet.delete(stringKey);
                view.reject((k) => k === stringKey);
            }
        }
    }
    const trigger = model({ i: 0 });
    let events = [];
    const updateEffect = effect(() => {
        trigger.i;
        const toProcess = events;
        events = [];
        untracked(() => {
            toProcess.forEach((event) => {
                if (event.type === 'add') {
                    addKey(event.key);
                }
                if (event.type === 'delete') {
                    delKey(event.key);
                }
            });
        });
    });
    addManualDep(updateEffect, view);
    updateEffect();
    untracked(() => {
        target[ObserveKey]((event) => {
            if (event.type === 'init') {
                event.keys.forEach((key) => {
                    addKey(key);
                });
            }
            else {
                events.push(event);
            }
            trigger.i += 1;
        });
    });
    return view;
};
//# sourceMappingURL=model.js.map