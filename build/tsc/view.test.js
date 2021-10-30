import Revise, { reset, mount, calc, model, collection, flush, name, } from './index';
import * as log from './log';
import { suite, test, beforeEach, assert } from './test';
const testRoot = document.getElementById('test-root');
if (!testRoot)
    throw new Error('oops');
log.setLogLevel('debug');
beforeEach(() => {
    reset();
});
suite('mount static', () => {
    test('mount renders jsx as html', () => {
        mount(testRoot, Revise("div", { id: "ok" }, "Hello, world!"));
        assert.is(testRoot.querySelector('#ok').textContent, 'Hello, world!');
    });
    [undefined, null, false, true].forEach((value) => {
        test(`mount renders jsx ${value} as nonexistent nodes`, () => {
            mount(testRoot, Revise("div", { id: "ok" }, value));
            assert.deepEqual(Array.from(testRoot.querySelector('#ok').childNodes), []);
        });
    });
    test('mount renders jsx functions as nonexistent nodes', () => {
        mount(testRoot, Revise("div", { id: "ok" }, () => 'hello'));
        assert.deepEqual(Array.from(testRoot.querySelector('#ok').childNodes), []);
    });
    test('mount renders jsx numbers as strings', () => {
        mount(testRoot, Revise("div", { id: "ok" }, 0));
        assert.deepEqual(testRoot.querySelector('#ok').childNodes[0].data, '0');
    });
    test('mount renders jsx strings as strings', () => {
        mount(testRoot, Revise("div", { id: "ok" }, 'hello'));
        assert.deepEqual(testRoot.querySelector('#ok').childNodes[0].data, 'hello');
    });
    test('mount renders jsx arrays as contents', () => {
        mount(testRoot, Revise("div", { id: "ok" }, [
            'zero',
            undefined,
            1,
            null,
            'two',
            false,
            3,
            true,
            'four',
            () => 3,
            5,
        ]));
        assert.deepEqual(Array.from(testRoot.querySelector('#ok').childNodes).map((text) => text.data), ['zero', '1', 'two', '3', 'four', '5']);
    });
});
suite('mount calculations', () => {
    test('renders child calculations as their raw value', () => {
        mount(testRoot, Revise("div", { id: "ok" }, name(calc(() => 'hello'), 'hello-test')));
        assert.deepEqual(testRoot.querySelector('#ok').childNodes[0].data, 'hello');
    });
    test('renders attribute calculations as their raw value', () => {
        mount(testRoot, Revise("div", { id: "ok", "data-whatever": name(calc(() => 'hello'), 'hello-test') }));
        assert.deepEqual(testRoot.querySelector('#ok').getAttribute('data-whatever'), 'hello');
    });
    test('rerenders child calculations on flush', () => {
        const state = name(model({ value: 'hello' }), 'state');
        mount(testRoot, Revise("div", { id: "ok" }, name(calc(() => state.value), 'hello-test')));
        state.value = 'goodbye';
        assert.deepEqual(testRoot.querySelector('#ok').childNodes[0].data, 'hello');
        flush();
        assert.deepEqual(testRoot.querySelector('#ok').childNodes[0].data, 'goodbye');
    });
    test('rerenders attribute calculations on flush', () => {
        const state = model({ value: 'hello' });
        mount(testRoot, Revise("div", { id: "ok", "data-value": name(calc(() => state.value), 'hello-test') }));
        state.value = 'goodbye';
        assert.deepEqual(testRoot.querySelector('#ok').getAttribute('data-value'), 'hello');
        flush();
        assert.deepEqual(testRoot.querySelector('#ok').getAttribute('data-value'), 'goodbye');
    });
    test('child rerenders do not change DOM node reference', () => {
        const state = model({ value: 'hello' });
        mount(testRoot, Revise("div", { id: "ok" }, name(calc(() => state.value), 'hello-test')));
        state.value = 'goodbye';
        const okBefore = testRoot.querySelector('#ok');
        flush();
        const okAfter = testRoot.querySelector('#ok');
        assert.is(okBefore, okAfter);
    });
    test('attribute rerenders do not change DOM node reference', () => {
        const state = model({ value: 'hello' });
        mount(testRoot, Revise("div", { id: "ok", "data-value": name(calc(() => state.value), 'hello-test') }));
        state.value = 'goodbye';
        const okBefore = testRoot.querySelector('#ok');
        flush();
        const okAfter = testRoot.querySelector('#ok');
        assert.is(okBefore, okAfter);
    });
});
suite('mount components', () => {
    test('components are rendered', () => {
        const Greet = ({ name }) => (Revise("p", null,
            "Hello ",
            name));
        mount(testRoot, Revise(Greet, { name: "world!" }));
        assert.is(testRoot.innerHTML, '<p>Hello world!</p>');
    });
    test('components can have calculations', () => {
        const state = model({
            name: 'world',
        });
        const Greet = () => (Revise("p", null,
            "Hello",
            ' ',
            name(calc(() => state.name), 'hello-test')));
        mount(testRoot, Revise(Greet, null));
        assert.is(testRoot.innerHTML, '<p>Hello world</p>');
        state.name = 'there';
        flush();
        assert.is(testRoot.innerHTML, '<p>Hello there</p>');
    });
    test('components are themselves calculations and rerender upon dependency change', () => {
        const state = model({
            name: 'world',
        });
        const Greet = () => {
            const exclaimed = state.name + '!';
            return Revise("p", null,
                "Hello ",
                exclaimed);
        };
        mount(testRoot, Revise(Greet, null));
        assert.is(testRoot.innerHTML, '<p>Hello world!</p>');
        state.name = 'there';
        flush();
        assert.is(testRoot.innerHTML, '<p>Hello there!</p>');
    });
    test('components with calculations do not change roots', () => {
        const state = model({
            name: 'world',
        });
        const Greet = () => {
            return (Revise("p", { id: "p" },
                "Hello",
                ' ',
                name(calc(() => state.name), 'hello-test')));
        };
        mount(testRoot, Revise(Greet, null));
        const pBefore = testRoot.querySelector('#p');
        state.name = 'there';
        flush();
        const pAfter = testRoot.querySelector('#p');
        assert.is(pBefore, pAfter);
    });
    test('components without calculations that rerender *do* change roots', () => {
        const state = model({
            name: 'world',
        });
        const Greet = () => {
            const exclaimed = state.name + '!';
            return Revise("p", { id: "p" },
                "Hello ",
                exclaimed);
        };
        mount(testRoot, Revise(Greet, null));
        const pBefore = testRoot.querySelector('#p');
        state.name = 'there';
        flush();
        const pAfter = testRoot.querySelector('#p');
        assert.isNot(pBefore, pAfter);
    });
});
suite('mount arrays', () => {
    test('mapping multiple arrays in a row concats as expected', () => {
        const items = collection([
            'A',
            'is',
            'the',
            'only',
            'thing',
            'unless',
            'letters',
            'continue',
        ]);
        mount(testRoot, Revise("div", null,
            name(calc(() => items.map((item) => item)), 'arr-1'),
            name(calc(() => items.map((item) => item)), 'arr-2')));
        assert.deepEqual(Array.from(testRoot.querySelector('div').childNodes).map((item) => item.data), [
            'A',
            'is',
            'the',
            'only',
            'thing',
            'unless',
            'letters',
            'continue',
            'A',
            'is',
            'the',
            'only',
            'thing',
            'unless',
            'letters',
            'continue',
        ]);
    });
    test('rerendering multiple arrays in a row concats as expected', () => {
        const items = collection([
            'A',
            'is',
            'the',
            'only',
            'thing',
            'unless',
            'letters',
            'continue',
        ]);
        mount(testRoot, Revise("div", null,
            "foo",
            name(calc(() => items.map((item, idx) => `A:${item}:${idx} `)), 'arr-1'),
            "bar",
            name(calc(() => items.map((item, idx) => `B:${item}:${idx} `)), 'arr-2'),
            "baz"));
        items[3] = 'best';
        items[6] = 'not';
        items.shift();
        items.pop();
        flush();
        assert.deepEqual(Array.from(testRoot.querySelector('div').childNodes).map((item) => item.data), [
            'foo',
            'A:is:0 ',
            'A:the:1 ',
            'A:best:2 ',
            'A:thing:3 ',
            'A:unless:4 ',
            'A:not:5 ',
            'bar',
            'B:is:0 ',
            'B:the:1 ',
            'B:best:2 ',
            'B:thing:3 ',
            'B:unless:4 ',
            'B:not:5 ',
            'baz',
        ]);
    });
    test('arrays can be nested and concatted as as expected', () => {
        const items = collection([1, 2, 3]);
        mount(testRoot, Revise("div", null,
            "foo",
            name(calc(() => items.map((count) => {
                const array = [];
                for (let i = 0; i < count; ++i) {
                    array.push(`A:${i + 1}/${count}`);
                }
                return array;
            })), 'arr-1'),
            "bar",
            name(calc(() => items.map((count) => {
                const array = [];
                for (let i = 0; i < count; ++i) {
                    array.push(`B:${i + 1}/${count}`);
                }
                return array;
            })), 'arr-2'),
            "baz"));
        assert.deepEqual(Array.from(testRoot.querySelector('div').childNodes).map((item) => item.data), [
            'foo',
            'A:1/1',
            'A:1/2',
            'A:2/2',
            'A:1/3',
            'A:2/3',
            'A:3/3',
            'bar',
            'B:1/1',
            'B:1/2',
            'B:2/2',
            'B:1/3',
            'B:2/3',
            'B:3/3',
            'baz',
        ]);
        items[0] = 3;
        items.push(4);
        flush();
        assert.deepEqual(Array.from(testRoot.querySelector('div').childNodes).map((item) => item.data), [
            'foo',
            'A:1/3',
            'A:2/3',
            'A:3/3',
            'A:1/2',
            'A:2/2',
            'A:1/3',
            'A:2/3',
            'A:3/3',
            'A:1/4',
            'A:2/4',
            'A:3/4',
            'A:4/4',
            'bar',
            'B:1/3',
            'B:2/3',
            'B:3/3',
            'B:1/2',
            'B:2/2',
            'B:1/3',
            'B:2/3',
            'B:3/3',
            'B:1/4',
            'B:2/4',
            'B:3/4',
            'B:4/4',
            'baz',
        ]);
    });
});
//# sourceMappingURL=view.test.js.map