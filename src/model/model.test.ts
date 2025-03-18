import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import { flush, reset, subscribe } from './engine';
import { model } from './model';

beforeEach(() => {
    reset();
    subscribe();
});

suite('model', () => {
    test('reads feel like reads', () => {
        const simple = model({
            foo: 3,
            bar: {
                hello: 'world',
            },
        });
        assert.is(simple.foo, 3);
        assert.deepEqual(simple.bar, { hello: 'world' });
    });

    test('deepEquality works as expected', () => {
        const simple = model({
            foo: 3,
            bar: {
                hello: 'world',
            },
        });
        assert.deepEqual(simple, {
            foo: 3,
            bar: { hello: 'world' },
        });
    });

    test('writes are written', () => {
        const simple = model({
            foo: 3,
        });
        simple.foo = 4;
        assert.is(simple.foo, 4);
    });

    test('Object.keys works as expected', () => {
        const simple = model<Record<string, any>>({});
        assert.arrayEqualsUnsorted([], Object.keys(simple));
        simple.foo = 'a';
        assert.arrayEqualsUnsorted(['foo'], Object.keys(simple));
        simple.bar = 'a';
        assert.arrayEqualsUnsorted(['foo', 'bar'], Object.keys(simple));
        simple.foo = 'b';
        assert.arrayEqualsUnsorted(['foo', 'bar'], Object.keys(simple));
        delete simple.bar;
        assert.arrayEqualsUnsorted(['foo'], Object.keys(simple));
    });

    test('model.field produces a readonly field for a model', () => {
        const x = model({ foo: 'bar' });
        const foo = model.field(x, 'foo');
        assert.is('bar', foo?.get());
        x.foo = 'baz';
        assert.is('baz', foo?.get());
        assert.is('baz', x.foo);
        foo?.set('bum');
        assert.is('bum', foo?.get());
        assert.is('bum', x.foo);
    });

    test('model.subscribe subscribes to model changes', () => {
        const m = model<{ state: number }>({
            state: 0,
        });
        const log: any[] = [];
        const sub = model.subscribe(m, (events) => log.push(...events));
        assert.deepEqual([{ type: 'set', prop: 'state', value: 0 }], log);
        flush();
        m.state += 1;
        flush();
        assert.deepEqual(
            [
                { type: 'set', prop: 'state', value: 0 },
                {
                    type: 'set',
                    prop: 'state',
                    value: 1,
                },
            ],
            log
        );
        sub();
        m.state += 1;
        flush();
        assert.deepEqual(
            [
                { type: 'set', prop: 'state', value: 0 },
                {
                    type: 'set',
                    prop: 'state',
                    value: 1,
                },
            ],
            log
        );
    });
});
