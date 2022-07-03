export enum ArrayEventType {
    SPLICE,
    MOVE,
    SORT,
}
export type ArrayEvent<T> =
    | {
          type: ArrayEventType.SPLICE;
          index: number;
          count: number;
          items: readonly T[];
      }
    | {
          type: ArrayEventType.MOVE;
          from: number;
          count: number;
          to: number;
      }
    | {
          type: ArrayEventType.SORT;
          from: number;
          indexes: readonly number[];
      };

export function* arrayEventFlatMap<T, V>(
    slotSizes: number[],
    flatMap: (item: T) => readonly V[],
    target: V[],
    event: ArrayEvent<T>
): IterableIterator<ArrayEvent<V>> {
    switch (event.type) {
        case ArrayEventType.SPLICE: {
            let fromIndex = 0;
            let count = 0;
            for (let i = 0; i < event.index; ++i) {
                fromIndex += i < slotSizes.length ? slotSizes[i] : 0;
            }
            for (let i = 0; i < event.count; ++i) {
                const slotIndex = event.index + i;
                count +=
                    slotIndex < slotSizes.length ? slotSizes[slotIndex] : 0;
            }
            const slotItems: number[] = [];
            const items: V[] = [];
            for (const item of event.items) {
                const slot = flatMap(item);
                slotItems.push(slot.length);
                items.push(...slot);
            }
            target.splice(fromIndex, count, ...items);
            slotSizes.splice(event.index, event.count, ...slotItems);
            yield {
                type: ArrayEventType.SPLICE,
                index: fromIndex,
                count,
                items,
            };
            break;
        }
        case ArrayEventType.SORT: {
            const slotStartIndex: number[] = [];
            let realIndex = 0;
            for (const slotSize of slotSizes) {
                slotStartIndex.push(realIndex);
                realIndex += slotSize;
            }
            const copiedSlotSizes = slotSizes.slice();
            const copiedSource = target.slice();

            const newIndexes: number[] = [];
            let destSlotIndex = 0;
            let destIndex = 0;
            for (const sourceIndex of event.indexes) {
                const realCount = copiedSlotSizes[sourceIndex];
                const realIndex = slotStartIndex[sourceIndex];
                for (let i = 0; i < realCount; ++i) {
                    newIndexes.push(realIndex + i);
                    target[destIndex] = copiedSource[realIndex + i];
                    destIndex += 1;
                }
                slotSizes[destSlotIndex] = copiedSlotSizes[sourceIndex];
                destSlotIndex += 1;
            }
            yield {
                type: ArrayEventType.SORT,
                from: slotStartIndex[event.from],
                indexes: newIndexes,
            };
            break;
        }
        case ArrayEventType.MOVE: {
            let fromIndex = 0;
            let toIndex = 0;
            let count = 0;
            for (let i = 0; i < event.from; ++i) {
                fromIndex += slotSizes[i];
            }
            for (let i = 0; i < event.count; ++i) {
                count += slotSizes[event.from + i];
            }
            const movedSlots = slotSizes.splice(event.from, event.count);
            const movedItems = target.splice(fromIndex, count);
            for (let i = 0; i < event.to; ++i) {
                toIndex += slotSizes[i];
            }
            slotSizes.splice(event.to, 0, ...movedSlots);
            target.splice(toIndex, 0, ...movedItems);
            yield {
                type: ArrayEventType.MOVE,
                from: fromIndex,
                count,
                to: toIndex,
            };
            break;
        }
        default:
            log.assertExhausted(event);
    }
}
