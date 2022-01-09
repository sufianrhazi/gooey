import {
    AddDeferredWorkKey,
    InvariantError,
    MakeModelViewKey,
    Model,
    ModelEvent,
    View,
    ViewSpec,
} from './types';
import { trackedData } from './trackeddata';
import { collection } from './collection';
import { untracked, addManualDep } from './calc';

export function model<T extends {}>(obj: T, debugName?: string): Model<T> {
    if (typeof obj !== 'object' || !obj) {
        throw new InvariantError('model must be provided an object');
    }

    const knownFields: Set<string | number | symbol> = new Set(
        Object.keys(obj)
    );

    return trackedData(
        obj,
        'model' as const,
        {
            get: (_notify, target, key) => {
                return target[key];
            },
            has: (notify, target, key) => {
                return knownFields.has(key);
            },
            set: (notify, target, key, value) => {
                const changed = !knownFields.has(key) || target[key] !== value;
                target[key] = value;
                if (changed) {
                    if (!knownFields.has(key)) {
                        knownFields.add(key);
                        notify({ type: 'add', key });
                    }
                    notify({ type: 'set', key, value });
                }
                return true;
            },
            deleteProperty: (notify, target, key) => {
                const changed = knownFields.has(key);
                delete target[key];
                if (changed) {
                    knownFields.delete(key);
                    notify({ type: 'delete', key });
                }
                return true;
            },
        },
        ({ addDeferredWork, makeView, notify, observe, subscriptionNode }) => {
            return {
                [MakeModelViewKey]: function makeModelView<V>(
                    spec: ViewSpec<T, V, ModelEvent>,
                    viewDebugName?: string | undefined
                ) {
                    const viewArray: V[] = untracked(() =>
                        spec.initialize(obj)
                    );
                    const view = collection(viewArray, viewDebugName);
                    observe((event: ModelEvent) => {
                        view[AddDeferredWorkKey](() =>
                            spec.processEvent(view, event, viewArray)
                        );
                    });
                    addManualDep(subscriptionNode, view);
                    return view;
                },
            };
        },
        debugName
    );
}
model.keys = function keys<T>(
    target: Model<T>,
    debugName?: string
): View<string> {
    const keysSet = new Set<string>();

    const view = target[MakeModelViewKey]<string>(
        {
            initialize: (obj) => {
                const keys = Object.keys(obj);
                keys.forEach((key) => keysSet.add(key));
                return keys;
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
