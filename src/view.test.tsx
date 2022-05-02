import Gooey, {
    Component,
    calc,
    ref,
    collection,
    flush,
    model,
    mount,
    reset,
    createContext,
    subscribe,
} from './index';
import { suite, test, beforeEach, assert } from '@srhazi/gooey-test';

let testRoot: HTMLElement = document.getElementById('test-root')!;

beforeEach(() => {
    testRoot = document.getElementById('test-root')!;
    subscribe();
    reset();
});

suite('mount static', () => {
    test('mount renders jsx as html', () => {
        mount(testRoot, <div id="ok">Hello, world!</div>);
        assert.is(testRoot.querySelector('#ok')!.textContent, 'Hello, world!');
    });

    test('mount can unmount jsx as html', () => {
        const unmount = mount(testRoot, <div id="ok">Hello, world!</div>);
        unmount();
        assert.is(null, testRoot.querySelector('#ok'));
    });

    [undefined, null, false, true].forEach((value) => {
        test(`mount renders jsx ${value} as nonexistent nodes`, () => {
            mount(testRoot, <div id="ok">{value}</div>);
            assert.deepEqual(
                Array.from(testRoot.querySelector('#ok')!.childNodes),
                []
            );
        });
    });

    test('mount renders jsx functions as nonexistent nodes', () => {
        mount(testRoot, <div id="ok">{() => 'hello'}</div>);
        assert.deepEqual(
            Array.from(testRoot.querySelector('#ok')!.childNodes),
            []
        );
    });

    test('mount renders jsx numbers as strings', () => {
        mount(testRoot, <div id="ok">{0}</div>);
        assert.deepEqual(
            (testRoot.querySelector('#ok')!.childNodes[0] as Text).data,
            '0'
        );
    });

    test('mount renders jsx strings as strings', () => {
        mount(testRoot, <div id="ok">{'hello'}</div>);
        assert.deepEqual(
            (testRoot.querySelector('#ok')!.childNodes[0] as Text).data,
            'hello'
        );
    });

    test('mount renders jsx arrays as contents', () => {
        mount(
            testRoot,
            <div id="ok">
                {[
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
                ]}
            </div>
        );
        assert.deepEqual(
            (
                Array.from(testRoot.querySelector('#ok')!.childNodes) as Text[]
            ).map((text: Text) => text.data),
            ['zero', '1', 'two', '3', 'four', '5']
        );
    });
});

suite('mount calculations', () => {
    test('renders child calculations as their raw value', () => {
        mount(testRoot, <div id="ok">{calc(() => 'hello')}</div>);
        assert.deepEqual(
            (testRoot.querySelector('#ok')!.childNodes[0] as Text).data,
            'hello'
        );
    });

    test('renders attribute calculations as their raw value', () => {
        mount(testRoot, <div id="ok" data-whatever={calc(() => 'hello')} />);
        assert.deepEqual(
            testRoot.querySelector('#ok')!.getAttribute('data-whatever'),
            'hello'
        );
    });

    test('rerenders child calculations on flush', () => {
        const state = model({ value: 'hello' });
        mount(testRoot, <div id="ok">{calc(() => state.value)}</div>);
        state.value = 'goodbye';

        assert.deepEqual(
            (testRoot.querySelector('#ok')!.childNodes[0] as Text).data,
            'hello'
        );

        flush();

        assert.deepEqual(
            (testRoot.querySelector('#ok')!.childNodes[0] as Text).data,
            'goodbye'
        );
    });

    test('rerenders attribute calculations on flush', () => {
        const state = model({ value: 'hello' });
        mount(testRoot, <div id="ok" data-value={calc(() => state.value)} />);
        state.value = 'goodbye';

        assert.deepEqual(
            testRoot.querySelector('#ok')!.getAttribute('data-value'),
            'hello'
        );

        flush();

        assert.deepEqual(
            testRoot.querySelector('#ok')!.getAttribute('data-value'),
            'goodbye'
        );
    });

    test('child rerenders do not change DOM node reference', () => {
        const state = model({ value: 'hello' });
        mount(testRoot, <div id="ok">{calc(() => state.value)}</div>);
        state.value = 'goodbye';

        const okBefore = testRoot.querySelector('#ok');
        flush();
        const okAfter = testRoot.querySelector('#ok');

        assert.is(okBefore, okAfter);
    });

    test('attribute rerenders do not change DOM node reference', () => {
        const state = model({ value: 'hello' });
        mount(testRoot, <div id="ok" data-value={calc(() => state.value)} />);
        state.value = 'goodbye';

        const okBefore = testRoot.querySelector('#ok');
        flush();
        const okAfter = testRoot.querySelector('#ok');

        assert.is(okBefore, okAfter);
    });
});

suite('mount components', () => {
    test('components are rendered', () => {
        const Greet: Component<{ name: string }> = ({ name }) => (
            <p>Hello {name}</p>
        );
        mount(testRoot, <Greet name="world!" />);
        assert.is(testRoot.innerHTML, '<p>Hello world!</p>');
    });

    test('components can have calculations', () => {
        const state = model({
            name: 'world',
        });
        const Greet: Component<{}> = () => (
            <p>Hello {calc(() => state.name)}</p>
        );
        mount(testRoot, <Greet />);

        assert.is(testRoot.innerHTML, '<p>Hello world</p>');

        state.name = 'there';
        flush();

        assert.is(testRoot.innerHTML, '<p>Hello there</p>');
    });

    test('components with calculations do not change roots', () => {
        const state = model({
            name: 'world',
        });
        const Greet: Component<{}> = () => {
            return <p id="p">Hello {calc(() => state.name)}</p>;
        };
        mount(testRoot, <Greet />);

        const pBefore = testRoot.querySelector('#p');

        state.name = 'there';
        flush();

        const pAfter = testRoot.querySelector('#p');

        assert.is(pBefore, pAfter);
    });

    test('components without calculations that read model data *do not* rerender', () => {
        const state = model({
            name: 'world',
        });
        const Greet: Component<{}> = () => {
            const exclaimed = state.name + '!';
            return <p id="p">Hello {exclaimed}</p>;
        };
        mount(testRoot, <Greet />);

        const pBefore = testRoot.querySelector('#p');

        state.name = 'there';
        flush();

        const pAfter = testRoot.querySelector('#p');

        assert.is(pBefore, pAfter);
        assert.is('Hello world!', pAfter?.textContent);
    });

    test('components are provided an onMount callback which is called immediately after mounted', () => {
        const sequence: string[] = [];
        let queried: null | Element = null;
        const Greet: Component<{}> = (props, { onMount }) => {
            sequence.push('render');
            onMount(() => {
                sequence.push('onMount');
                queried = testRoot.querySelector('#p');
            });
            return <p id="p">Hello!</p>;
        };

        mount(testRoot, <Greet />);

        assert.deepEqual(['render', 'onMount'], sequence);
        assert.isTruthy(queried);
        assert.is(testRoot.querySelector('#p'), queried);
    });

    test('components are provided an onUnmount callback which is called immediately before unmount', () => {
        const state = model({
            showingChild: false,
        });
        const sequence: string[] = [];
        let queried: null | Element = null;
        const Child: Component<{}> = (props, { onMount, onUnmount }) => {
            sequence.push('render');
            onMount(() => {
                sequence.push('onMount');
            });
            onUnmount(() => {
                queried = testRoot.querySelector('#child');
                sequence.push('onUnmount');
            });
            return <p id="child">child</p>;
        };
        const Parent: Component<{}> = (props, { onMount }) => {
            return (
                <div id="parent">
                    {calc(() => state.showingChild && <Child />)}
                </div>
            );
        };

        mount(testRoot, <Parent />);

        assert.isTruthy(testRoot.querySelector('#parent'));
        assert.isFalsy(testRoot.querySelector('#child'));
        assert.deepEqual([], sequence);

        state.showingChild = true;
        flush();

        assert.isTruthy(testRoot.querySelector('#parent'));
        assert.isTruthy(testRoot.querySelector('#child'));
        assert.deepEqual(['render', 'onMount'], sequence);
        const child = testRoot.querySelector('#child');

        state.showingChild = false;
        flush();

        assert.deepEqual(['render', 'onMount', 'onUnmount'], sequence);
        assert.isTruthy(testRoot.querySelector('#parent'));
        assert.isFalsy(testRoot.querySelector('#child'));
        assert.isTruthy(queried);
        assert.is(child, queried);
    });

    test('components are provided an onEffect callback which is called only while component is mounted', () => {
        const state = model({
            showingChild: false,
            counter: 0,
        });
        const sequence: string[] = [];
        const Child: Component<{}> = (
            props,
            { onMount, onUnmount, onEffect }
        ) => {
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
            return <p id="child">child</p>;
        };
        const Parent: Component<{}> = (props, { onMount }) => {
            return (
                <div id="parent">
                    {calc(() => state.showingChild && <Child />)}
                </div>
            );
        };

        mount(testRoot, <Parent />);

        assert.deepEqual([], sequence);

        state.showingChild = true;
        flush();

        assert.deepEqual(['render', 'onMount', 'effect 0'], sequence);

        state.counter += 1;
        flush();

        assert.deepEqual(
            ['render', 'onMount', 'effect 0', 'effect 1'],
            sequence
        );
        state.counter += 1;
        flush();

        assert.deepEqual(
            ['render', 'onMount', 'effect 0', 'effect 1', 'effect 2'],
            sequence
        );
        flush();
        assert.deepEqual(
            ['render', 'onMount', 'effect 0', 'effect 1', 'effect 2'],
            sequence
        );

        state.showingChild = false;
        flush();

        assert.deepEqual(
            [
                'render',
                'onMount',
                'effect 0',
                'effect 1',
                'effect 2',
                'onUnmount',
            ],
            sequence
        );

        state.counter += 1;
        flush();

        assert.deepEqual(
            [
                'render',
                'onMount',
                'effect 0',
                'effect 1',
                'effect 2',
                'onUnmount',
            ],
            sequence
        );
    });

    test('the children prop is a non-array single value when components receive a single child', () => {
        const Parent: Component<{ children: (val: string) => string }> = ({
            children,
        }) => <div id="parent">{children('hello')}</div>;
        mount(testRoot, <Parent>{(str: string) => str.toUpperCase()}</Parent>);
        assert.is('HELLO', testRoot.querySelector('#parent')?.textContent);
    });

    test('the children prop is an array of values when components receive multiple children', () => {
        const Parent: Component<{ children: ((val: string) => string)[] }> = ({
            children,
        }) => <div id="parent">{children.map((child) => child('hello'))}</div>;
        mount(
            testRoot,
            <Parent>
                {(str: string) => str.toUpperCase()}
                {(str: string) => `(${str}!)`}
            </Parent>
        );
        assert.is(
            'HELLO(hello!)',
            testRoot.querySelector('#parent')?.textContent
        );
    });

    test('the children prop is undefined when components receive no children', () => {
        const Parent: Component<{ children?: ((val: string) => string)[] }> = ({
            children,
        }) => (
            <div id="parent">
                {children === undefined ? 'empty' : 'non-empty'}
            </div>
        );
        mount(testRoot, <Parent />);
        assert.is('empty', testRoot.querySelector('#parent')?.textContent);
    });

    test('onEffect is called *after* mounted calculations are updated', () => {
        const operations: string[] = [];
        const data = model({
            value: 'before',
        });
        const Child: Component<{}> = (_props, { onMount, onEffect }) => {
            const divRef = ref<HTMLDivElement>();

            onEffect(() => {
                operations.push(
                    `child:onEffect1:${data.value}:${
                        divRef.current!.textContent
                    }`
                );
            });

            return (
                <div ref={divRef}>
                    {calc(() => {
                        operations.push(`child:calc1:${data.value}`);
                        return data.value;
                    })}
                </div>
            );
        };

        mount(testRoot, <Child />);
        data.value = 'after';
        flush();

        assert.deepEqual(
            [
                'child:calc1:before',
                'child:onEffect1:before:before',
                'child:calc1:after',
                'child:onEffect1:after:after',
            ],
            operations
        );
    });

    test('onUnmount called in correct order (children before parent) when entire tree is unmounted', () => {
        const sequence: string[] = [];
        const Grandchild: Component<{ name: string }> = (
            { name },
            { onMount, onUnmount }
        ) => {
            sequence.push(`render ${name}`);
            onMount(() => {
                sequence.push(`onMount ${name}`);
            });
            onUnmount(() => {
                sequence.push(`onUnmount ${name}`);
            });
            return <p class="grandchild">{name}</p>;
        };
        const Child: Component<{ name: string }> = (
            { name },
            { onMount, onUnmount }
        ) => {
            sequence.push(`render ${name}`);
            onMount(() => {
                sequence.push(`onMount ${name}`);
            });
            onUnmount(() => {
                sequence.push(`onUnmount ${name}`);
            });
            return (
                <p class="child">
                    <Grandchild name={`${name} 1`} />
                    <Grandchild name={`${name} 2`} />
                </p>
            );
        };
        const Parent: Component<{}> = (props, { onMount }) => {
            return (
                <div id="parent">
                    <Child name="a" />
                    <Child name="b" />
                </div>
            );
        };

        const unmount = mount(testRoot, <Parent />);

        assert.deepEqual(
            [
                'render a',
                'render a 1',
                'render a 2',
                'render b',
                'render b 1',
                'render b 2',
                'onMount a 1',
                'onMount a 2',
                'onMount a',
                'onMount b 1',
                'onMount b 2',
                'onMount b',
            ],
            sequence
        );

        // clear sequence
        sequence.splice(0, sequence.length);

        unmount();

        assert.deepEqual(
            [
                'onUnmount a 1',
                'onUnmount a 2',
                'onUnmount a',
                'onUnmount b 1',
                'onUnmount b 2',
                'onUnmount b',
            ],
            sequence
        );
    });

    test('children can be rendered multiple times and act independently', () => {
        const calls: string[] = [];

        const data = model({
            a: false,
            b: false,
            c: false,
        });
        const Parent: Component<{ children: JSX.Element[] }> = (
            { children },
            { onMount, onUnmount }
        ) => {
            onMount(() => calls.push('parent:onMount'));
            onUnmount(() => calls.push('parent:onUnmount'));
            const x = (
                <div>
                    {calc(() => data.a && <div id="child-1">{children}</div>)}
                    {calc(() => data.b && <div id="child-2">{children}</div>)}
                    {calc(() => data.c && <div id="child-3">{children}</div>)}
                </div>
            );
            return x;
        };

        const Child: Component<{ name: string }> = (
            { name },
            { onMount, onUnmount }
        ) => {
            onMount(() => calls.push(`child:${name}:onMount`));
            onUnmount(() => calls.push(`child:${name}:onUnmount`));
            const state = model({ clicked: false });
            return (
                <button
                    data-name={name}
                    on:click={() => {
                        state.clicked = true;
                    }}
                >
                    {calc(() => (state.clicked ? 'clicked' : name))}
                </button>
            );
        };

        // Mount all items with no children passed
        const unmount = mount(
            testRoot,
            <Parent>
                <Child name="one" />
                <Child name="two" />
                <Child name="three" />
            </Parent>
        );

        assert.deepEqual(['parent:onMount'], calls);

        // Enable all children
        data.a = true;
        data.b = true;
        data.c = true;

        calls.splice(0, calls.length);
        flush();

        assert.deepEqual(
            [
                'child:one:onMount',
                'child:two:onMount',
                'child:three:onMount',
                'child:one:onMount',
                'child:two:onMount',
                'child:three:onMount',
                'child:one:onMount',
                'child:two:onMount',
                'child:three:onMount',
            ],
            calls
        );

        // Interact with the children in different ways
        testRoot
            .querySelector('#child-1 [data-name="one"]')
            ?.dispatchEvent(new MouseEvent('click'));
        testRoot
            .querySelector('#child-2 [data-name="two"]')
            ?.dispatchEvent(new MouseEvent('click'));
        testRoot
            .querySelector('#child-3 [data-name="three"]')
            ?.dispatchEvent(new MouseEvent('click'));
        flush();

        assert.deepEqual(
            [
                ['clicked', 'two', 'three'],
                ['one', 'clicked', 'three'],
                ['one', 'two', 'clicked'],
            ],
            [
                Array.from(testRoot.querySelectorAll('#child-1 button')).map(
                    (el) => el.textContent
                ),
                Array.from(testRoot.querySelectorAll('#child-2 button')).map(
                    (el) => el.textContent
                ),
                Array.from(testRoot.querySelectorAll('#child-3 button')).map(
                    (el) => el.textContent
                ),
            ]
        );

        // Unmount one child
        data.b = false;

        calls.splice(0, calls.length);
        flush();

        assert.deepEqual(
            [
                'child:one:onUnmount',
                'child:two:onUnmount',
                'child:three:onUnmount',
            ],
            calls
        );
        assert.deepEqual(
            [['clicked', 'two', 'three'], [], ['one', 'two', 'clicked']],
            [
                Array.from(testRoot.querySelectorAll('#child-1 button')).map(
                    (el) => el.textContent
                ),
                Array.from(testRoot.querySelectorAll('#child-2 button')).map(
                    (el) => el.textContent
                ),
                Array.from(testRoot.querySelectorAll('#child-3 button')).map(
                    (el) => el.textContent
                ),
            ]
        );

        // Unmount everything
        calls.splice(0, calls.length);
        unmount();

        assert.deepEqual(
            [
                'child:one:onUnmount',
                'child:two:onUnmount',
                'child:three:onUnmount',
                'child:one:onUnmount',
                'child:two:onUnmount',
                'child:three:onUnmount',
                'parent:onUnmount',
            ],
            calls
        );
    });

    test('children can read contexts correctly', () => {
        const Context = createContext('no-context');

        const Parent: Component<{ children?: JSX.Element[] }> = ({
            children,
        }) => {
            return (
                <div>
                    <div id="child-1">{children}</div>
                    <Context value="child-2">
                        <div id="child-2">{children}</div>
                    </Context>
                    <Context value="child-3">
                        <div id="child-3">{children}</div>
                    </Context>
                </div>
            );
        };

        const Child: Component<{ name: string }> = (
            { name },
            { getContext }
        ) => {
            const contextValue = getContext(Context);
            return (
                <p>
                    {contextValue}:{name}
                </p>
            );
        };

        // Mount all items with no children passed
        const unmount = mount(
            testRoot,
            <Parent>
                <Child name="one" />
                <Child name="two" />
            </Parent>
        );

        assert.deepEqual(
            [
                ['no-context:one', 'no-context:two'],
                ['child-2:one', 'child-2:two'],
                ['child-3:one', 'child-3:two'],
            ],
            [
                Array.from(testRoot.querySelectorAll('#child-1 p')).map(
                    (el) => el.textContent
                ),
                Array.from(testRoot.querySelectorAll('#child-2 p')).map(
                    (el) => el.textContent
                ),
                Array.from(testRoot.querySelectorAll('#child-3 p')).map(
                    (el) => el.textContent
                ),
            ]
        );

        unmount();
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
        mount(
            testRoot,
            <div>
                {calc(() => items.map((item) => item))}
                {calc(() => items.map((item) => item))}
            </div>
        );

        assert.deepEqual(
            (
                Array.from(testRoot.querySelector('div')!.childNodes) as Text[]
            ).map((item) => item.data),
            [
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
            ]
        );
    });

    test('mapping multiple arrays interspersed concats as expected', () => {
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

        mount(
            testRoot,
            <div>
                BEFORE
                {calc(() => items.map((item) => item))}
                MIDDLE
                {calc(() => items.map((item) => item))}
                AFTER
            </div>
        );

        assert.deepEqual(
            (
                Array.from(testRoot.querySelector('div')!.childNodes) as Text[]
            ).map((item) => item.data),
            [
                'BEFORE',
                'A',
                'is',
                'the',
                'only',
                'thing',
                'unless',
                'letters',
                'continue',
                'MIDDLE',
                'A',
                'is',
                'the',
                'only',
                'thing',
                'unless',
                'letters',
                'continue',
                'AFTER',
            ]
        );
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
        mount(
            testRoot,
            <div>
                foo
                {calc(() => items.map((item, idx) => `A:${item}:${idx} `))}
                bar
                {calc(() => items.map((item, idx) => `B:${item}:${idx} `))}
                baz
            </div>
        );

        items[3] = 'best';
        items[6] = 'not';
        items.shift();
        items.pop();

        flush();

        assert.deepEqual(
            (
                Array.from(testRoot.querySelector('div')!.childNodes) as Text[]
            ).map((item) => item.data),
            [
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
            ]
        );
    });

    test('arrays can be nested and concatted as as expected', () => {
        const items = collection([1, 2, 3]);
        mount(
            testRoot,
            <div>
                foo
                {calc(() =>
                    items.map((count) => {
                        const array: string[] = [];
                        for (let i = 0; i < count; ++i) {
                            array.push(`A:${i + 1}/${count}`);
                        }
                        return array;
                    })
                )}
                bar
                {calc(() =>
                    items.map((count) => {
                        const array: string[] = [];
                        for (let i = 0; i < count; ++i) {
                            array.push(`B:${i + 1}/${count}`);
                        }
                        return array;
                    })
                )}
                baz
            </div>
        );

        assert.deepEqual(
            (
                Array.from(testRoot.querySelector('div')!.childNodes) as Text[]
            ).map((item) => item.data),
            [
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
            ]
        );

        items[0] = 3;
        items.push(4);

        flush();

        assert.deepEqual(
            (
                Array.from(testRoot.querySelector('div')!.childNodes) as Text[]
            ).map((item) => item.data),
            [
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
            ]
        );
    });
});

suite('mount collection mapped view', () => {
    test('unmodified collection mapView nodes keep references', () => {
        const items = collection(['foo', 'bar', 'baz']);
        mount(
            testRoot,
            <div>
                {items.mapView((item) => (
                    <span data-item>{item}</span>
                ))}
            </div>
        );
        const origSet: Element[] = [].slice.call(
            testRoot.querySelectorAll('[data-item]')
        );
        origSet[0].setAttribute('tagged', 'yes 0');
        origSet[1].setAttribute('tagged', 'yes 1');
        origSet[2].setAttribute('tagged', 'yes 2');
        items.push('end');
        items.unshift('start');
        items.splice(2, 0, 'middle');
        // start foo middle bar baz end
        flush();
        const newSet: Element[] = [].slice.call(
            testRoot.querySelectorAll('[data-item]')
        );
        assert.is(null, newSet[0].getAttribute('tagged'));
        assert.is('yes 0', newSet[1].getAttribute('tagged'));
        assert.is(null, newSet[2].getAttribute('tagged'));
        assert.is('yes 1', newSet[3].getAttribute('tagged'));
        assert.is('yes 2', newSet[4].getAttribute('tagged'));
        assert.is(null, newSet[5].getAttribute('tagged'));
    });

    test('unmodified collection mapView nodes keep references when swapped', () => {
        const items = collection([
            'zero',
            'one',
            'two',
            'three',
            'four',
            'five',
        ]);
        const events: string[] = [];

        const Item: Component<{ item: string }> = (
            { item },
            { onMount, onUnmount }
        ) => {
            onMount(() => events.push(`mount:${item}`));
            onUnmount(() => events.push(`unmount:${item}`));
            return <span data-item>{item}</span>;
        };
        mount(
            testRoot,
            <div>
                {items.mapView((item) => (
                    <Item item={item} />
                ))}
            </div>
        );
        assert.deepEqual(
            [
                'mount:zero',
                'mount:one',
                'mount:two',
                'mount:three',
                'mount:four',
                'mount:five',
            ],
            events
        );
        const origSet: Element[] = [].slice.call(
            testRoot.querySelectorAll('[data-item]')
        );
        // zero one two three four five
        origSet[0].setAttribute('tagged', 'yes 0');
        origSet[1].setAttribute('tagged', 'yes 1');
        origSet[2].setAttribute('tagged', 'yes 2');
        origSet[3].setAttribute('tagged', 'yes 3');
        origSet[4].setAttribute('tagged', 'yes 4');
        origSet[5].setAttribute('tagged', 'yes 5');
        items.moveSlice(1, 2, 5);
        // one four two three five
        flush();
        const newSet: Element[] = [].slice.call(
            testRoot.querySelectorAll('[data-item]')
        );
        assert.is('yes 0', newSet[0].getAttribute('tagged'));
        assert.is('yes 3', newSet[1].getAttribute('tagged'));
        assert.is('yes 4', newSet[2].getAttribute('tagged'));
        assert.is('yes 1', newSet[3].getAttribute('tagged'));
        assert.is('yes 2', newSet[4].getAttribute('tagged'));
        assert.is('yes 5', newSet[5].getAttribute('tagged'));
        assert.deepEqual(
            [
                'mount:zero',
                'mount:one',
                'mount:two',
                'mount:three',
                'mount:four',
                'mount:five',
            ],
            events
        );
    });

    test('unmodified collection mapView nodes keep references when sorted', () => {
        const items = collection([
            'zero',
            'one',
            'two',
            'three',
            'four',
            'five',
        ]);
        const events: string[] = [];

        const Item: Component<{ item: string }> = (
            { item },
            { onMount, onUnmount }
        ) => {
            onMount(() => events.push(`mount:${item}`));
            onUnmount(() => events.push(`unmount:${item}`));
            return <span data-item>{item}</span>;
        };
        mount(
            testRoot,
            <div>
                {items.mapView((item) => (
                    <Item item={item} />
                ))}
            </div>
        );
        assert.deepEqual(
            [
                'mount:zero',
                'mount:one',
                'mount:two',
                'mount:three',
                'mount:four',
                'mount:five',
            ],
            events
        );
        const origSet: Element[] = [].slice.call(
            testRoot.querySelectorAll('[data-item]')
        );
        // zero one two three four five
        origSet[0].setAttribute('tagged', 'yes 0');
        origSet[1].setAttribute('tagged', 'yes 1');
        origSet[2].setAttribute('tagged', 'yes 2');
        origSet[3].setAttribute('tagged', 'yes 3');
        origSet[4].setAttribute('tagged', 'yes 4');
        origSet[5].setAttribute('tagged', 'yes 5');
        items.sort();
        // five four one three two zero
        flush();
        const newSet: Element[] = [].slice.call(
            testRoot.querySelectorAll('[data-item]')
        );
        assert.is('yes 5', newSet[0].getAttribute('tagged'));
        assert.is('yes 4', newSet[1].getAttribute('tagged'));
        assert.is('yes 1', newSet[2].getAttribute('tagged'));
        assert.is('yes 3', newSet[3].getAttribute('tagged'));
        assert.is('yes 2', newSet[4].getAttribute('tagged'));
        assert.is('yes 0', newSet[5].getAttribute('tagged'));
        assert.deepEqual(
            [
                'mount:zero',
                'mount:one',
                'mount:two',
                'mount:three',
                'mount:four',
                'mount:five',
            ],
            events
        );
    });

    test('unmodified collection mapView nodes keep references when reversed', () => {
        const items = collection([
            'zero',
            'one',
            'two',
            'three',
            'four',
            'five',
        ]);
        const events: string[] = [];

        const Item: Component<{ item: string }> = (
            { item },
            { onMount, onUnmount }
        ) => {
            onMount(() => events.push(`mount:${item}`));
            onUnmount(() => events.push(`unmount:${item}`));
            return <span data-item>{item}</span>;
        };
        mount(
            testRoot,
            <div>
                {items.mapView((item) => (
                    <Item item={item} />
                ))}
            </div>
        );
        assert.deepEqual(
            [
                'mount:zero',
                'mount:one',
                'mount:two',
                'mount:three',
                'mount:four',
                'mount:five',
            ],
            events
        );
        const origSet: Element[] = [].slice.call(
            testRoot.querySelectorAll('[data-item]')
        );
        // zero one two three four five
        origSet[0].setAttribute('tagged', 'yes 0');
        origSet[1].setAttribute('tagged', 'yes 1');
        origSet[2].setAttribute('tagged', 'yes 2');
        origSet[3].setAttribute('tagged', 'yes 3');
        origSet[4].setAttribute('tagged', 'yes 4');
        origSet[5].setAttribute('tagged', 'yes 5');
        items.reverse();
        // five four three two one zero
        flush();
        const newSet: Element[] = [].slice.call(
            testRoot.querySelectorAll('[data-item]')
        );
        assert.is('yes 5', newSet[0].getAttribute('tagged'));
        assert.is('yes 4', newSet[1].getAttribute('tagged'));
        assert.is('yes 3', newSet[2].getAttribute('tagged'));
        assert.is('yes 2', newSet[3].getAttribute('tagged'));
        assert.is('yes 1', newSet[4].getAttribute('tagged'));
        assert.is('yes 0', newSet[5].getAttribute('tagged'));
        assert.deepEqual(
            [
                'mount:zero',
                'mount:one',
                'mount:two',
                'mount:three',
                'mount:four',
                'mount:five',
            ],
            events
        );
    });
});

suite('foreign elements', () => {
    test('svg elements are supported within an svg context', () => {
        mount(
            testRoot,
            <div>
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="40" r="30" />
                </svg>
            </div>
        );

        assert.isTruthy(
            testRoot.children[0].children[0] instanceof SVGSVGElement
        );
        assert.is(
            testRoot.children[0].children[0].getAttribute('viewBox'),
            '0 0 100 100'
        );
        assert.is(
            testRoot.children[0].children[0].getAttributeNS(
                'http://www.w3.org/2000/xmlns/',
                'xmlns'
            ),
            'http://www.w3.org/2000/svg'
        );
        assert.isTruthy(
            testRoot.children[0].children[0].children[0] instanceof
                SVGCircleElement
        );
        assert.is(
            testRoot.children[0].children[0].children[0].getAttribute('cx'),
            '50'
        );
        assert.is(
            testRoot.children[0].children[0].children[0].getAttribute('cy'),
            '40'
        );
        assert.is(
            testRoot.children[0].children[0].children[0].getAttribute('r'),
            '30'
        );
    });
    test('svg elements are not rendered as svg outside of an svg context', () => {
        mount(
            testRoot,
            // @ts-expect-error viewBox does not exist on div
            <div viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="40" r="30" />
            </div>
        );

        assert.isTruthy(testRoot.children[0] instanceof HTMLDivElement);
        assert.isTruthy(
            testRoot.children[0].children[0] instanceof HTMLUnknownElement
        );
    });
    test('html elements are not rendered as html inside an svg context', () => {
        mount(
            testRoot,
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <input type="text" />
            </svg>
        );

        assert.isTruthy(testRoot.children[0] instanceof SVGSVGElement);
        assert.isTruthy(testRoot.children[0].children[0] instanceof SVGElement);
        assert.isFalsy(testRoot.children[0].children[0] instanceof HTMLElement);
    });
    test('svg elements can break out of svg context using foreignObject', () => {
        mount(
            testRoot,
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <foreignObject>
                    <input type="text" />
                </foreignObject>
            </svg>
        );

        assert.isTruthy(testRoot.children[0] instanceof SVGSVGElement);
        assert.isTruthy(
            testRoot.children[0].children[0] instanceof SVGForeignObjectElement
        );
        assert.isTruthy(
            testRoot.children[0].children[0].children[0] instanceof
                HTMLInputElement
        );
    });

    if (typeof MathMLElement !== 'undefined') {
        test('mathml elements work inside math element', () => {
            mount(
                testRoot,
                <div>
                    <math>
                        <mi>a</mi>
                        <mn>2</mn>
                    </math>
                </div>
            );
            assert.isTruthy(testRoot.children[0] instanceof HTMLDivElement);
            assert.isTruthy(
                testRoot.children[0].children[0] instanceof MathMLElement
            );
            assert.isTruthy(
                testRoot.children[0].children[0].children[0] instanceof
                    MathMLElement
            );
            assert.isTruthy(
                testRoot.children[0].children[0].children[1] instanceof
                    MathMLElement
            );
        });

        test('mathml elements do not work outside math element', () => {
            mount(
                testRoot,
                <div>
                    <div>
                        <mi>a</mi>
                        <mn>2</mn>
                    </div>
                </div>
            );
            assert.isTruthy(testRoot.children[0] instanceof HTMLDivElement);
            assert.isTruthy(
                testRoot.children[0].children[0] instanceof HTMLDivElement
            );
            assert.isTruthy(
                testRoot.children[0].children[0].children[0] instanceof
                    MathMLElement
            );
            assert.isTruthy(
                testRoot.children[0].children[0].children[1] instanceof
                    MathMLElement
            );
        });
    }
});

suite('host elements', () => {
    test('normal element can be used within jsx', () => {
        const hostElement = document.createElement('div');
        hostElement.textContent = 'host element';
        hostElement.id = 'host';
        hostElement.setAttribute('data-host', 'yes');
        mount(testRoot, <div id="outer">{hostElement}</div>);
        assert.is('host element', testRoot.textContent);
        assert.is(
            'yes',
            testRoot.querySelector('#host')?.getAttribute('data-host')
        );
    });
});

suite('createContext', () => {
    test('uses default context value when missing', () => {
        const CtxA = createContext<string>('hello');
        const CtxB = createContext<number>(42);
        const MyComponent: Component<{ id: string }> = (
            { id },
            { getContext }
        ) => (
            <div id={id}>
                CtxA={getContext(CtxA)}, CtxB={getContext(CtxB)}
            </div>
        );
        mount(
            testRoot,
            <div>
                <MyComponent id="neither" />
            </div>
        );
        assert.is(
            'CtxA=hello, CtxB=42',
            testRoot.querySelector('#neither')!.textContent
        );
    });

    test('can have multiple different contexts', () => {
        const CtxA = createContext<string>('hello');
        const CtxB = createContext<number>(42);
        const MyComponent: Component<{ id: string }> = (
            { id },
            { getContext }
        ) => (
            <div id={id}>
                CtxA={getContext(CtxA)}, CtxB={getContext(CtxB)}
            </div>
        );
        mount(
            testRoot,
            <div>
                <CtxA value="outer">
                    <CtxB value={999}>
                        <MyComponent id="outer-first" />
                    </CtxB>
                </CtxA>
                <CtxB value={111}>
                    <CtxA value="inner">
                        <MyComponent id="inner-first" />
                    </CtxA>
                </CtxB>
            </div>
        );

        assert.is(
            'CtxA=outer, CtxB=999',
            testRoot.querySelector('#outer-first')!.textContent
        );
        assert.is(
            'CtxA=inner, CtxB=111',
            testRoot.querySelector('#inner-first')!.textContent
        );
    });
});

// Type tests
// eslint-disable-next-line no-constant-condition
if (2 < 1) {
    suite('parent with no children', () => {
        const ParentWithNoChildren: Component<{}> = (_props) => <div />;

        test('typechecks with no children', () => {
            assert.isTruthy(<ParentWithNoChildren />);
        });

        test('fails when passed one or more children', () => {
            assert.isTruthy(
                // @ts-expect-error
                <ParentWithNoChildren>
                    <div />
                </ParentWithNoChildren>
            );

            assert.isTruthy(
                // @ts-expect-error
                <ParentWithNoChildren>
                    <div />
                    <div />
                </ParentWithNoChildren>
            );
        });
    });

    suite('parent with one child', () => {
        const ParentWithExactlyOneChild: Component<{ children: JSX.Element }> =
            () => <div />;
        const ParentWithOptionallyOneChild: Component<{
            children?: JSX.Element;
        }> = () => <div />;

        test('exact fails with no children', () => {
            // @ts-expect-error
            assert.isTruthy(<ParentWithExactlyOneChild />);
            assert.isTruthy(<ParentWithOptionallyOneChild />);
        });

        test('typechecks with one child', () => {
            assert.isTruthy(
                <ParentWithExactlyOneChild>
                    <div />
                </ParentWithExactlyOneChild>
            );
            assert.isTruthy(
                <ParentWithOptionallyOneChild>
                    <div />
                </ParentWithOptionallyOneChild>
            );
        });

        test('fails with multiple children', () => {
            assert.isTruthy(
                // @ts-expect-error
                <ParentWithExactlyOneChild>
                    <div />
                    <div />
                </ParentWithExactlyOneChild>
            );
            assert.isTruthy(
                // @ts-expect-error
                <ParentWithOptionallyOneChild>
                    <div />
                    <div />
                </ParentWithOptionallyOneChild>
            );
        });
    });

    suite(
        'parent with zero or 2+ children (this is odd and a weird limitation of TypeScript & JSX)',
        () => {
            const ParentWithExactlyManyChild: Component<{
                children: JSX.Element[];
            }> = () => <div />;
            const ParentWithOptionallyManyChild: Component<{
                children?: JSX.Element[];
            }> = () => <div />;

            test('typechecks fails with no children', () => {
                // @ts-expect-error
                assert.isTruthy(<ParentWithExactlyManyChild />);
                assert.isTruthy(<ParentWithOptionallyManyChild />);
            });

            test('fails with one child (this is odd!)', () => {
                assert.isTruthy(
                    // @ts-expect-error
                    <ParentWithExactlyManyChild>
                        <div />
                    </ParentWithExactlyManyChild>
                );
                assert.isTruthy(
                    <ParentWithOptionallyManyChild>
                        {/* @ts-expect-error */}
                        <div />
                    </ParentWithOptionallyManyChild>
                );
            });

            test('typechecks with multiple children', () => {
                assert.isTruthy(
                    <ParentWithExactlyManyChild>
                        <div />
                        <div />
                    </ParentWithExactlyManyChild>
                );
                assert.isTruthy(
                    <ParentWithOptionallyManyChild>
                        <div />
                        <div />
                    </ParentWithOptionallyManyChild>
                );
            });
        }
    );

    suite('parent with any number of children', () => {
        const ParentWithOneOrMoreChildren: Component<{
            children: JSX.Element | JSX.Element[];
        }> = () => <div />;
        const ParentWithOptionallyAnyChildren: Component<{
            children?: JSX.Element | JSX.Element[];
        }> = () => <div />;

        test('typechecks fails with no children', () => {
            // @ts-expect-error
            assert.isTruthy(<ParentWithOneOrMoreChildren />);
            assert.isTruthy(<ParentWithOptionallyAnyChildren />);
        });

        test('typechecks with one child (this is odd!)', () => {
            assert.isTruthy(
                <ParentWithOneOrMoreChildren>
                    <div />
                </ParentWithOneOrMoreChildren>
            );
            assert.isTruthy(
                <ParentWithOptionallyAnyChildren>
                    <div />
                </ParentWithOptionallyAnyChildren>
            );
        });

        test('typechecks with multiple children', () => {
            assert.isTruthy(
                <ParentWithOneOrMoreChildren>
                    <div />
                    <div />
                </ParentWithOneOrMoreChildren>
            );
            assert.isTruthy(
                <ParentWithOptionallyAnyChildren>
                    <div />
                    <div />
                </ParentWithOptionallyAnyChildren>
            );
        });
    });

    suite('Built-in html elements', () => {
        test('data attributes work on all element types', () => {
            assert.isTruthy(<div data-yes="cool" />);
            assert.isTruthy(<p data-x="cool" />);
        });

        test('unexpected attributes are rejected', () => {
            // @ts-expect-error
            assert.isTruthy(<div src="cool" />);
            assert.isTruthy(<script src="cool" />);
        });

        test('on: attributes infer correctly', () => {
            assert.isTruthy(
                <div
                    on:click={(e) => {
                        const mouseEvent: PointerEvent = e;
                        return mouseEvent;
                    }}
                    on:keydown={(e) => {
                        const keyEvent: KeyboardEvent = e;
                        return keyEvent;
                    }}
                    on:customevent={(e) => {
                        const customEvent: Event = e;
                        return customEvent;
                    }}
                />
            );
        });

        test('empty elements do not accept children', () => {
            assert.isTruthy(
                <area>
                    {/* @ts-expect-error */}
                    <div />
                </area>
            );
            assert.isTruthy(
                <base>
                    {/* @ts-expect-error */}
                    <div />
                </base>
            );
            assert.isTruthy(
                <br>
                    {/* @ts-expect-error */}
                    <div />
                </br>
            );
            assert.isTruthy(
                <col>
                    {/* @ts-expect-error */}
                    <div />
                </col>
            );
            assert.isTruthy(
                <embed>
                    {/* @ts-expect-error */}
                    <div />
                </embed>
            );
            assert.isTruthy(
                <hr>
                    {/* @ts-expect-error */}
                    <div />
                </hr>
            );
            assert.isTruthy(
                <img>
                    {/* @ts-expect-error */}
                    <div />
                </img>
            );
            assert.isTruthy(
                <input>
                    {/* @ts-expect-error */}
                    <div />
                </input>
            );
            assert.isTruthy(
                <link>
                    {/* @ts-expect-error */}
                    <div />
                </link>
            );
            assert.isTruthy(
                <meta>
                    {/* @ts-expect-error */}
                    <div />
                </meta>
            );
            assert.isTruthy(
                <param>
                    {/* @ts-expect-error */}
                    <div />
                </param>
            );
            assert.isTruthy(
                <source>
                    {/* @ts-expect-error */}
                    <div />
                </source>
            );
            assert.isTruthy(
                <track>
                    {/* @ts-expect-error */}
                    <div />
                </track>
            );
            assert.isTruthy(
                <wbr>
                    {/* @ts-expect-error */}
                    <div />
                </wbr>
            );
        });
    });

    suite('JSX.Element', () => {
        function receiveJSXElement(jsxElement: JSX.Element) {
            return true;
        }

        test('JSX.Element can receive basic types', () => {
            assert.isTruthy(receiveJSXElement('strings'));
            assert.isTruthy(receiveJSXElement(123));
            assert.isTruthy(receiveJSXElement(null));
            assert.isTruthy(receiveJSXElement(undefined));
            assert.isTruthy(receiveJSXElement(Symbol('hi')));
            assert.isTruthy(receiveJSXElement((a: number, b: number) => a + b));
            assert.isTruthy(receiveJSXElement(<p>exising jsx</p>));
            function Component() {
                return <p>cool</p>;
            }
            assert.isTruthy(receiveJSXElement(<Component />));
        });

        test('JSX.Element can receive basic types wrapped in calculations', () => {
            assert.isTruthy(receiveJSXElement(calc(() => 'strings')));
            assert.isTruthy(receiveJSXElement(calc(() => 123)));
            assert.isTruthy(receiveJSXElement(calc(() => null)));
            assert.isTruthy(receiveJSXElement(calc(() => undefined)));
            assert.isTruthy(receiveJSXElement(calc(() => Symbol('hi'))));
            assert.isTruthy(
                receiveJSXElement(calc(() => (a: number, b: number) => a + b))
            );
            assert.isTruthy(receiveJSXElement(calc(() => <p>exising jsx</p>)));
            function Component() {
                return <p>cool</p>;
            }
            assert.isTruthy(receiveJSXElement(calc(() => <Component />)));
        });

        test('JSX.Element can receive basic types wrapped in collections', () => {
            assert.isTruthy(receiveJSXElement(collection(['strings'])));
            assert.isTruthy(receiveJSXElement(collection([123])));
            assert.isTruthy(receiveJSXElement(collection([null])));
            assert.isTruthy(receiveJSXElement(collection([undefined])));
            assert.isTruthy(receiveJSXElement(collection([Symbol('hi')])));
            assert.isTruthy(
                receiveJSXElement(collection([(a: number, b: number) => a + b]))
            );
            assert.isTruthy(
                receiveJSXElement(collection([<p>exising jsx</p>]))
            );
            function Component() {
                return <p>cool</p>;
            }
            assert.isTruthy(receiveJSXElement(collection([<Component />])));
        });

        test('JSX.Element can receive basic types wrapped in views', () => {
            assert.isTruthy(
                receiveJSXElement(
                    collection(['strings']).mapView((item) => item)
                )
            );
            assert.isTruthy(
                receiveJSXElement(collection([123]).mapView((item) => item))
            );
            assert.isTruthy(
                receiveJSXElement(collection([null]).mapView((item) => item))
            );
            assert.isTruthy(
                receiveJSXElement(
                    collection([undefined]).mapView((item) => item)
                )
            );
            assert.isTruthy(
                receiveJSXElement(
                    collection([Symbol('hi')]).mapView((item) => item)
                )
            );
            assert.isTruthy(
                receiveJSXElement(
                    collection([(a: number, b: number) => a + b]).mapView(
                        (item) => item
                    )
                )
            );
            assert.isTruthy(
                receiveJSXElement(
                    collection([<p>exising jsx</p>]).mapView((item) => item)
                )
            );
            function Component() {
                return <p>cool</p>;
            }
            assert.isTruthy(
                receiveJSXElement(
                    collection([<Component />]).mapView((item) => item)
                )
            );
        });
    });
}
