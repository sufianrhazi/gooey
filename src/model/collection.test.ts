import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import { calc } from './calc';
import { collection } from './collection';
import { flush, reset, retain, subscribe } from './engine';
import { model } from './model';

beforeEach(() => {
    reset();
    subscribe();
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
        const start = collection([0, 1, 2, 3, 4, 5]);
        start.reject((n) => n < 4);
        assert.deepEqual([4, 5], start);

        const mid = collection([0, 1, 2, 3, 4, 5]);
        mid.reject((n) => n > 1 && n < 4);
        assert.deepEqual([0, 1, 4, 5], mid);

        const end = collection([0, 1, 2, 3, 4, 5]);
        end.reject((n) => n > 1);
        assert.deepEqual([0, 1], end);

        const all = collection([0, 1, 2, 3, 4, 5]);
        all.reject(() => true);
        assert.deepEqual([], all);

        const none = collection([0, 1, 2, 3, 4, 5]);
        all.reject(() => false);
        assert.deepEqual([0, 1, 2, 3, 4, 5], none);
    });

    test('reject returns rejected values', () => {
        const start = collection([0, 1, 2, 3, 4, 5]);
        assert.deepEqual(
            [0, 1, 2, 3],
            start.reject((n) => n < 4)
        );

        const mid = collection([0, 1, 2, 3, 4, 5]);
        assert.deepEqual(
            [2, 3],
            mid.reject((n) => n > 1 && n < 4)
        );

        const end = collection([0, 1, 2, 3, 4, 5]);
        assert.deepEqual(
            [2, 3, 4, 5],
            end.reject((n) => n > 1)
        );

        const all = collection([0, 1, 2, 3, 4, 5]);
        assert.deepEqual(
            [0, 1, 2, 3, 4, 5],
            all.reject(() => true)
        );

        const none = collection([0, 1, 2, 3, 4, 5]);
        assert.deepEqual(
            [],
            none.reject(() => false)
        );
    });

    test('moveSlice is an in-place movement of a slice (destination after move)', () => {
        const simple = collection([0, 1, 2, 3, 4, 5]);
        simple.moveSlice(1, 2, 3);
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

        beforeSplice.retain();
        inSplice.retain();
        afterSplice.retain();

        assert.is(1, beforeSplice.get());
        assert.is(3, inSplice.get());
        assert.is(5, afterSplice.get());
        assert.is(1, beforeSpliceCount);
        assert.is(1, inSpliceCount);
        assert.is(1, afterSpliceCount);

        numbers.splice(2, 3, 102, 103, 104);
        flush();

        assert.is(1, beforeSplice.get());
        assert.is(103, inSplice.get());
        assert.is(5, afterSplice.get());
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

        beforeSplice.retain();
        inSplice.retain();
        afterSplice.retain();

        assert.is(1, beforeSplice.get());
        assert.is(3, inSplice.get());
        assert.is(5, afterSplice.get());
        assert.is(1, beforeSpliceCount);
        assert.is(1, inSpliceCount);
        assert.is(1, afterSpliceCount);

        numbers.splice(2, 3, 102, 103);
        flush();

        assert.is(1, beforeSplice.get());
        assert.is(103, inSplice.get());
        assert.is(6, afterSplice.get());
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

        beforeSplice.retain();
        inSplice.retain();
        afterSplice.retain();

        assert.is(1, beforeSplice.get());
        assert.is(3, inSplice.get());
        assert.is(5, afterSplice.get());
        assert.is(1, beforeSpliceCount);
        assert.is(1, inSpliceCount);
        assert.is(1, afterSpliceCount);

        numbers.splice(2, 3, 102, 103, 104, 105);
        flush();

        assert.is(1, beforeSplice.get());
        assert.is(103, inSplice.get());
        assert.is(105, afterSplice.get());
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

        beforeSplice.retain();
        inSplice.retain();
        afterSplice.retain();

        assert.is(1, beforeSplice.get());
        assert.is(3, inSplice.get());
        assert.is(5, afterSplice.get());
        assert.is(1, beforeSpliceCount);
        assert.is(1, inSpliceCount);
        assert.is(1, afterSpliceCount);

        numbers.splice(2, 3);
        flush();

        assert.is(1, beforeSplice.get());
        assert.is(6, inSplice.get());
        assert.is(undefined, afterSplice.get());
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
        doubleView.retain();
        sourceCollection.push(5);
        const doublePlusOneView = sourceCollection.mapView(
            (item) => item * 2 + 1
        );
        doublePlusOneView.retain();
        sourceCollection.push(6);
        const doublePlusTwoView = doublePlusOneView.mapView((item) => item + 1);
        doublePlusTwoView.retain();
        sourceCollection.push(7);

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
        view.retain();

        calculation.retain();
        calculation.get();

        m.isActive = true;
        coll.push('foo');
        flush();

        assert.is(true, m.isActive);
        assert.is('foo', coll[0]);
        assert.is(1, coll.length);
        assert.deepEqual([3], view);
        assert.is(3, view[0]);
        assert.is(1, view.length);
        assert.is(true, calculation.get());
    });

    test('collections can be iterated over in a calculation', () => {
        const strings = collection<string>(['foo', 'bar', 'baz']);
        const calculation = calc(() => {
            let all = '';
            for (const str of strings) {
                all += str;
            }
            return all;
        });

        calculation.retain();
        assert.is('foobarbaz', calculation.get());

        strings.push('bum');
        flush();
        assert.is('foobarbazbum', calculation.get());

        strings.splice(1, 2, '-');
        flush();
        assert.is('foo-bum', calculation.get());

        strings[1] = 'bar';
        flush();
        assert.is('foobarbum', calculation.get());
    });

    test('collections keys can be iterated over in a calculation', () => {
        const strings = collection<string>(['foo', 'bar', 'baz']);
        const calculation = calc(() => {
            let all = '';
            for (const idx of strings.keys()) {
                all += strings[idx];
            }
            return all;
        });

        calculation.retain();
        assert.is('foobarbaz', calculation.get());

        strings.push('bum');
        flush();
        assert.is('foobarbazbum', calculation.get());

        strings.splice(1, 2, '-');
        flush();
        assert.is('foo-bum', calculation.get());

        strings[1] = 'bar';
        flush();
        assert.is('foobarbum', calculation.get());
    });

    test('collections values can be iterated over in a calculation', () => {
        const strings = collection<string>(['foo', 'bar', 'baz']);
        const calculation = calc(() => {
            let all = '';
            for (const str of strings.values()) {
                all += str;
            }
            return all;
        });

        calculation.retain();
        assert.is('foobarbaz', calculation.get());

        strings.push('bum');
        flush();
        assert.is('foobarbazbum', calculation.get());

        strings.splice(1, 2, '-');
        flush();
        assert.is('foo-bum', calculation.get());

        strings[1] = 'bar';
        flush();
        assert.is('foobarbum', calculation.get());
    });

    test('collections entries can be iterated over in a calculation', () => {
        const strings = collection<string>(['foo', 'bar', 'baz']);
        const calculation = calc(() => {
            let all = '';
            for (const entry of strings.entries()) {
                all += entry[1];
            }
            return all;
        });

        calculation.retain();
        assert.is('foobarbaz', calculation.get());

        strings.push('bum');
        flush();
        assert.is('foobarbazbum', calculation.get());

        strings.splice(1, 2, '-');
        flush();
        assert.is('foo-bum', calculation.get());

        strings[1] = 'bar';
        flush();
        assert.is('foobarbum', calculation.get());
    });

    test('dispose destroys collection', () => {
        const c = collection([1, 2, 3]);

        assert.is(3, c.length);
        assert.is(1, c[0]);
        assert.is(2, c[1]);
        assert.is(3, c[2]);

        c.dispose();

        assert.throwsMatching(/proxy/, () => c.length);
        assert.throwsMatching(/proxy/, () => c[0]);
        assert.throwsMatching(/proxy/, () => c[1]);
        assert.throwsMatching(/proxy/, () => c[2]);
    });

    test('dispose destroys view', () => {
        const c = collection([1, 2, 3]);
        const v = c.mapView((n) => n * 2);
        v.retain();

        assert.is(3, v.length);
        assert.is(2, v[0]);
        assert.is(4, v[1]);
        assert.is(6, v[2]);

        v.release();

        assert.is(0, v.length);

        v.dispose(); // dispose of the proxy

        assert.throwsMatching(/proxy/, () => v.length);
    });
});

suite('mapView', () => {
    test('produces a mapped view', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        const exclaimations = phrases.mapView(
            (phrase) => `${phrase}!`,
            'exclaimations'
        );
        exclaimations.retain();

        assert.deepEqual(['hi!', 'hello!', 'howdy!'], [...exclaimations]);
    });

    test('mapped views are readonly', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        const exclaimations = phrases.mapView(
            (phrase) => `${phrase}!`,
            'exclaimations'
        );
        exclaimations.retain();

        assert.throwsMatching(/Cannot mutate readonly view/, () => {
            // @ts-expect-error
            exclaimations[0] = 'ok';
        });
        assert.throwsMatching(/Cannot mutate readonly view/, () => {
            // @ts-expect-error
            exclaimations.length = 5;
        });
        assert.throwsMatching(/Cannot mutate readonly view/, () => {
            (exclaimations as any).push('ok');
        });
        assert.throwsMatching(/Cannot mutate readonly view/, () => {
            (exclaimations as any).unshift('ok');
        });
        assert.throwsMatching(/Cannot mutate readonly view/, () => {
            (exclaimations as any).pop();
        });
        assert.throwsMatching(/Cannot mutate readonly view/, () => {
            (exclaimations as any).shift();
        });
    });

    test('handles push, only recalculating new items', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        let prefix = '';
        const exclaimations = phrases.mapView(
            (phrase) => `${prefix}${phrase}!`,
            'exclaimations'
        );
        exclaimations.retain();

        prefix = 'new:';
        phrases.push('cool');
        flush();
        assert.deepEqual(
            ['hi!', 'hello!', 'howdy!', 'new:cool!'],
            [...exclaimations]
        );
    });

    test('handles pop, not recalculating anything', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        let prefix = '';
        const exclaimations = phrases.mapView(
            (phrase) => `${prefix}${phrase}!`,
            'exclaimations'
        );
        exclaimations.retain();

        prefix = 'new:';
        phrases.pop();
        flush();
        assert.deepEqual(['hi!', 'hello!'], exclaimations);
    });

    test('handles unshift, only recalculating new items', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        let prefix = '';
        const exclaimations = phrases.mapView(
            (phrase) => `${prefix}${phrase}!`,
            'exclaimations'
        );
        exclaimations.retain();

        prefix = 'new:';
        phrases.unshift('cool');
        flush();
        assert.deepEqual(
            ['new:cool!', 'hi!', 'hello!', 'howdy!'],
            exclaimations
        );
    });

    test('handles shift, not recalculating anything', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        let prefix = '';
        const exclaimations = phrases.mapView(
            (phrase) => `${prefix}${phrase}!`,
            'exclaimations'
        );
        exclaimations.retain();

        prefix = 'new:';
        phrases.shift();
        flush();
        assert.deepEqual(['hello!', 'howdy!'], exclaimations);
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
        exclaimations.retain();

        prefix = 'new:';
        phrases.splice(1, 2, 'wow', 'neat', 'fun');
        flush();
        assert.deepEqual(
            ['hi!', 'new:wow!', 'new:neat!', 'new:fun!', 'howdy!'],
            exclaimations
        );
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
        exclaimations.retain();

        prefix = 'new:';
        phrases.moveSlice(1, 2, 2);
        flush();
        assert.deepEqual(
            ['one!', 'four!', 'two!', 'three!', 'five!'],
            exclaimations
        );
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
        exclaimations.retain();

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
    });

    test('recalculates writes only upon flush', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        let prefix = '';
        const exclaimations = phrases.mapView(
            (phrase) => `${prefix}${phrase}!`,
            'exclaimations'
        );
        exclaimations.retain();

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
    });

    test('obeys subscription ordering', () => {
        const phrases = collection(['before'], 'phrases');
        const exclaimations = phrases.mapView(
            (phrase) => `${phrase}!`,
            'exclaimations'
        );
        exclaimations.retain();
        phrases.push('after');

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
        reversedPhrases.retain();
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
    });

    test('handles sort with calculation on specific field', () => {
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
        const values: string[] = [];
        const exclaimOne = calc(() => {
            const result = phrases[1] + '!';
            values.push(result);
            return result;
        });
        retain(exclaimOne);
        exclaimOne.get();
        phrases.sort();
        flush();
        assert.deepEqual(['quick!', 'brown!'], values);
    });

    test('handles sort twice', () => {
        const phrases = collection([
            'a',
            'quick',
            'brown',
            'fox',
            'jumps',
            'over',
        ]);
        const reversedPhrases = phrases.mapView((phrase) =>
            Array.from(phrase).reverse().join('')
        );
        reversedPhrases.retain();
        const reverseExclaimedPhrases = reversedPhrases.mapView(
            (phrase) => `${phrase}!`
        );
        reverseExclaimedPhrases.retain();
        phrases.push('the', 'lazy', 'dog');
        phrases.sort();

        flush();
        assert.deepEqual(
            [
                'a!',
                'nworb!',
                'god!',
                'xof!',
                'spmuj!',
                'yzal!',
                'revo!',
                'kciuq!',
                'eht!',
            ],
            reverseExclaimedPhrases
        );

        phrases[1] = 'HELLO';

        flush();
        assert.deepEqual(
            [
                'a!',
                'OLLEH!',
                'god!',
                'xof!',
                'spmuj!',
                'yzal!',
                'revo!',
                'kciuq!',
                'eht!',
            ],
            reverseExclaimedPhrases
        );
    });
});

suite('filterView', () => {
    test('produces a filtered view', () => {
        const numbers = collection([1, 2, 3, 4, 5, 6], 'numbers');
        const evenNumbers = numbers.filterView((num) => num % 2 === 0);
        evenNumbers.retain();
        assert.deepEqual([2, 4, 6], evenNumbers);
    });

    test('handles push/unshift', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenNumbers = numbers.filterView((num) => num % 2 === 0);
        evenNumbers.retain();

        numbers.push(1);
        numbers.push(2);
        numbers.unshift(9);
        numbers.unshift(8);

        flush();
        assert.deepEqual([8, 4, 6, 2], evenNumbers);
    });

    test('handles pop/shift', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenNumbers = numbers.filterView((num) => num % 2 === 0);
        evenNumbers.retain();

        numbers.pop(); // 7
        numbers.shift(); // 3
        flush();
        assert.deepEqual([4, 6], evenNumbers);

        numbers.pop(); // 6
        numbers.shift(); // 4
        flush();
        assert.deepEqual([], evenNumbers);
    });

    test('handles splice when removing hidden item', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenNumbers = numbers.filterView((num) => num % 2 === 0);
        evenNumbers.retain();

        numbers.splice(2, 1, 10, 11, 12); // 5 -> 10, 11, 12
        flush();
        assert.deepEqual([4, 10, 12, 6], evenNumbers);
    });

    test('handles splice when removing visible item', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenNumbers = numbers.filterView((num) => num % 2 === 1);
        evenNumbers.retain();

        numbers.splice(2, 1, 11, 12, 13); // 5 -> 11, 12, 13
        flush();
        assert.deepEqual([3, 11, 13, 7], evenNumbers);
    });

    test('handles splice when removing both visible and hidden items', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenNumbers = numbers.filterView((num) => num % 2 === 1);
        evenNumbers.retain();

        numbers.splice(1, 3, 11, 12, 13); // 4, 5, 6 -> 11, 12, 13
        flush();
        assert.deepEqual([3, 11, 13, 7], evenNumbers);
    });

    test('handles assignment', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenNumbers = numbers.filterView((num) => num % 2 === 0);
        evenNumbers.retain();

        numbers[2] = 1;
        flush();
        assert.deepEqual([4, 6], evenNumbers);

        numbers[2] = 2;
        flush();
        assert.deepEqual([4, 2, 6], evenNumbers);
    });

    test('handles moveSlice', () => {
        const three = model({ value: 3 });
        const four = model({ value: 4 });
        const five = model({ value: 5 });
        const six = model({ value: 6 });
        const seven = model({ value: 7 });
        const numbers = collection([three, four, five, six, seven], 'numbers');
        const evenNumbers = numbers.filterView((item) => item.value % 2 === 0);
        evenNumbers.retain();

        assert.deepEqual([four, six], evenNumbers);

        numbers.moveSlice(2, 3, 0);
        flush();
        assert.deepEqual([six, four], evenNumbers);
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
        evenPhrases.retain();
        phrases.sort();

        flush();
        assert.deepEqual(['lazy', 'over'], evenPhrases);

        phrases[7] = 'ZERO';
        phrases[6] = 'WHAT';

        flush();
        assert.deepEqual(['lazy', 'WHAT', 'ZERO'], evenPhrases);
    });
});

suite('filterView.mapView', () => {
    test('produces a filtered view', () => {
        const numbers = collection([1, 2, 3, 4, 5, 6], 'numbers');
        const evenNumbers = numbers
            .filterView((num) => num % 2 === 0)
            .mapView((num) => -num);
        evenNumbers.retain();
        assert.deepEqual([-2, -4, -6], evenNumbers);
    });

    test('handles push/unshift', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenNumbers = numbers
            .filterView((num) => num % 2 === 0)
            .mapView((num) => -num);
        evenNumbers.retain();

        numbers.push(1);
        numbers.push(2);
        numbers.unshift(9);
        numbers.unshift(8);

        flush();
        assert.deepEqual([-8, -4, -6, -2], evenNumbers);
    });

    test('handles pop/shift', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenNumbers = numbers
            .filterView((num) => num % 2 === 0)
            .mapView((num) => -num);
        evenNumbers.retain();

        numbers.pop(); // 7
        numbers.shift(); // 3
        flush();
        assert.deepEqual([-4, -6], evenNumbers);

        numbers.pop(); // 6
        numbers.shift(); // 4
        flush();
        assert.deepEqual([], evenNumbers);
    });

    test('handles splice when removing hidden item', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenNumbers = numbers
            .filterView((num) => num % 2 === 0)
            .mapView((num) => -num);
        evenNumbers.retain();

        numbers.splice(2, 1, 10, 11, 12); // 5 -> 10, 11, 12
        flush();
        assert.deepEqual([-4, -10, -12, -6], evenNumbers);
    });

    test('handles splice when removing visible item', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenNumbers = numbers
            .filterView((num) => num % 2 === 1)
            .mapView((num) => -num);
        evenNumbers.retain();

        numbers.splice(2, 1, 11, 12, 13); // 5 -> 11, 12, 13
        flush();
        assert.deepEqual([-3, -11, -13, -7], evenNumbers);
    });

    test('handles splice when removing both visible and hidden items', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenNumbers = numbers
            .filterView((num) => num % 2 === 1)
            .mapView((num) => -num);
        evenNumbers.retain();

        numbers.splice(1, 3, 11, 12, 13); // 4, 5, 6 -> 11, 12, 13
        flush();
        assert.deepEqual([-3, -11, -13, -7], evenNumbers);
    });

    test('handles assignment', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenNumbers = numbers
            .filterView((num) => num % 2 === 0)
            .mapView((num) => -num);
        evenNumbers.retain();

        numbers[2] = 1;
        flush();
        assert.deepEqual([-4, -6], evenNumbers);

        numbers[2] = 2;
        flush();
        assert.deepEqual([-4, -2, -6], evenNumbers);
    });

    test('handles moveSlice', () => {
        const three = model({ value: 3 });
        const four = model({ value: 4 });
        const five = model({ value: 5 });
        const six = model({ value: 6 });
        const seven = model({ value: 7 });
        const numbers = collection([three, four, five, six, seven], 'numbers');
        const evenNumbers = numbers
            .filterView((item) => item.value % 2 === 0)
            .mapView((num) => ({ num }));
        evenNumbers.retain();

        assert.deepEqual([{ num: four }, { num: six }], evenNumbers);

        numbers.moveSlice(2, 3, 0);
        flush();
        assert.deepEqual([{ num: six }, { num: four }], evenNumbers);
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
        const evenPhrases = phrases
            .filterView((phrase) => phrase.length % 2 === 0)
            .mapView((phrase) => `${phrase}!`);
        evenPhrases.retain();
        phrases.sort();

        flush();
        assert.deepEqual(['lazy!', 'over!'], evenPhrases);

        phrases[7] = 'ZERO';
        phrases[6] = 'WHAT';

        flush();
        assert.deepEqual(['lazy!', 'WHAT!', 'ZERO!'], evenPhrases);
    });
});

suite('flatMapView', () => {
    test('produces a filtered view', () => {
        const numbers = collection([1, 2, 3, 4, 5, 6], 'numbers');
        const evenDupedNumbers = numbers.flatMapView((num) =>
            num % 2 === 0 ? [num, num] : []
        );
        evenDupedNumbers.retain();
        assert.deepEqual([2, 2, 4, 4, 6, 6], evenDupedNumbers);
    });

    test('handles push/unshift', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenDupedNumbers = numbers.flatMapView((num) =>
            num % 2 === 0 ? [num, num] : []
        );
        evenDupedNumbers.retain();

        numbers.push(1);
        numbers.push(2);
        numbers.unshift(9);
        numbers.unshift(8);

        flush();
        assert.deepEqual([8, 8, 4, 4, 6, 6, 2, 2], evenDupedNumbers);
    });

    test('handles pop/shift', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenDupedNumbers = numbers.flatMapView((num) =>
            num % 2 === 0 ? [num, num] : []
        );
        evenDupedNumbers.retain();

        numbers.pop(); // 7
        numbers.shift(); // 3
        flush();
        assert.deepEqual([4, 4, 6, 6], evenDupedNumbers);

        numbers.pop(); // 6
        numbers.shift(); // 4
        flush();
        assert.deepEqual([], evenDupedNumbers);
    });

    test('handles splice', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenDupedNumbers = numbers.flatMapView((num) =>
            num % 2 === 0 ? [num, num] : []
        );
        evenDupedNumbers.retain();

        numbers.splice(2, 1, 10, 11, 12); // 5 -> 10, 11, 12
        flush();
        assert.deepEqual([4, 4, 10, 10, 12, 12, 6, 6], evenDupedNumbers);
    });

    test('handles assignment', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenDupedNumbers = numbers.flatMapView((num) =>
            num % 2 === 0 ? [num, num] : []
        );
        evenDupedNumbers.retain();

        numbers[2] = 1;
        flush();
        assert.deepEqual([4, 4, 6, 6], evenDupedNumbers);

        numbers[2] = 2;
        flush();
        assert.deepEqual([4, 4, 2, 2, 6, 6], evenDupedNumbers);
    });

    test('handles moveSlice', () => {
        const numbers = collection([3, 4, 5, 6, 7], 'numbers');
        const evenDupedNumbers = numbers.flatMapView((num) =>
            num % 2 === 0 ? [num, num] : [num]
        );
        evenDupedNumbers.retain();

        numbers.moveSlice(1, 2, 2); // 3, 6, 4, 5, 7
        flush();

        assert.deepEqual([3, 6, 6, 4, 4, 5, 7], evenDupedNumbers);
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
        flatMapped.retain();
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
    });
});
