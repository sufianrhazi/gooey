import { AddDeferredWorkKey, FlushKey, ObserveKey, TypeTag, DataTypeTag, } from './types';
import { collection } from './collection';
import { untracked, addManualDep, removeManualDep, addDepToCurrentCalculation, processChange, } from './calc';
import { name } from './debug';
import * as log from './log';
export function trackedData(initialValue, typeTag, implSpec, bindMethods, debugName) {
    const fields = new Map();
    let observers = [];
    let deferredTasks = [];
    const subscriptionNode = {
        [TypeTag]: 'subscription',
    };
    name(subscriptionNode, `${debugName || '?'}:sub`);
    function addDeferredWork(task) {
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
    function notify(event) {
        observers.forEach((observer) => {
            observer(event);
        });
    }
    function observe(observer) {
        if (observers.length === 0) {
            // Initialize the subscription node so events are ordered correctly
            fields.forEach((field) => {
                addManualDep(field, subscriptionNode);
            });
        }
        observers.push(observer);
        return () => {
            observers = observers.filter((obs) => obs !== observer);
            if (observers.length === 0) {
                // Deinitialize the subscription node so events are ordered correctly
                fields.forEach((field) => {
                    removeManualDep(field, subscriptionNode);
                });
            }
        };
    }
    function makeView(spec, viewDebugName) {
        const viewArray = untracked(() => spec.initialize(initialValue));
        const view = collection(viewArray, viewDebugName);
        observe((event) => {
            view[AddDeferredWorkKey](() => spec.processEvent(view, event));
        });
        addManualDep(proxy, view);
        addManualDep(subscriptionNode, view);
        return view;
    }
    function processFieldChange(key) {
        const field = getField(key);
        processChange(field);
    }
    function removeSubscriptionField(key) {
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
            addManualDep(proxy, field);
            if (observers.length > 0) {
                addManualDep(field, subscriptionNode);
            }
        }
        return field;
    }
    const proxy = new Proxy(initialValue, {
        get(target, key) {
            if (key in pseudoPrototype) {
                return pseudoPrototype[key];
            }
            const field = getField(key);
            addDepToCurrentCalculation(field);
            return implSpec.get.call(proxy, notify, target, key);
        },
        has(target, key) {
            if (key in pseudoPrototype) {
                return true;
            }
            const field = getField(key);
            addDepToCurrentCalculation(field);
            return implSpec.has.call(proxy, notify, target, key);
        },
        set(target, key, value) {
            if (key in pseudoPrototype) {
                log.error(`Overriding ${String(key)} not supported`, key);
                return false;
            }
            const changed = implSpec.set.call(proxy, notify, target, key, value);
            if (changed) {
                const field = getField(key);
                processChange(field);
            }
            return changed;
        },
        deleteProperty(target, key) {
            if (key in pseudoPrototype) {
                log.error(`Deleting ${String(key)} not supported`, key);
                return false;
            }
            const changed = implSpec.deleteProperty.call(proxy, notify, target, key);
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
    if (debugName)
        name(proxy, debugName);
    return proxy;
}
//# sourceMappingURL=trackeddata.js.map