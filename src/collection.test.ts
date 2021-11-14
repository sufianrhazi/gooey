import { suite, test, assert } from './test';
import { collection } from './collection';
import { flush, retain, release } from './calc';
import { debug } from './index';

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
        simple.reject(n => n % 2 === 0);
        assert.deepEqual([1, 3, 5], simple);
    });
});

suite('mapView', () => {
    test('produces a mapped view', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        const exclaimations = phrases.mapView((phrase) => `${phrase}!`, 'exclaimations');
        retain(exclaimations);
        assert.deepEqual(['hi!', 'hello!', 'howdy!'], exclaimations);
        release(exclaimations);
    });

    test('mapView handles push, only recalculating new items', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        let prefix = '';
        const exclaimations = phrases.mapView((phrase) => `${prefix}${phrase}!`, 'exclaimations');
        retain(exclaimations);

        prefix = 'new:';
        phrases.push('cool');
        flush();
        assert.deepEqual(['hi!', 'hello!', 'howdy!', 'new:cool!'], exclaimations);
        release(exclaimations);
    });

    test('mapView handles pop, not recalculating anything', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        let prefix = '';
        const exclaimations = phrases.mapView((phrase) => `${prefix}${phrase}!`, 'exclaimations');
        retain(exclaimations);

        prefix = 'new:';
        phrases.pop();
        flush();
        assert.deepEqual(['hi!', 'hello!'], exclaimations);
        release(exclaimations);
    });

    test('mapView handles unshift, only recalculating new items', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        let prefix = '';
        const exclaimations = phrases.mapView((phrase) => `${prefix}${phrase}!`, 'exclaimations');
        retain(exclaimations);

        prefix = 'new:';
        phrases.unshift('cool');
        flush();
        assert.deepEqual(['new:cool!', 'hi!', 'hello!', 'howdy!'], exclaimations);
        release(exclaimations);
    });

    test('mapView handles shift, not recalculating anything', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        let prefix = '';
        const exclaimations = phrases.mapView((phrase) => `${prefix}${phrase}!`, 'exclaimations');
        retain(exclaimations);

        prefix = 'new:';
        phrases.shift();
        flush();
        assert.deepEqual(['hello!', 'howdy!'], exclaimations);
        release(exclaimations);
    });

    test('mapView handles splice, only recalculating new items', () => {
        const phrases = collection(['hi', 'toRemove', 'toAlsoRemove', 'howdy'], 'phrases');
        let prefix = '';
        const exclaimations = phrases.mapView((phrase) => `${prefix}${phrase}!`, 'exclaimations');
        retain(exclaimations);

        prefix = 'new:';
        phrases.splice(1, 2, 'wow', 'neat', 'fun');
        flush();
        assert.deepEqual(['hi!', 'new:wow!', 'new:neat!', 'new:fun!', 'howdy!'], exclaimations);
        release(exclaimations);
    });

    test('mapView handles writes, only recalculating new items', () => {
        const phrases = collection(['hi', 'toRemove', 'toAlsoRemove', 'howdy'], 'phrases');
        let prefix = '';
        const exclaimations = phrases.mapView((phrase) => `${prefix}${phrase}!`, 'exclaimations');
        retain(exclaimations);

        prefix = 'new:';
        phrases[1] = 'wow';
        flush();
        assert.deepEqual(['hi!', 'new:wow!', 'toAlsoRemove!', 'howdy!'], exclaimations);

        phrases[2] = 'neat';
        flush();
        assert.deepEqual(['hi!', 'new:wow!', 'new:neat!', 'howdy!'], exclaimations);
        release(exclaimations);
    });

    test('mapView recalculates writes only upon flush', () => {
        const phrases = collection(['hi', 'hello', 'howdy'], 'phrases');
        let prefix = '';
        const exclaimations = phrases.mapView((phrase) => `${prefix}${phrase}!`, 'exclaimations');
        retain(exclaimations);

        phrases.pop();
        phrases.shift();
        phrases.push('new end');
        phrases.unshift('new beginning');
        phrases.splice(1, 1, 'new middle');

        assert.deepEqual(['hi!', 'hello!', 'howdy!'], exclaimations);

        prefix = 'new:';
        flush();
        assert.deepEqual(['new:new beginning!', 'new:new middle!', 'new:new end!'], exclaimations);

        release(exclaimations);
    });
});
