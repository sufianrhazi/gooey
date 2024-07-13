import { assert, suite, test } from '@srhazi/gooey-test';

import type { ArrayEvent } from './arrayevent';
import { addArrayEvent, ArrayEventType } from './arrayevent';

suite('addArrayEvent', () => {
    test('add SPLICE to empty array always adds', () => {
        const events: ArrayEvent<string>[] = [];
        const event: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: ['a'],
        };
        addArrayEvent(events, event);
        assert.deepEqual([event], events);
    });
    test('add MOVE to empty array always adds', () => {
        const events: ArrayEvent<string>[] = [];
        const event: ArrayEvent<string> = {
            type: ArrayEventType.MOVE,
            from: 0,
            count: 1,
            to: 1,
        };
        addArrayEvent(events, event);
        assert.deepEqual([event], events);
    });
    test('add SORT to empty array always adds', () => {
        const events: ArrayEvent<string>[] = [];
        const event: ArrayEvent<string> = {
            type: ArrayEventType.SORT,
            from: 0,
            indexes: [2, 1, 0],
        };
        addArrayEvent(events, event);
        assert.deepEqual([event], events);
    });

    test('add two joining splice events merges (concat)', () => {
        const events: ArrayEvent<string>[] = [];
        const event1: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: ['a'],
        };
        const event2: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 1,
            count: 0,
            items: ['b'],
        };
        addArrayEvent(events, event1);
        addArrayEvent(events, event2);
        assert.deepEqual(
            [
                {
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 0,
                    items: ['a', 'b'],
                },
            ],
            events
        );
    });

    test('add two joining splice events merges (delete)', () => {
        const events: ArrayEvent<string>[] = [];
        const event1: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 1,
        };
        const event2: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 2,
        };
        addArrayEvent(events, event1);
        addArrayEvent(events, event2);
        assert.deepEqual(
            [
                {
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 3,
                },
            ],
            events
        );
    });

    test('add two joining splice events merges (concat and delete, partial)', () => {
        const events: ArrayEvent<string>[] = [];
        const event1: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 1,
            items: ['a', 'b', 'c'],
        };
        const event2: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 3,
            count: 1,
            items: ['d', 'e'],
        };
        addArrayEvent(events, event1);
        addArrayEvent(events, event2);
        assert.deepEqual(
            [
                {
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 2,
                    items: ['a', 'b', 'c', 'd', 'e'],
                },
            ],
            events
        );
    });

    test('replace items with multiple operations (pop, shift, push, unshift, splice)', () => {
        const events: ArrayEvent<string>[] = [];
        const event1: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 2,
            count: 1,
        };
        const event2: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 1,
        };
        const event3: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 1,
            count: 0,
            items: ['new end'],
        };
        const event4: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: ['new beginning'],
        };
        const event5: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 1,
            count: 1,
            items: ['new middle'],
        };
        addArrayEvent(events, event1);
        addArrayEvent(events, event2);
        addArrayEvent(events, event3);
        addArrayEvent(events, event4);
        addArrayEvent(events, event5);
        assert.deepEqual(
            [
                {
                    type: 'splice',
                    index: 2,
                    count: 1,
                },
                {
                    type: 'splice',
                    index: 0,
                    count: 1,
                },
                {
                    type: 'splice',
                    index: 1,
                    count: 0,
                    items: ['new end'],
                },
                {
                    type: 'splice',
                    index: 0,
                    count: 1,
                    items: ['new beginning', 'new middle'],
                },
            ],
            events
        );
    });
});
