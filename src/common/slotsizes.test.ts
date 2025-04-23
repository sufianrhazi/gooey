import { assert, suite, test } from '@srhazi/gooey-test';

import { applyArrayEvent, ArrayEventType } from './arrayevent';
import { SlotSizes } from './slotsizes';

suite('SlotSizes', () => {
    test('preexisting items, splice in events', () => {
        const a = {};
        const b = {};
        const c = {};
        const result: string[] = [];

        const slotSizes = new SlotSizes([a, b, c]);
        applyArrayEvent(
            result,
            slotSizes.applyEvent(a, {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: ['a:1', 'a:2', 'a:3'],
            })
        );
        applyArrayEvent(
            result,
            slotSizes.applyEvent(c, {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: ['c:1', 'c:2', 'c:3'],
            })
        );
        applyArrayEvent(
            result,
            slotSizes.applyEvent(b, {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: ['b:1', 'b:2', 'b:3'],
            })
        );

        assert.deepEqual(
            ['a:1', 'a:2', 'a:3', 'b:1', 'b:2', 'b:3', 'c:1', 'c:2', 'c:3'],
            result
        );
    });

    test('inserted items, splice in events', () => {
        const a = {};
        const b = {};
        const c = {};
        const result: string[] = [];

        const slotSizes = new SlotSizes<{}>([]);
        slotSizes.splice(0, 0, [a]);
        applyArrayEvent(
            result,
            slotSizes.applyEvent(a, {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: ['a:1', 'a:2', 'a:3'],
            })
        );
        slotSizes.splice(1, 0, [c]);
        applyArrayEvent(
            result,
            slotSizes.applyEvent(c, {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: ['c:1', 'c:2', 'c:3'],
            })
        );
        slotSizes.splice(1, 0, [b]);
        applyArrayEvent(
            result,
            slotSizes.applyEvent(b, {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: ['b:1', 'b:2', 'b:3'],
            })
        );
        applyArrayEvent(
            result,
            slotSizes.applyEvent(c, {
                type: ArrayEventType.SPLICE,
                index: 1,
                count: 1,
                items: ['c:replaced'],
            })
        );
        applyArrayEvent(
            result,
            slotSizes.applyEvent(b, {
                type: ArrayEventType.SORT,
                from: 0,
                indexes: [2, 0, 1],
            })
        );

        assert.deepEqual(
            [
                'a:1',
                'a:2',
                'a:3',
                'b:3',
                'b:1',
                'b:2',
                'c:1',
                'c:replaced',
                'c:3',
            ],
            result
        );
    });

    test('complex sequence', () => {
        const a = {};
        const b = {};
        const c = {};
        const d = {};
        const e = {};
        const result: string[] = [];
        const slotSizes = new SlotSizes<{}>([b, d]);

        applyArrayEvent(
            result,
            slotSizes.applyEvent(b, {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: ['b:0', 'b:1', 'b:2'],
            })
        );

        applyArrayEvent(
            result,
            slotSizes.applyEvent(d, {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: ['d:0', 'd:1', 'd:2'],
            })
        );

        slotSizes.splice(0, 0, [a]);
        slotSizes.splice(3, 0, [e]);
        slotSizes.splice(2, 0, [c]);

        applyArrayEvent(
            result,
            slotSizes.applyEvent(a, {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: ['a:0', 'a:1', 'a:2'],
            })
        );

        applyArrayEvent(
            result,
            slotSizes.applyEvent(c, {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: ['c:0', 'c:1', 'c:2'],
            })
        );

        applyArrayEvent(
            result,
            slotSizes.applyEvent(e, {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: ['e:0', 'e:1', 'e:2'],
            })
        );

        // Checkpoint
        assert.deepEqual(
            [
                'a:0',
                'a:1',
                'a:2',
                'b:0',
                'b:1',
                'b:2',
                'c:0',
                'c:1',
                'c:2',
                'd:0',
                'd:1',
                'd:2',
                'e:0',
                'e:1',
                'e:2',
            ],
            result
        );

        applyArrayEvent(result, slotSizes.move(1, 2, 2));

        assert.deepEqual(
            [
                'a:0',
                'a:1',
                'a:2',
                'd:0',
                'd:1',
                'd:2',
                'b:0',
                'b:1',
                'b:2',
                'c:0',
                'c:1',
                'c:2',
                'e:0',
                'e:1',
                'e:2',
            ],
            result
        );

        applyArrayEvent(result, slotSizes.move(2, 1, 0));

        assert.deepEqual(
            [
                'b:0',
                'b:1',
                'b:2',
                'a:0',
                'a:1',
                'a:2',
                'd:0',
                'd:1',
                'd:2',
                'c:0',
                'c:1',
                'c:2',
                'e:0',
                'e:1',
                'e:2',
            ],
            result
        );

        applyArrayEvent(result, slotSizes.sort(1, [4, 2, 3, 1]));

        assert.deepEqual(
            [
                'b:0',
                'b:1',
                'b:2',
                'e:0',
                'e:1',
                'e:2',
                'd:0',
                'd:1',
                'd:2',
                'c:0',
                'c:1',
                'c:2',
                'a:0',
                'a:1',
                'a:2',
            ],
            result
        );

        const x = {};
        const { removed, event } = slotSizes.splice(1, 3, [x]);
        assert.is(removed[0], e);
        assert.is(removed[1], d);
        assert.is(removed[2], c);
        applyArrayEvent(result, event);

        assert.deepEqual(['b:0', 'b:1', 'b:2', 'a:0', 'a:1', 'a:2'], result);

        applyArrayEvent(
            result,
            slotSizes.applyEvent(x, {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: ['x:0', 'x:1', 'x:2'],
            })
        );
        applyArrayEvent(
            result,
            slotSizes.applyEvent(a, {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 2,
                items: [],
            })
        );
        applyArrayEvent(
            result,
            slotSizes.applyEvent(b, {
                type: ArrayEventType.SPLICE,
                index: 1,
                count: 2,
                items: [],
            })
        );
        assert.deepEqual(['b:0', 'x:0', 'x:1', 'x:2', 'a:2'], result);
    });

    test('bug: move with splice inbetween', () => {
        const a = {};
        const b = {};
        const c = {};
        const d = {};
        const e = {};
        const result: string[] = [];
        const slotSizes = new SlotSizes<{}>([a, b, c, d, e]);

        applyArrayEvent(
            result,
            slotSizes.applyEvent(a, {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: ['a'],
            })
        );
        applyArrayEvent(
            result,
            slotSizes.applyEvent(b, {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: ['b'],
            })
        );
        applyArrayEvent(
            result,
            slotSizes.applyEvent(c, {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: ['c'],
            })
        );
        applyArrayEvent(
            result,
            slotSizes.applyEvent(d, {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: ['d'],
            })
        );
        applyArrayEvent(
            result,
            slotSizes.applyEvent(e, {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: ['e'],
            })
        );

        assert.deepEqual(['a', 'b', 'c', 'd', 'e'], result);

        applyArrayEvent(result, slotSizes.move(3, 2, 0));

        assert.deepEqual(['d', 'e', 'a', 'b', 'c'], result);

        applyArrayEvent(
            result,
            slotSizes.applyEvent(a, {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: ['beforeA'],
            })
        );

        applyArrayEvent(
            result,
            slotSizes.applyEvent(a, {
                type: ArrayEventType.SPLICE,
                index: 2,
                count: 0,
                items: ['afterA'],
            })
        );

        assert.deepEqual(
            ['d', 'e', 'beforeA', 'a', 'afterA', 'b', 'c'],
            result
        );
    });
});
