import Revise, { reset, mount, calc, model, collection, flush, } from './index';
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
        mount(testRoot, Revise("div", { id: "ok" }, calc(() => 'hello')));
        assert.deepEqual(testRoot.querySelector('#ok').childNodes[0].data, 'hello');
    });
    test('renders attribute calculations as their raw value', () => {
        mount(testRoot, Revise("div", { id: "ok", "data-whatever": calc(() => 'hello') }));
        assert.deepEqual(testRoot.querySelector('#ok').getAttribute('data-whatever'), 'hello');
    });
    test('rerenders child calculations on flush', () => {
        const state = model({ value: 'hello' });
        mount(testRoot, Revise("div", { id: "ok" }, calc(() => state.value)));
        state.value = 'goodbye';
        assert.deepEqual(testRoot.querySelector('#ok').childNodes[0].data, 'hello');
        flush();
        assert.deepEqual(testRoot.querySelector('#ok').childNodes[0].data, 'goodbye');
    });
    test('rerenders attribute calculations on flush', () => {
        const state = model({ value: 'hello' });
        mount(testRoot, Revise("div", { id: "ok", "data-value": calc(() => state.value) }));
        state.value = 'goodbye';
        assert.deepEqual(testRoot.querySelector('#ok').getAttribute('data-value'), 'hello');
        flush();
        assert.deepEqual(testRoot.querySelector('#ok').getAttribute('data-value'), 'goodbye');
    });
    test('child rerenders do not change DOM node reference', () => {
        const state = model({ value: 'hello' });
        mount(testRoot, Revise("div", { id: "ok" }, calc(() => state.value)));
        state.value = 'goodbye';
        const okBefore = testRoot.querySelector('#ok');
        flush();
        const okAfter = testRoot.querySelector('#ok');
        assert.is(okBefore, okAfter);
    });
    test('attribute rerenders do not change DOM node reference', () => {
        const state = model({ value: 'hello' });
        mount(testRoot, Revise("div", { id: "ok", "data-value": calc(() => state.value) }));
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
            "Hello ",
            calc(() => state.name)));
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
            return Revise("p", { id: "p" },
                "Hello ",
                calc(() => state.name));
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
    test('components are provided an onMount callback which is called immediately after mounted', () => {
        const sequence = [];
        let queried = null;
        const Greet = (props, { onMount }) => {
            sequence.push('render');
            onMount(() => {
                sequence.push('onMount');
                queried = testRoot.querySelector('#p');
            });
            return Revise("p", { id: "p" }, "Hello!");
        };
        mount(testRoot, Revise(Greet, null));
        assert.deepEqual(['render', 'onMount'], sequence);
        assert.isTruthy(queried);
        assert.is(testRoot.querySelector('#p'), queried);
    });
    test('components are provided an onMount callback which is called immediately before unmount', () => {
        const state = model({
            showingChild: false,
        });
        const sequence = [];
        let queried = null;
        const Child = (props, { onMount, onUnmount }) => {
            sequence.push('render');
            onMount(() => {
                sequence.push('onMount');
            });
            onUnmount(() => {
                queried = testRoot.querySelector('#child');
                sequence.push('onUnmount');
            });
            return Revise("p", { id: "child" }, "child");
        };
        const Parent = (props, { onMount }) => {
            return (Revise("div", { id: "parent" }, calc(() => state.showingChild && Revise(Child, null))));
        };
        mount(testRoot, Revise(Parent, null));
        assert.deepEqual([], sequence);
        state.showingChild = true;
        flush();
        assert.deepEqual(['render', 'onMount'], sequence);
        const child = testRoot.querySelector('#child');
        state.showingChild = false;
        flush();
        assert.deepEqual(['render', 'onMount', 'onUnmount'], sequence);
        assert.isTruthy(queried);
        assert.is(child, queried);
    });
    test('components are provided an onEffect callback which is called only while component is mounted', () => {
        const state = model({
            showingChild: false,
            counter: 0,
        });
        const sequence = [];
        const Child = (props, { onMount, onUnmount, onEffect }) => {
            sequence.push('render');
            onMount(() => {
                sequence.push('onMount');
            });
            onUnmount(() => {
                sequence.push('onUnmount');
            });
            onEffect(() => {
                sequence.push(`effect ${state.counter}`);
            });
            return Revise("p", { id: "child" }, "child");
        };
        const Parent = (props, { onMount }) => {
            return (Revise("div", { id: "parent" }, calc(() => state.showingChild && Revise(Child, null))));
        };
        mount(testRoot, Revise(Parent, null));
        assert.deepEqual([], sequence);
        state.showingChild = true;
        flush();
        assert.deepEqual(['render', 'onMount', 'effect 0'], sequence);
        state.counter += 1;
        flush();
        assert.deepEqual(['render', 'onMount', 'effect 0', 'effect 1'], sequence);
        state.counter += 1;
        flush();
        assert.deepEqual(['render', 'onMount', 'effect 0', 'effect 1', 'effect 2'], sequence);
        flush();
        assert.deepEqual(['render', 'onMount', 'effect 0', 'effect 1', 'effect 2'], sequence);
        state.showingChild = false;
        flush();
        assert.deepEqual([
            'render',
            'onMount',
            'effect 0',
            'effect 1',
            'effect 2',
            'onUnmount',
        ], sequence);
        state.counter += 1;
        flush();
        assert.deepEqual([
            'render',
            'onMount',
            'effect 0',
            'effect 1',
            'effect 2',
            'onUnmount',
        ], sequence);
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
            calc(() => items.map((item) => item)),
            calc(() => items.map((item) => item))));
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
            calc(() => items.map((item, idx) => `A:${item}:${idx} `)),
            "bar",
            calc(() => items.map((item, idx) => `B:${item}:${idx} `)),
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
            calc(() => items.map((count) => {
                const array = [];
                for (let i = 0; i < count; ++i) {
                    array.push(`A:${i + 1}/${count}`);
                }
                return array;
            })),
            "bar",
            calc(() => items.map((count) => {
                const array = [];
                for (let i = 0; i < count; ++i) {
                    array.push(`B:${i + 1}/${count}`);
                }
                return array;
            })),
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