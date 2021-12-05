import { suite, test, assert } from './test';
import { model } from './model';
import { flush, retain, release } from './calc';

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
        simple.foo = 'b';
        flush();
        assert.arrayEqualsUnsorted(['foo', 'bar'], keys);
        delete simple.bar;
        flush();
        assert.arrayEqualsUnsorted(['foo'], keys);
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
        flush(); // TODO: should this be necessary? we flush first, then GC. Should we GC first then flush?

        simple.baz = 'new';
        delete simple.foo;
        assert.arrayEqualsUnsorted(['foo', 'bar'], keys);
        flush();
        assert.arrayEqualsUnsorted(['foo', 'bar'], keys);
    });
});