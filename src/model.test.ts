import { suite, test, assert, beforeEach } from '@srhazi/gooey-test';
import { model } from './model';
import { reset, subscribe } from './engine';

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
        const foo2 = model.field(x, 'foo');
        assert.is(foo, foo2);
        assert.is('bar', foo?.get());
        x.foo = 'baz';
        assert.is('baz', foo?.get());
        assert.is('baz', x.foo);
        foo?.set('bum');
        assert.is('bum', foo?.get());
        assert.is('bum', x.foo);
    });
});
