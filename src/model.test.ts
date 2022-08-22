import { suite, test, assert, beforeEach } from '@srhazi/gooey-test';
import { model } from './model';
import { retain, release, reset, flush, subscribe } from './engine';

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

    test('model.keys produces view of keys', () => {
        const simple = model<Record<string, any>>({}, 'model');
        const keys = model.keys(simple);
        retain(keys);
        assert.arrayEqualsUnsorted([], keys);
        simple.foo = 'a';
        flush();
        assert.arrayEqualsUnsorted(['foo'], keys);
        simple.bar = 'a';
        flush();
        assert.arrayEqualsUnsorted(['foo', 'bar'], keys);
        simple.foo = 'b';
        flush();
        assert.arrayEqualsUnsorted(['foo', 'bar'], keys);
        delete simple.bar;
        flush();
        assert.arrayEqualsUnsorted(['foo'], keys);
        release(keys);
    });

    test('model.keys mapped view handles delete', () => {
        const simple = model<Record<string, any>>({}, 'model');
        const keys = model.keys(simple);
        const caps = keys
            .filterView((key) => key.startsWith('b'))
            .mapView((key) => key.toUpperCase());
        retain(keys);
        retain(caps);
        assert.arrayEqualsUnsorted([], keys);
        assert.arrayEqualsUnsorted([], caps);
        simple.foo = 'a';
        flush();
        assert.arrayEqualsUnsorted(['foo'], keys);
        assert.arrayEqualsUnsorted([], caps);
        simple.bar = 'a';
        flush();
        assert.arrayEqualsUnsorted(['foo', 'bar'], keys);
        assert.arrayEqualsUnsorted(['BAR'], caps);
        simple.foo = 'b';
        flush();
        assert.arrayEqualsUnsorted(['foo', 'bar'], keys);
        assert.arrayEqualsUnsorted(['BAR'], caps);
        delete simple.bar;
        flush();
        assert.arrayEqualsUnsorted(['foo'], keys);
        assert.arrayEqualsUnsorted([], caps);
        release(keys);
    });

    test('model.keys waits for flush', () => {
        const simple = model<Record<string, any>>({});
        const keys = model.keys(simple);
        retain(keys);
        assert.arrayEqualsUnsorted([], keys);
        simple.foo = 'a';
        assert.arrayEqualsUnsorted([], keys);
        simple.bar = 'a';
        assert.arrayEqualsUnsorted([], keys);
        simple.foo = 'b';
        assert.arrayEqualsUnsorted([], keys);
        delete simple.bar;
        assert.arrayEqualsUnsorted([], keys);
        flush();
        assert.arrayEqualsUnsorted(['foo'], keys);
        release(keys);
    });

    test('model.keys does nothing after release', () => {
        const simple = model<Record<string, any>>({});
        const keys = model.keys(simple);
        retain(keys);
        assert.arrayEqualsUnsorted([], keys);
        simple.foo = 'a';
        flush();
        assert.arrayEqualsUnsorted(['foo'], keys);
        simple.bar = 'a';
        flush();
        assert.arrayEqualsUnsorted(['foo', 'bar'], keys);
        release(keys);

        simple.baz = 'new';
        delete simple.foo;
        assert.arrayEqualsUnsorted(['foo', 'bar'], keys);
        flush();
        assert.arrayEqualsUnsorted(['foo', 'bar'], keys);
    });

    test('model.keys obeys subscription logic/notification', () => {
        const simple = model<Record<string, any>>({});
        simple.before = 'before';
        const keys = model.keys(simple);
        retain(keys);
        simple.after = 'after';

        assert.arrayEqualsUnsorted(['before'], keys);

        flush();

        simple.afterFlush = 'afterFlush';
        assert.arrayEqualsUnsorted(['before', 'after'], keys);

        flush();

        assert.arrayEqualsUnsorted(['before', 'after', 'afterFlush'], keys);
        release(keys);
    });
});
