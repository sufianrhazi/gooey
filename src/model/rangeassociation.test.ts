import { assert, suite, test } from '@srhazi/gooey-test';

import { RangeAssociation } from './rangeassociation';

suite('RangeAssociation', () => {
    test('querying an empty rangeassociation produces nothing', () => {
        const ra = new RangeAssociation<string>();
        assert.is(null, ra.getAssociation(0));
        assert.is(null, ra.getAssociation(100));
        assert.is(null, ra.getAssociation(-100));
    });

    test('a range may be associated with a value', () => {
        const ra = new RangeAssociation<string>();
        ra.setAssociation(2, 4, 'foo');
        assert.is(null, ra.getAssociation(0));
        assert.is(null, ra.getAssociation(1));
        assert.is('foo', ra.getAssociation(2));
        assert.is('foo', ra.getAssociation(3));
        assert.is(null, ra.getAssociation(4));
        assert.is(null, ra.getAssociation(5));
    });

    test('out-of-bounds negative indexes produce nothing', () => {
        const ra = new RangeAssociation<string>();
        ra.setAssociation(2, 4, 'foo');
        assert.is(null, ra.getAssociation(-100));
        assert.is(null, ra.getAssociation(-Infinity));
    });

    test('out-of-bounds positive indexes produce nothing', () => {
        const ra = new RangeAssociation<string>();
        ra.setAssociation(2, 4, 'foo');
        assert.is(null, ra.getAssociation(100));
        assert.is(null, ra.getAssociation(Infinity));
    });

    test('NaN indexes produce nothing', () => {
        const ra = new RangeAssociation<string>();
        ra.setAssociation(2, 4, 'foo');
        assert.is(null, ra.getAssociation(NaN));
    });

    test('a range may be extended to the right', () => {
        const ra = new RangeAssociation<string>();
        ra.setAssociation(1, 3, 'foo');
        ra.setAssociation(2, 5, 'bar');
        assert.is(null, ra.getAssociation(0));
        assert.is('foo', ra.getAssociation(1));
        assert.is('foo', ra.getAssociation(2));
        assert.is('bar', ra.getAssociation(3));
        assert.is('bar', ra.getAssociation(4));
        assert.is(null, ra.getAssociation(5));
    });

    test('a range may be extended to the left', () => {
        const ra = new RangeAssociation<string>();
        ra.setAssociation(3, 6, 'foo');
        ra.setAssociation(1, 4, 'bar');
        assert.is(null, ra.getAssociation(0));
        assert.is('bar', ra.getAssociation(1));
        assert.is('bar', ra.getAssociation(2));
        assert.is('foo', ra.getAssociation(3));
        assert.is('foo', ra.getAssociation(4));
        assert.is('foo', ra.getAssociation(5));
        assert.is(null, ra.getAssociation(6));
    });

    test('a range may be extended to both sides', () => {
        const ra = new RangeAssociation<string>();
        ra.setAssociation(3, 5, 'foo');
        ra.setAssociation(1, 6, 'bar');
        assert.is(null, ra.getAssociation(0));
        assert.is('bar', ra.getAssociation(1));
        assert.is('bar', ra.getAssociation(2));
        assert.is('foo', ra.getAssociation(3));
        assert.is('foo', ra.getAssociation(4));
        assert.is('bar', ra.getAssociation(5));
        assert.is(null, ra.getAssociation(6));
    });

    test('large ranges work across multiple interspersed items', () => {
        const ra = new RangeAssociation<string>();
        ra.setAssociation(2, 3, 'A');
        ra.setAssociation(5, 6, 'B');
        ra.setAssociation(8, 9, 'C');
        ra.setAssociation(0, 10, 'baz');
        assert.is('baz', ra.getAssociation(0));
        assert.is('baz', ra.getAssociation(1));
        assert.is('A', ra.getAssociation(2));
        assert.is('baz', ra.getAssociation(3));
        assert.is('baz', ra.getAssociation(4));
        assert.is('B', ra.getAssociation(5));
        assert.is('baz', ra.getAssociation(6));
        assert.is('baz', ra.getAssociation(7));
        assert.is('C', ra.getAssociation(8));
        assert.is('baz', ra.getAssociation(9));
        assert.is(null, ra.getAssociation(10));
    });

    test('clear clears the array', () => {
        const ra = new RangeAssociation<string>();
        ra.setAssociation(2, 3, 'A');
        ra.setAssociation(5, 6, 'B');
        ra.setAssociation(8, 9, 'C');
        ra.setAssociation(0, 10, 'baz');
        ra.clear();
        assert.is(null, ra.getAssociation(0));
        assert.is(null, ra.getAssociation(1));
        assert.is(null, ra.getAssociation(2));
        assert.is(null, ra.getAssociation(3));
        assert.is(null, ra.getAssociation(4));
        assert.is(null, ra.getAssociation(5));
        assert.is(null, ra.getAssociation(6));
        assert.is(null, ra.getAssociation(7));
        assert.is(null, ra.getAssociation(8));
        assert.is(null, ra.getAssociation(9));
        assert.is(null, ra.getAssociation(10));
    });
});
