import { suite, test, assert, beforeEach } from '@srhazi/test-jig';
import { model } from './model';
import { collection } from './collection';
import { reset, calc, flush, retain, release, subscribe } from './calc';

beforeEach(() => {
    subscribe();
    reset();
});

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

    test('sort performs sort synchronously', () => {
        const simple = collection([0, 1, 2, 3, 4, 5]);
        simple.sort((a, b) => b - a);
        assert.deepEqual([5, 4, 3, 2, 1, 0], simple);
    });

    test('sort performs default JS sort if omitted', () => {
        const simple = collection([7, 8, 9, 10, 11, 12]);
        simple.sort();
        assert.deepEqual([10, 11, 12, 7, 8, 9], simple);
    });

    test('subscriptions are consistent with respect to timing of subscription', () => {
        const sourceCollection = collection([1, 2, 3]);
        sourceCollection.push(4);
        const doubleView = sourceCollection.mapView((item) => item * 2);
        sourceCollection.push(5);
        const doublePlusOneView = sourceCollection.mapView(
            (item) => item * 2 + 1
        );
        sourceCollection.push(6);
        const doublePlusTwoView = doublePlusOneView.mapView((item) => item + 1);
        sourceCollection.push(7);

        retain(doubleView);
        retain(doublePlusOneView);
        retain(doublePlusTwoView);

        assert.deepEqual([1, 2, 3, 4, 5, 6, 7], sourceCollection);
        assert.deepEqual([2, 4, 6, 8], doubleView);
        assert.deepEqual([3, 5, 7, 9, 11], doublePlusOneView);
        assert.deepEqual([4, 6, 8, 10, 12], doublePlusTwoView); // Note: does not contain 14 because doublePlusOneView does not contain 13 (yet)

        flush(); // flush all views

        assert.deepEqual([2, 4, 6, 8, 10, 12, 14], doubleView);
        assert.deepEqual([3, 5, 7, 9, 11, 13, 15], doublePlusOneView);
        assert.deepEqual([4, 6, 8, 10, 12, 14, 16], doublePlusTwoView);
    });

    test('Ensure that calculations that grow dependencies as a result of being processed are processed', () => {
        const m = model({ isActive: false });
        const coll = collection<string>([]);
        const view = coll.mapView((item) => item.length);
        const calculation = calc(() => {
            return m.isActive && view.some((item) => item === 3);
        });
        retain(view);
        retain(calculation);
        calculation();

        m.isActive = true;
        coll.push('foo');
        flush();

        assert.is(true, m.isActive);
        assert.is('foo', coll[0]);
        assert.is(1, coll.length);
        assert.deepEqual([3], view);
        assert.is(3, view[0]);
        assert.is(1, view.length);
        assert.is(true, calculation());

        release(calculation);
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

    test('handles sort', () => {
        const phrases = collection([
            'a',
            'quick',
            'brown',
            'fox',
            'jumps',
            'over',
            'the',
            'lazy',
            'dog',
        ]);
        const reversedPhrases = phrases.mapView((phrase) =>
            Array.from(phrase).reverse().join('')
        );
        retain(reversedPhrases);
        phrases.sort();

        flush();
        assert.deepEqual(
            [
                'a',
                'nworb',
                'god',
                'xof',
                'spmuj',
                'yzal',
                'revo',
                'kciuq',
                'eht',
            ],
            reversedPhrases
        );

        phrases[1] = 'HELLO';

        flush();
        assert.deepEqual(
            [
                'a',
                'OLLEH',
                'god',
                'xof',
                'spmuj',
                'yzal',
                'revo',
                'kciuq',
                'eht',
            ],
            reversedPhrases
        );

        release(reversedPhrases);
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

    test('handles sort', () => {
        const phrases = collection([
            'a',
            'quick',
            'brown',
            'fox',
            'jumps',
            'over',
            'the',
            'lazy',
            'dog',
        ]);
        const evenPhrases = phrases.filterView(
            (phrase) => phrase.length % 2 === 0
        );
        retain(evenPhrases);
        phrases.sort();

        flush();
        assert.deepEqual(['lazy', 'over'], evenPhrases);

        phrases[7] = 'ZERO';
        phrases[6] = 'WHAT';

        flush();
        assert.deepEqual(['lazy', 'WHAT', 'ZERO'], evenPhrases);

        release(evenPhrases);
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

    test('handles sort', () => {
        const phrases = collection([
            'a',
            'quick',
            'brown',
            'fox',
            'jumps',
            'over',
            'the',
            'lazy',
            'dog',
        ]);
        const flatMapped = phrases.flatMapView((phrase) =>
            phrase.length % 2
                ? [Array.from(phrase).join('-')]
                : [phrase, phrase.toUpperCase()]
        );
        retain(flatMapped);
        phrases.sort();

        flush();
        assert.deepEqual(
            [
                'a',
                'b-r-o-w-n',
                'd-o-g',
                'f-o-x',
                'j-u-m-p-s',
                'lazy',
                'LAZY',
                'over',
                'OVER',
                'q-u-i-c-k',
                't-h-e',
            ],
            flatMapped
        );

        phrases[1] = 'blue'; // brown -> blue
        phrases[5] = 'sad'; // lazy -> sad

        flush();
        assert.deepEqual(
            [
                'a',
                'blue',
                'BLUE',
                'd-o-g',
                'f-o-x',
                'j-u-m-p-s',
                's-a-d',
                'over',
                'OVER',
                'q-u-i-c-k',
                't-h-e',
            ],
            flatMapped
        );

        release(flatMapped);
    });
});
