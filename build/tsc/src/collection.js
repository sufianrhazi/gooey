import { InvariantError, } from './types';
import { trackedData } from './trackeddata';
/**
 * Make a mutable array to hold state, with some additional convenience methods
 */
export function collection(array, debugName) {
    if (!Array.isArray(array)) {
        throw new InvariantError('collection must be provided an array');
    }
    return trackedData(array, 'collection', {
        get(notify, target, key) {
            return target[key];
        },
        has(notify, target, key) {
            return key in target;
        },
        set(notify, target, key, value) {
            if (key === 'length' &&
                typeof value === 'number' &&
                value < target.length) {
                // Special handling of resizing length smaller than normal length to handle removing of items
                this.splice(value, target.length - value);
                return true;
            }
            const numericKey = Number(key);
            if (!isNaN(numericKey) && numericKey <= array.length) {
                this.splice(numericKey, 1, value);
            }
            else {
                target[key] = value;
            }
            return true;
        },
        deleteProperty(notify, target, key) {
            delete target[key];
            return true;
        },
    }, ({ notify, subscriptionNode, makeView, observe, addDeferredWork, processFieldChange, removeSubscriptionField, }) => ({
        splice: function splice(index, count, ...items) {
            if (count < 1 && items.length === 0)
                return []; // noop
            const origLength = array.length;
            const removed = array.splice(index, count, ...items);
            const newLength = array.length;
            notify({
                type: 'splice',
                index,
                count,
                items,
                removed,
            });
            // Cases to consider:
            // 1. count === items.length: we are replacing count items
            // 2. count > items.length: we are adding (count - items.length items), notify index to new end
            // 3. count < items.length: we are removing (items.length - count items), notify index to old end
            // Process changes in *added* items
            if (origLength === newLength) {
                for (let i = index; i < index + count; ++i) {
                    processFieldChange(i.toString());
                }
            }
            else {
                for (let i = index; i < Math.max(newLength, origLength); ++i) {
                    const key = i.toString();
                    processFieldChange(key);
                    if (i >= newLength) {
                        removeSubscriptionField(key);
                    }
                }
                processFieldChange('length');
            }
            return removed;
        },
        pop: function pop() {
            const removed = this.splice(array.length - 1, 1);
            return removed[0];
        },
        shift: function shift() {
            const removed = this.splice(0, 1);
            return removed[0];
        },
        push: function push(...items) {
            this.splice(array.length, 0, ...items);
            return array.length;
        },
        unshift: function unshift(...items) {
            this.splice(0, 0, ...items);
            return array.length;
        },
        reject: function reject(func) {
            for (let i = array.length - 1; i >= 0; --i) {
                if (func(this[i], i)) {
                    this.splice(i, 1);
                }
            }
        },
        moveSlice: function moveSlice(fromIndex, fromCount, toIndex) {
            if (fromCount <= 0)
                return; // nothing to slice
            if (toIndex >= fromIndex && toIndex < fromIndex + fromCount)
                return; // destination is inside moved slice, so noop
            const moved = array.splice(fromIndex, fromCount);
            if (toIndex < fromIndex) {
                array.splice(toIndex, 0, ...moved);
            }
            else {
                array.splice(toIndex - fromCount, 0, ...moved);
            }
            notify({
                type: 'move',
                fromIndex,
                fromCount,
                toIndex,
                moved,
            });
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        sort: function sort(_sorter) {
            throw new Error('Cannot sort collections, use sortedView instead');
        },
        makeView,
        mapView: function mapView(mapper, debugName) {
            return mapViewImplementation(this, mapper, debugName);
        },
        filterView: function filterView(filterFn, debugName) {
            return filterViewImplementation(this, filterFn, debugName);
        },
        flatMapView: function flatMapView(fn, debugName) {
            return flatMapViewImplementation(this, fn, debugName);
        },
    }), debugName);
}
function mapViewImplementation(sourceCollection, mapper, debugName) {
    // map is a specialization of flatMap
    return flatMapViewImplementation(sourceCollection, (item) => [mapper(item)], debugName);
}
function filterViewImplementation(sourceCollection, filterFn, debugName) {
    // filter is a specialization of flatMap
    return flatMapViewImplementation(sourceCollection, (item) => (filterFn(item) ? [item] : []), debugName);
}
function flatMapViewImplementation(sourceCollection, fn, debugName) {
    const flatMapCount = [];
    return sourceCollection.makeView({
        initialize: (items) => {
            const flatMapItems = [];
            items.forEach((value) => {
                const chunk = fn(value);
                flatMapItems.push(...chunk);
                flatMapCount.push(chunk.length);
            });
            return flatMapItems;
        },
        processEvent: (view, event) => {
            if (event.type === 'splice') {
                const { index, count, items } = event;
                let realIndex = 0;
                for (let i = 0; i < index; ++i) {
                    realIndex += flatMapCount[i];
                }
                let realCount = 0;
                for (let i = index; i < index + count; ++i) {
                    realCount += flatMapCount[i];
                }
                // Well that's deceptively easy
                const realItems = [];
                const realItemCount = [];
                items.forEach((itemValue) => {
                    const chunk = fn(itemValue);
                    realItems.push(...chunk);
                    realItemCount.push(chunk.length);
                });
                view.splice(realIndex, realCount, ...realItems);
                flatMapCount.splice(index, count, ...realItemCount);
            }
            else if (event.type === 'move') {
                const { fromIndex, fromCount, toIndex } = event;
                let realFromCount = 0;
                for (let i = fromIndex; i < fromIndex + fromCount; ++i) {
                    realFromCount += flatMapCount[i];
                }
                if (realFromCount > 0) {
                    let realFromIndex = 0;
                    let realToIndex = 0;
                    const lastIndex = Math.max(fromIndex, toIndex);
                    let count = 0;
                    for (let i = 0; i <= lastIndex; ++i) {
                        if (i === fromIndex)
                            realFromIndex = count;
                        if (i === toIndex)
                            realToIndex = count;
                        count += flatMapCount[i];
                    }
                    view.moveSlice(realFromIndex, realFromCount, realToIndex);
                }
                flatMapCount.splice(toIndex, 0, ...flatMapCount.splice(fromIndex, fromCount));
            }
        },
    }, debugName);
}
//# sourceMappingURL=collection.js.map