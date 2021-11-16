import { suite, test, assert } from './test';
import { collection } from './collection';
import { flush, retain, release } from './calc';

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
});

suite('sortedView', () => {
    test('produces a sorted view', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        const sortedPhrases = phrases.sortedView((a, b) =>
            a < b ? -1 : a > b ? 1 : 0
        );
        retain(sortedPhrases);
        assert.deepEqual(['hello', 'hi', 'howdy'], sortedPhrases);
        release(sortedPhrases);
    });

    test('handles push and unshift', () => {
        const phrases = collection(['throws', 'green', 'robot'], 'phrases');
        const sortedPhrases = phrases.sortedView((a, b) =>
            a < b ? -1 : a > b ? 1 : 0
        );
        retain(sortedPhrases);

        phrases.push('a');
        phrases.unshift('violently');
        flush();
        assert.deepEqual(
            ['a', 'green', 'robot', 'throws', 'violently'],
            sortedPhrases
        );
        release(sortedPhrases);
    });

    test('handles pop and shift', () => {
        const phrases = collection(
            ['quick', 'brown', 'fox', 'jumped', 'over', 'the', 'lazy', 'dog'],
            'phrases'
        );
        const sortedPhrases = phrases.sortedView((a, b) =>
            a < b ? -1 : a > b ? 1 : 0
        );
        retain(sortedPhrases);

        phrases.pop(); // dog
        phrases.shift(); // quick

        flush();
        assert.deepEqual(
            ['brown', 'fox', 'jumped', 'lazy', 'over', 'the'],
            sortedPhrases
        );
        release(sortedPhrases);
    });

    test('handles splice', () => {
        const phrases = collection(
            ['quick', 'brown', 'fox', 'jumped', 'over', 'the', 'lazy', 'dog'],
            'phrases'
        );
        const sortedPhrases = phrases.sortedView((a, b) =>
            a < b ? -1 : a > b ? 1 : 0
        );
        retain(sortedPhrases);

        phrases.splice(2, 3, 'bear', 'stalked'); // quick brown (fox jumped over -> bear stalked) the lazy dog

        flush();
        assert.deepEqual(
            ['bear', 'brown', 'dog', 'lazy', 'quick', 'stalked', 'the'],
            sortedPhrases
        );
        release(sortedPhrases);
    });

    test('handles assignment', () => {
        const phrases = collection(
            ['quick', 'brown', 'fox', 'jumped', 'over', 'the', 'lazy', 'dog'],
            'phrases'
        );
        const sortedPhrases = phrases.sortedView((a, b) =>
            a < b ? -1 : a > b ? 1 : 0
        );
        retain(sortedPhrases);

        phrases[2] = 'tank';

        flush();
        assert.deepEqual(
            ['brown', 'dog', 'jumped', 'lazy', 'over', 'quick', 'tank', 'the'],
            sortedPhrases
        );
        release(sortedPhrases);
    });

    test('recalculates only on flush', () => {
        const phrases = collection(
            ['quick', 'brown', 'fox', 'jumped', 'over', 'the', 'lazy', 'dog'],
            'phrases'
        );
        const sortedPhrases = phrases.sortedView((a, b) =>
            a < b ? -1 : a > b ? 1 : 0
        );
        retain(sortedPhrases);

        phrases[2] = 'tank';

        assert.deepEqual(
            ['brown', 'dog', 'fox', 'jumped', 'lazy', 'over', 'quick', 'the'],
            sortedPhrases
        );
        flush();
        assert.deepEqual(
            ['brown', 'dog', 'jumped', 'lazy', 'over', 'quick', 'tank', 'the'],
            sortedPhrases
        );
        release(sortedPhrases);
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

    test('handles splice', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenNumbers = numbers.filterView((num) => num % 2 === 0);
        retain(evenNumbers);

        numbers.splice(2, 1, 10, 11, 12); // 5 -> 10, 11, 12
        flush();
        assert.deepEqual([4, 10, 12, 6], evenNumbers);

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
});
