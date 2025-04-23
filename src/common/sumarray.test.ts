import { assert, suite, test } from '@srhazi/gooey-test';

import { SumArray } from './sumarray';

[0, 1, 2, 3, 4, 5].forEach((bits) => {
    suite(`SumArray bits ${bits}`, () => {
        test('initial getSum', () => {
            const sa = new SumArray(bits, [1, 2, 3, 4, 5, 6, 7, 8]);
            assert.is(0, sa.getSum(0));
            assert.is(1, sa.getSum(1));
            assert.is(1 + 2, sa.getSum(2));
            assert.is(1 + 2 + 3, sa.getSum(3));
            assert.is(1 + 2 + 3 + 4, sa.getSum(4));
            assert.is(1 + 2 + 3 + 4 + 5, sa.getSum(5));
            assert.is(1 + 2 + 3 + 4 + 5 + 6, sa.getSum(6));
            assert.is(1 + 2 + 3 + 4 + 5 + 6 + 7, sa.getSum(7));
            assert.is(1 + 2 + 3 + 4 + 5 + 6 + 7 + 8, sa.getSum(8));
        });

        test('initial get', () => {
            const sa = new SumArray(bits, [1, 2, 3, 4, 5, 6, 7, 8]);
            assert.is(1, sa.get(0));
            assert.is(2, sa.get(1));
            assert.is(3, sa.get(2));
            assert.is(4, sa.get(3));
            assert.is(5, sa.get(4));
            assert.is(6, sa.get(5));
            assert.is(7, sa.get(6));
            assert.is(8, sa.get(7));
        });

        test('set() updates', () => {
            const sa = new SumArray(bits, [1, 2, 3, 4, 5, 6, 7, 8]);
            sa.set(0, 100);
            sa.set(3, 10);
            assert.is(0, sa.getSum(0));
            assert.is(100, sa.getSum(1));
            assert.is(100 + 2, sa.getSum(2));
            assert.is(100 + 2 + 3, sa.getSum(3));
            assert.is(100 + 2 + 3 + 10, sa.getSum(4));
            assert.is(100 + 2 + 3 + 10 + 5, sa.getSum(5));
            assert.is(100 + 2 + 3 + 10 + 5 + 6, sa.getSum(6));
            assert.is(100 + 2 + 3 + 10 + 5 + 6 + 7, sa.getSum(7));
            assert.is(100 + 2 + 3 + 10 + 5 + 6 + 7 + 8, sa.getSum(8));
        });

        test('splice() updates', () => {
            const sa = new SumArray(bits, [1, 2, 3, 4, 5, 6, 7, 8]);
            sa.splice(0, 3, [10, 100]);
            assert.is(0, sa.getSum(0));
            assert.is(10, sa.getSum(1));
            assert.is(10 + 100, sa.getSum(2));
            assert.is(10 + 100 + 4, sa.getSum(3));
            assert.is(10 + 100 + 4 + 5, sa.getSum(4));
            assert.is(10 + 100 + 4 + 5 + 6, sa.getSum(5));
            assert.is(10 + 100 + 4 + 5 + 6 + 7, sa.getSum(6));
            assert.is(10 + 100 + 4 + 5 + 6 + 7 + 8, sa.getSum(7));
        });

        test('splice() with a push', () => {
            const sa = new SumArray(bits, [1, 2, 3]);
            sa.splice(3, 0, [4, 5, 6, 7, 8]);
            assert.is(0, sa.getSum(0));
            assert.is(1, sa.getSum(1));
            assert.is(1 + 2, sa.getSum(2));
            assert.is(1 + 2 + 3, sa.getSum(3));
            assert.is(1 + 2 + 3 + 4, sa.getSum(4));
            assert.is(1 + 2 + 3 + 4 + 5, sa.getSum(5));
            assert.is(1 + 2 + 3 + 4 + 5 + 6, sa.getSum(6));
            assert.is(1 + 2 + 3 + 4 + 5 + 6 + 7, sa.getSum(7));
            assert.is(1 + 2 + 3 + 4 + 5 + 6 + 7 + 8, sa.getSum(8));
        });

        test('splice() push', () => {
            const sa = new SumArray(bits, [1, 2, 3, 4, 5, 6, 7, 8]);
            sa.splice(8, 0, [100]);
            assert.is(0, sa.getSum(0));
            assert.is(1, sa.getSum(1));
            assert.is(1 + 2, sa.getSum(2));
            assert.is(1 + 2 + 3, sa.getSum(3));
            assert.is(1 + 2 + 3 + 4, sa.getSum(4));
            assert.is(1 + 2 + 3 + 4 + 5, sa.getSum(5));
            assert.is(1 + 2 + 3 + 4 + 5 + 6, sa.getSum(6));
            assert.is(1 + 2 + 3 + 4 + 5 + 6 + 7, sa.getSum(7));
            assert.is(1 + 2 + 3 + 4 + 5 + 6 + 7 + 8, sa.getSum(8));
            assert.is(1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 100, sa.getSum(9));
        });

        test('move()', () => {
            const sa = new SumArray(bits, [1, 2, 3, 4, 5, 6, 7, 8]);
            // 1 2 3 4 5 6 7 8
            //           ^ ^
            //     v
            // 1 2 6 7 3 4 5 8
            sa.move(5, 2, 2);
            assert.is(0, sa.getSum(0));
            assert.is(1, sa.getSum(1));
            assert.is(1 + 2, sa.getSum(2));
            assert.is(1 + 2 + 6, sa.getSum(3));
            assert.is(1 + 2 + 6 + 7, sa.getSum(4));
            assert.is(1 + 2 + 6 + 7 + 3, sa.getSum(5));
            assert.is(1 + 2 + 6 + 7 + 3 + 4, sa.getSum(6));
            assert.is(1 + 2 + 6 + 7 + 3 + 4 + 5, sa.getSum(7));
            assert.is(1 + 2 + 6 + 7 + 3 + 4 + 5 + 8, sa.getSum(8));
        });

        test('sort()', () => {
            const sa = new SumArray(bits, [1, 2, 3, 4, 5, 6, 7, 8]);
            // 1 2 3 4 5 6 7 8
            //       ^ ^ ^
            // 1 2 3 5 6 4 7 8
            sa.sort(3, [4, 5, 3]);
            assert.is(0, sa.getSum(0));
            assert.is(1, sa.getSum(1));
            assert.is(1 + 2, sa.getSum(2));
            assert.is(1 + 2 + 3, sa.getSum(3));
            assert.is(1 + 2 + 3 + 5, sa.getSum(4));
            assert.is(1 + 2 + 3 + 5 + 6, sa.getSum(5));
            assert.is(1 + 2 + 3 + 5 + 6 + 4, sa.getSum(6));
            assert.is(1 + 2 + 3 + 5 + 6 + 4 + 7, sa.getSum(7));
            assert.is(1 + 2 + 3 + 5 + 6 + 4 + 7 + 8, sa.getSum(8));
        });
    });
});
