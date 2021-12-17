import { suite, test, assert } from './test';
import { model } from './model';
import { collection } from './collection';
import { calc, flush, retain, release } from './calc';

suite('collection', () => {
    test('reads feel like reads', () => {
        const simple = collection([0, 1, 2]);
        assert.is(simple[0], 0);
        assert.is(simple[1], 1);
        assert.is(simple[2], 2);
    });

    test('deepEquality works as expected', () => {
        const simple = collection([0, 1, 2]);
        assert.deepEqual(simple, [0, 1, 2]);
    });

    test('writes are written', () => {
        const simple = collection([0, 1, 2]);
        simple[1] = 5;
        assert.is(simple[1], 5);
    });

    test('assigning past length extends length', () => {
        const simple = collection([0, 1, 2]);
        assert.is(simple.length, 3);
        simple[5] = 5;
        assert.deepEqual([0, 1, 2, undefined, undefined, 5], simple);
    });

    test('extending length extends length', () => {
        const simple = collection([0, 1, 2]);
        simple.length = 5;
        const items: (number | undefined)[] = simple.slice();
        assert.deepEqual([0, 1, 2, undefined, undefined], items);
    });

    test('reducing length works as expected', () => {
        const simple = collection([0, 1, 2]);
        simple.length = 1;
        const items: (number | undefined)[] = simple.slice();
        assert.deepEqual([0], items);
        assert.is(simple[0], 0);
        assert.is(simple[1], undefined);
        assert.is(simple[2], undefined);
    });

    test('reject is an in-place filter', () => {
        const simple = collection([0, 1, 2, 3, 4, 5]);
        simple.reject((n) => n > 1 && n < 4);
        assert.deepEqual([0, 1, 4, 5], simple);
    });

    test('moveSlice is an in-place movement of a slice (destination after move)', () => {
        const simple = collection([0, 1, 2, 3, 4, 5]);
        simple.moveSlice(1, 2, 5);
        assert.deepEqual([0, 3, 4, 1, 2, 5], simple);
    });
    test('moveSlice is an in-place movement of a slice (destination before move)', () => {
        const simple = collection([0, 1, 2, 3, 4, 5]);
        simple.moveSlice(3, 2, 1);
        assert.deepEqual([0, 3, 4, 1, 2, 5], simple);
    });

    test('splice recalculates indexes modified by splice when length unchanged', () => {
        const numbers = collection([0, 1, 2, 3, 4, 5, 6]);

        let beforeSpliceCount = 0;
        const beforeSplice = calc(() => {
            beforeSpliceCount += 1;
            return numbers[1];
        });
        let inSpliceCount = 0;
        const inSplice = calc(() => {
            inSpliceCount += 1;
            return numbers[3];
        });
        let afterSpliceCount = 0;
        const afterSplice = calc(() => {
            afterSpliceCount += 1;
            return numbers[5];
        });

        retain(beforeSplice);
        retain(inSplice);
        retain(afterSplice);

        assert.is(1, beforeSplice());
        assert.is(3, inSplice());
        assert.is(5, afterSplice());
        assert.is(1, beforeSpliceCount);
        assert.is(1, inSpliceCount);
        assert.is(1, afterSpliceCount);

        numbers.splice(2, 3, 102, 103, 104);
        flush();

        assert.is(1, beforeSplice());
        assert.is(103, inSplice());
        assert.is(5, afterSplice());
        assert.is(1, beforeSpliceCount);
        assert.is(2, inSpliceCount);
        assert.is(1, afterSpliceCount);
    });

    test('splice recalculates indexes modified by splice when length reduced', () => {
        const numbers = collection([0, 1, 2, 3, 4, 5, 6]);

        let beforeSpliceCount = 0;
        const beforeSplice = calc(() => {
            beforeSpliceCount += 1;
            return numbers[1];
        });
        let inSpliceCount = 0;
        const inSplice = calc(() => {
            inSpliceCount += 1;
            return numbers[3];
        });
        let afterSpliceCount = 0;
        const afterSplice = calc(() => {
            afterSpliceCount += 1;
            return numbers[5];
        });

        retain(beforeSplice);
        retain(inSplice);
        retain(afterSplice);

        assert.is(1, beforeSplice());
        assert.is(3, inSplice());
        assert.is(5, afterSplice());
        assert.is(1, beforeSpliceCount);
        assert.is(1, inSpliceCount);
        assert.is(1, afterSpliceCount);

        numbers.splice(2, 3, 102, 103);
        flush();

        assert.is(1, beforeSplice());
        assert.is(103, inSplice());
        assert.is(6, afterSplice());
        assert.is(1, beforeSpliceCount);
        assert.is(2, inSpliceCount);
        assert.is(2, afterSpliceCount);
    });

    test('splice recalculates indexes modified by splice when length grows', () => {
        const numbers = collection([0, 1, 2, 3, 4, 5, 6]);

        let beforeSpliceCount = 0;
        const beforeSplice = calc(() => {
            beforeSpliceCount += 1;
            return numbers[1];
        });
        let inSpliceCount = 0;
        const inSplice = calc(() => {
            inSpliceCount += 1;
            return numbers[3];
        });
        let afterSpliceCount = 0;
        const afterSplice = calc(() => {
            afterSpliceCount += 1;
            return numbers[5];
        });

        retain(beforeSplice);
        retain(inSplice);
        retain(afterSplice);

        assert.is(1, beforeSplice());
        assert.is(3, inSplice());
        assert.is(5, afterSplice());
        assert.is(1, beforeSpliceCount);
        assert.is(1, inSpliceCount);
        assert.is(1, afterSpliceCount);

        numbers.splice(2, 3, 102, 103, 104, 105);
        flush();

        assert.is(1, beforeSplice());
        assert.is(103, inSplice());
        assert.is(105, afterSplice());
        assert.is(1, beforeSpliceCount);
        assert.is(2, inSpliceCount);
        assert.is(2, afterSpliceCount);
    });

    test('splice recalculates indexes modified by splice when length reduced and loses tracked index', () => {
        const numbers = collection([0, 1, 2, 3, 4, 5, 6]);

        let beforeSpliceCount = 0;
        const beforeSplice = calc(() => {
            beforeSpliceCount += 1;
            return numbers[1];
        });
        let inSpliceCount = 0;
        const inSplice = calc(() => {
            inSpliceCount += 1;
            return numbers[3];
        });
        let afterSpliceCount = 0;
        const afterSplice = calc(() => {
            afterSpliceCount += 1;
            return numbers[5];
        });

        retain(beforeSplice);
        retain(inSplice);
        retain(afterSplice);

        assert.is(1, beforeSplice());
        assert.is(3, inSplice());
        assert.is(5, afterSplice());
        assert.is(1, beforeSpliceCount);
        assert.is(1, inSpliceCount);
        assert.is(1, afterSpliceCount);

        numbers.splice(2, 3);
        flush();

        assert.is(1, beforeSplice());
        assert.is(6, inSplice());
        assert.is(undefined, afterSplice());
        assert.is(1, beforeSpliceCount);
        assert.is(2, inSpliceCount);
        assert.is(2, afterSpliceCount);
    });

    test('sort throws exception', () => {
        const simple = collection([0, 1, 2, 3, 4, 5]);
        assert.throwsMatching(
            /Cannot sort collections, use sortedView instead/,
            () => (simple as any).sort((a: number, b: number) => b - a)
        );
    });
});

suite('mapView', () => {
    test('produces a mapped view', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        const exclaimations = phrases.mapView(
            (phrase) => `${phrase}!`,
            'exclaimations'
        );
        retain(exclaimations);
        assert.deepEqual(['hi!', 'hello!', 'howdy!'], exclaimations);
        release(exclaimations);
    });

    test('handles push, only recalculating new items', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        let prefix = '';
        const exclaimations = phrases.mapView(
            (phrase) => `${prefix}${phrase}!`,
            'exclaimations'
        );
        retain(exclaimations);

        prefix = 'new:';
        phrases.push('cool');
        flush();
        assert.deepEqual(
            ['hi!', 'hello!', 'howdy!', 'new:cool!'],
            exclaimations
        );
        release(exclaimations);
    });

    test('handles pop, not recalculating anything', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        let prefix = '';
        const exclaimations = phrases.mapView(
            (phrase) => `${prefix}${phrase}!`,
            'exclaimations'
        );
        retain(exclaimations);

        prefix = 'new:';
        phrases.pop();
        flush();
        assert.deepEqual(['hi!', 'hello!'], exclaimations);
        release(exclaimations);
    });

    test('handles unshift, only recalculating new items', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        let prefix = '';
        const exclaimations = phrases.mapView(
            (phrase) => `${prefix}${phrase}!`,
            'exclaimations'
        );
        retain(exclaimations);

        prefix = 'new:';
        phrases.unshift('cool');
        flush();
        assert.deepEqual(
            ['new:cool!', 'hi!', 'hello!', 'howdy!'],
            exclaimations
        );
        release(exclaimations);
    });

    test('handles shift, not recalculating anything', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        let prefix = '';
        const exclaimations = phrases.mapView(
            (phrase) => `${prefix}${phrase}!`,
            'exclaimations'
        );
        retain(exclaimations);

        prefix = 'new:';
        phrases.shift();
        flush();
        assert.deepEqual(['hello!', 'howdy!'], exclaimations);
        release(exclaimations);
    });

    test('handles splice, only recalculating new items', () => {
        const phrases = collection(
            ['hi', 'toRemove', 'toAlsoRemove', 'howdy'],
            'phrases'
        );
        let prefix = '';
        const exclaimations = phrases.mapView(
            (phrase) => `${prefix}${phrase}!`,
            'exclaimations'
        );
        retain(exclaimations);

        prefix = 'new:';
        phrases.splice(1, 2, 'wow', 'neat', 'fun');
        flush();
        assert.deepEqual(
            ['hi!', 'new:wow!', 'new:neat!', 'new:fun!', 'howdy!'],
            exclaimations
        );
        release(exclaimations);
    });

    test('handles moveSlice, not recalculating moved items', () => {
        const phrases = collection(
            ['one', 'two', 'three', 'four', 'five'],
            'phrases'
        );
        let prefix = '';
        const exclaimations = phrases.mapView(
            (phrase) => `${prefix}${phrase}!`,
            'exclaimations'
        );
        retain(exclaimations);

        prefix = 'new:';
        phrases.moveSlice(1, 2, 4);
        flush();
        assert.deepEqual(
            ['one!', 'four!', 'two!', 'three!', 'five!'],
            exclaimations
        );
        release(exclaimations);
    });

    test('handles writes, only recalculating new items', () => {
        const phrases = collection(
            ['hi', 'toRemove', 'toAlsoRemove', 'howdy'],
            'phrases'
        );
        let prefix = '';
        const exclaimations = phrases.mapView(
            (phrase) => `${prefix}${phrase}!`,
            'exclaimations'
        );
        retain(exclaimations);

        prefix = 'new:';
        phrases[1] = 'wow';
        flush();
        assert.deepEqual(
            ['hi!', 'new:wow!', 'toAlsoRemove!', 'howdy!'],
            exclaimations
        );

        phrases[2] = 'neat';
        flush();
        assert.deepEqual(
            ['hi!', 'new:wow!', 'new:neat!', 'howdy!'],
            exclaimations
        );
        release(exclaimations);
    });

    test('recalculates writes only upon flush', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        let prefix = '';
        const exclaimations = phrases.mapView(
            (phrase) => `${prefix}${phrase}!`,
            'exclaimations'
        );
        retain(exclaimations);

        phrases.pop();
        phrases.shift();
        phrases.push('new end');
        phrases.unshift('new beginning');
        phrases.splice(1, 1, 'new middle');

        assert.deepEqual(['hi!', 'hello!', 'howdy!'], exclaimations);

        prefix = 'new:';
        flush();
        assert.deepEqual(
            ['new:new beginning!', 'new:new middle!', 'new:new end!'],
            exclaimations
        );

        release(exclaimations);
    });

    test('obeys subscription ordering', () => {
        const phrases = collection(['before'], 'phrases');
        const exclaimations = phrases.mapView(
            (phrase) => `${phrase}!`,
            'exclaimations'
        );
        phrases.push('after');
        retain(exclaimations);

        assert.deepEqual(['before!'], exclaimations);
        flush();
        phrases.push('afterFlush');
        assert.deepEqual(['before!', 'after!'], exclaimations);
        flush();
        assert.deepEqual(['before!', 'after!', 'afterFlush!'], exclaimations);
    });
});

suite('filterView', () => {
    test('produces a filtered view', () => {
        const numbers = collection([1, 2, 3, 4, 5, 6], 'numbers');
        const evenNumbers = numbers.filterView((num) => num % 2 === 0);
        retain(evenNumbers);
        assert.deepEqual([2, 4, 6], evenNumbers);
        release(evenNumbers);
    });

    test('handles push/unshift', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenNumbers = numbers.filterView((num) => num % 2 === 0);
        retain(evenNumbers);

        numbers.push(1);
        numbers.push(2);
        numbers.unshift(9);
        numbers.unshift(8);

        flush();
        assert.deepEqual([8, 4, 6, 2], evenNumbers);
        release(evenNumbers);
    });

    test('handles pop/shift', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenNumbers = numbers.filterView((num) => num % 2 === 0);
        retain(evenNumbers);

        numbers.pop(); // 7
        numbers.shift(); // 3
        flush();
        assert.deepEqual([4, 6], evenNumbers);

        numbers.pop(); // 6
        numbers.shift(); // 4
        flush();
        assert.deepEqual([], evenNumbers);
        release(evenNumbers);
    });

    test('handles splice when removing hidden item', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenNumbers = numbers.filterView((num) => num % 2 === 0);
        retain(evenNumbers);

        numbers.splice(2, 1, 10, 11, 12); // 5 -> 10, 11, 12
        flush();
        assert.deepEqual([4, 10, 12, 6], evenNumbers);

        release(evenNumbers);
    });

    test('handles splice when removing visible item', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenNumbers = numbers.filterView((num) => num % 2 === 1);
        retain(evenNumbers);

        numbers.splice(2, 1, 11, 12, 13); // 5 -> 11, 12, 13
        flush();
        assert.deepEqual([3, 11, 13, 7], evenNumbers);

        release(evenNumbers);
    });

    test('handles splice when removing both visible and hidden items', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenNumbers = numbers.filterView((num) => num % 2 === 1);
        retain(evenNumbers);

        numbers.splice(1, 3, 11, 12, 13); // 4, 5, 6 -> 11, 12, 13
        flush();
        assert.deepEqual([3, 11, 13, 7], evenNumbers);

        release(evenNumbers);
    });

    test('handles assignment', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenNumbers = numbers.filterView((num) => num % 2 === 0);
        retain(evenNumbers);

        numbers[2] = 1;
        flush();
        assert.deepEqual([4, 6], evenNumbers);

        numbers[2] = 2;
        flush();
        assert.deepEqual([4, 2, 6], evenNumbers);

        release(evenNumbers);
    });

    test('treats filterFn as a computation', () => {
        const three = model({ value: 3 });
        const four = model({ value: 4 });
        const five = model({ value: 5 });
        const six = model({ value: 6 });
        const seven = model({ value: 7 });
        const numbers = collection([three, four, five, six, seven], 'numbers');
        const evenNumbers = numbers.filterView((item) => item.value % 2 === 0);
        retain(evenNumbers);

        assert.deepEqual([four, six], evenNumbers);

        five.value = 50;
        flush();
        assert.deepEqual([four, five, six], evenNumbers);

        release(evenNumbers);
    });

    test('handles moveSlice', () => {
        const three = model({ value: 3 });
        const four = model({ value: 4 });
        const five = model({ value: 5 });
        const six = model({ value: 6 });
        const seven = model({ value: 7 });
        const numbers = collection([three, four, five, six, seven], 'numbers');
        const evenNumbers = numbers.filterView((item) => item.value % 2 === 0);
        retain(evenNumbers);

        assert.deepEqual([four, six], evenNumbers);

        numbers.moveSlice(2, 3, 0);
        flush();
        assert.deepEqual([six, four], evenNumbers);

        release(evenNumbers);
    });

    test('handles moveSlice after updates', () => {
        const evenOdd = model({ value: 0 });
        const three = model({ value: 3 });
        const four = model({ value: 4 });
        const five = model({ value: 5 });
        const six = model({ value: 6 });
        const seven = model({ value: 7 });
        const numbers = collection([three, four, five, six, seven], 'numbers');
        const evenNumbers = numbers.filterView(
            (item) => item.value % 2 === evenOdd.value
        );
        retain(evenNumbers);

        assert.deepEqual([four, six], evenNumbers);
        evenOdd.value = 1;
        flush();
        assert.deepEqual([three, five, seven], evenNumbers);
        evenOdd.value = 0;
        flush();

        numbers.moveSlice(2, 3, 0); // three, four, five, six, seven -> five, six, seven, three, four
        flush();
        assert.deepEqual([six, four], evenNumbers);
        evenOdd.value = 1;
        flush();
        assert.deepEqual([five, seven, three], evenNumbers);

        release(evenNumbers);
    });
});

suite('flatMapView', () => {
    test('produces a filtered view', () => {
        const numbers = collection([1, 2, 3, 4, 5, 6], 'numbers');
        const evenDupedNumbers = numbers.flatMapView((num) =>
            num % 2 === 0 ? [num, num] : []
        );
        retain(evenDupedNumbers);
        assert.deepEqual([2, 2, 4, 4, 6, 6], evenDupedNumbers);
        release(evenDupedNumbers);
    });

    test('handles push/unshift', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenDupedNumbers = numbers.flatMapView((num) =>
            num % 2 === 0 ? [num, num] : []
        );
        retain(evenDupedNumbers);

        numbers.push(1);
        numbers.push(2);
        numbers.unshift(9);
        numbers.unshift(8);

        flush();
        assert.deepEqual([8, 8, 4, 4, 6, 6, 2, 2], evenDupedNumbers);
        release(evenDupedNumbers);
    });

    test('handles pop/shift', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenDupedNumbers = numbers.flatMapView((num) =>
            num % 2 === 0 ? [num, num] : []
        );
        retain(evenDupedNumbers);

        numbers.pop(); // 7
        numbers.shift(); // 3
        flush();
        assert.deepEqual([4, 4, 6, 6], evenDupedNumbers);

        numbers.pop(); // 6
        numbers.shift(); // 4
        flush();
        assert.deepEqual([], evenDupedNumbers);
        release(evenDupedNumbers);
    });

    test('handles splice', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenDupedNumbers = numbers.flatMapView((num) =>
            num % 2 === 0 ? [num, num] : []
        );
        retain(evenDupedNumbers);

        numbers.splice(2, 1, 10, 11, 12); // 5 -> 10, 11, 12
        flush();
        assert.deepEqual([4, 4, 10, 10, 12, 12, 6, 6], evenDupedNumbers);

        release(evenDupedNumbers);
    });

    test('handles assignment', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenDupedNumbers = numbers.flatMapView((num) =>
            num % 2 === 0 ? [num, num] : []
        );
        retain(evenDupedNumbers);

        numbers[2] = 1;
        flush();
        assert.deepEqual([4, 4, 6, 6], evenDupedNumbers);

        numbers[2] = 2;
        flush();
        assert.deepEqual([4, 4, 2, 2, 6, 6], evenDupedNumbers);

        release(evenDupedNumbers);
    });

    test('handles moveSlice', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenDupedNumbers = numbers.flatMapView((num) =>
            num % 2 === 0 ? [num, num] : [num]
        );
        retain(evenDupedNumbers);

        numbers.moveSlice(1, 2, 4); // 3, 6, 4, 5, 7
        flush();

        assert.deepEqual([3, 6, 6, 4, 4, 5, 7], evenDupedNumbers);

        release(evenDupedNumbers);
    });
});
