import Gooey, {
    Component,
    calc,
    collection,
    flush,
    model,
    Model,
    mount,
    reset,
    createContext,
    subscribe,
    IntrinsicObserver,
} from './index';
import { debugGetGraph } from './engine';
import { suite, test, beforeEach, assert } from '@srhazi/gooey-test';

let testRoot: HTMLElement = document.getElementById('test-root')!;

beforeEach(() => {
    testRoot = document.getElementById('test-root')!;
    reset();
    subscribe();
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

    test('mount renders tree of intrinsic elements', () => {
        mount(
            testRoot,
            <div data-item="0" id="outer">
                a
                <p data-item="1" id="inner-1">
                    b
                </p>
                c
                <p data-item="2" id="inner-2">
                    d
                </p>
                e
                <p data-item="3" id="inner-3">
                    f
                </p>
                g
            </div>
        );

        assert.is(
            '<div data-item="0" id="outer">a<p data-item="1" id="inner-1">b</p>c<p data-item="2" id="inner-2">d</p>e<p data-item="3" id="inner-3">f</p>g</div>',
            testRoot.innerHTML
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

    test('mount renders nested and concatenated jsx arrays as contents', () => {
        mount(
            testRoot,
            <div id="ok">
                {[
                    'a1:start',
                    'zero',
                    undefined,
                    1,
                    null,
                    'two',
                    false,
                    [
                        'a2:start',
                        'three',
                        undefined,
                        4,
                        null,
                        'five',
                        false,
                        6,
                        true,
                        'seven',
                        () => 3,
                        8,
                        'a2:end',
                    ],
                    9,
                    true,
                    'ten',
                    () => 3,
                    11,
                    'a1:end',
                ]}
                {[
                    'a3:start',
                    'twelve',
                    undefined,
                    13,
                    null,
                    'fourteen',
                    false,
                    [
                        'a4:start',
                        'fifteen',
                        undefined,
                        16,
                        null,
                        'seventeen',
                        false,
                        18,
                        true,
                        'nineteen',
                        () => 3,
                        20,
                        'a4:end',
                    ],
                    21,
                    true,
                    'twentytwo',
                    () => 3,
                    23,
                    'a3:end',
                ]}
            </div>
        );
        assert.deepEqual(
            (
                Array.from(testRoot.querySelector('#ok')!.childNodes) as Text[]
            ).map((text: Text) => text.data),
            [
                'a1:start',
                'zero',
                '1',
                'two',
                'a2:start',
                'three',
                '4',
                'five',
                '6',
                'seven',
                '8',
                'a2:end',
                '9',
                'ten',
                '11',
                'a1:end',
                'a3:start',
                'twelve',
                '13',
                'fourteen',
                'a4:start',
                'fifteen',
                '16',
                'seventeen',
                '18',
                'nineteen',
                '20',
                'a4:end',
                '21',
                'twentytwo',
                '23',
                'a3:end',
            ]
        );
    });

    test('react lies about JSX not supporting class, for, and other keywords', () => {
        mount(
            testRoot,
            <>
                <label class="my-class" for="my-thing">
                    Hello
                </label>
                <div tabindex={0}>focusable</div>
                <input id="my-thing" type="text" readonly />
            </>
        );
        assert.is(
            'my-class',
            (testRoot.childNodes[0] as HTMLLabelElement).getAttribute('class')
        );
        assert.is(
            'my-class',
            (testRoot.childNodes[0] as HTMLLabelElement).className
        );

        assert.is(
            'my-thing',
            (testRoot.childNodes[0] as HTMLLabelElement).getAttribute('for')
        );
        assert.is(
            'my-thing',
            (testRoot.childNodes[0] as HTMLLabelElement).htmlFor
        );

        assert.is(
            '0',
            (testRoot.childNodes[1] as HTMLElement).getAttribute('tabindex')
        );
        assert.is(0, (testRoot.childNodes[1] as HTMLElement).tabIndex);

        assert.is(
            '',
            (testRoot.childNodes[2] as HTMLInputElement).getAttribute(
                'readonly'
            )
        );
        assert.is(true, (testRoot.childNodes[2] as HTMLInputElement).readOnly);
    });

    test('prop:myprop sets element property manually', () => {
        const state = model<{ val: any }>({
            val: 42,
        });
        mount(
            testRoot,
            <div
                prop:mypropstr="my-value"
                prop:mypropnum={3}
                prop:mypropcalc={calc(() => state.val)}
            >
                Hello
            </div>
        );
        assert.is('my-value', (testRoot.childNodes[0] as any).mypropstr);
        assert.is(3, (testRoot.childNodes[0] as any).mypropnum);
        assert.is(42, (testRoot.childNodes[0] as any).mypropcalc);
        state.val = 'hello';
        flush();
        assert.is('hello', (testRoot.childNodes[0] as any).mypropcalc);
    });

    test('attr:myprop sets element attribute manually', () => {
        // the indeterminate attribute does not exist, but it does exist as a property on HTMLInputElement instances
        mount(testRoot, <input type="checkbox" attr:indeterminate="" />);
        assert.is(false, (testRoot.childNodes[0] as any).indeterminate);
        assert.is(
            '',
            (testRoot.childNodes[0] as any).getAttribute('indeterminate')
        );
    });
});

suite('mount calculations', () => {
    test('renders child calculations as their raw value', () => {
        mount(testRoot, <div id="ok">{calc(() => 'hello', 'calctest')}</div>);
        assert.deepEqual(
            (testRoot.querySelector('#ok')!.childNodes[0] as Text).data,
            'hello'
        );
    });

    test('child calculations can unmount', () => {
        const unmount = mount(
            testRoot,
            <div id="ok">{calc(() => 'hello', 'calctest')}</div>
        );
        unmount();
        assert.is('', testRoot.innerHTML);
    });

    test('renders attribute calculations as their raw value', () => {
        mount(testRoot, <div id="ok" data-whatever={calc(() => 'hello')} />);
        assert.deepEqual(
            testRoot.querySelector('#ok')!.getAttribute('data-whatever'),
            'hello'
        );
    });

    test('attribute calculations can unmount', () => {
        const unmount = mount(
            testRoot,
            <div id="ok" data-whatever={calc(() => 'hello')} />
        );
        unmount();
        assert.is('', testRoot.innerHTML);
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

    test('components can unmount', () => {
        const Greet: Component<{ name: string }> = ({ name }) => (
            <p>Hello {name}</p>
        );
        const unmount = mount(testRoot, <Greet name="world!" />);
        unmount();
        assert.is(testRoot.innerHTML, '');
    });

    test('components with calculations can unmount', () => {
        const Greet: Component<{ name: string }> = ({ name }) => {
            const state = model({ name });
            return <p>Hello {calc(() => state.name)}</p>;
        };
        const unmount = mount(testRoot, <Greet name="world!" />);
        unmount();
        assert.is(testRoot.innerHTML, '');
    });

    test('components can have calculations', () => {
        const state = model(
            {
                name: 'world',
            },
            'state'
        );
        const Greet: Component<{}> = () => (
            <p>Hello {calc(() => state.name, 'rendername')}</p>
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

    test('components onMount can return an onUnmount callback which gets called after mount', () => {
        const sequence: string[] = [];
        let count = 0;
        const Greet: Component<{}> = (props, { onMount }) => {
            sequence.push('render');
            onMount(() => {
                count++;
                sequence.push(`onMount:${count}`);
                return () => {
                    sequence.push(`onUnmount:${count}`);
                };
            });
            return <p id="p">Hello!</p>;
        };

        const jsx = <Greet />;
        jsx.retain();

        let unmount = mount(testRoot, jsx);
        assert.deepEqual(['render', 'onMount:1'], sequence);
        unmount();
        assert.deepEqual(['render', 'onMount:1', 'onUnmount:1'], sequence);
        unmount = mount(testRoot, jsx);
        assert.deepEqual(
            ['render', 'onMount:1', 'onUnmount:1', 'onMount:2'],
            sequence
        );
        unmount();
        assert.deepEqual(
            ['render', 'onMount:1', 'onUnmount:1', 'onMount:2', 'onUnmount:2'],
            sequence
        );
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

    test('children can only be rendered exactly once', () => {
        const BadComponent: Component<{ children: JSX.Element }> = ({
            children,
        }) => (
            <div>
                <div id="left">{children}</div>
                <div id="right">{children}</div>
            </div>
        );
        assert.throwsMatching(/Invariant: Intrinsic node double attached/, () =>
            mount(
                testRoot,
                <BadComponent>
                    <p class="child">only once</p>
                </BadComponent>
            )
        );
    });

    test('children can read contexts correctly', () => {
        const Context = createContext('no-context');

        const Parent: Component<{ children: () => JSX.Element }> = ({
            children,
        }) => {
            return (
                <div>
                    <div id="child-1">{children()}</div>
                    <Context value="child-2">
                        <div id="child-2">{children()}</div>
                    </Context>
                    <Context value="child-3">
                        <div id="child-3">{children()}</div>
                    </Context>
                </div>
            );
        };

        const Child: Component<{ name: string }> = (
            { name },
            { getContext }
        ) => {
            const state = model({ value: 'wut' });
            getContext(Context, (value) => (state.value = value));
            return (
                <p>
                    {calc(() => state.value)}:{name}
                </p>
            );
        };

        // Mount all items with no children passed
        const unmount = mount(
            testRoot,
            <Parent>
                {() => (
                    <>
                        <Child name="one" />
                        <Child name="two" />
                    </>
                )}
            </Parent>
        );

        flush();

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

    test('ref called immediately after mount and immediately before unmount', () => {
        let mountedEl: Element | null = null;
        const unmount = mount(
            testRoot,
            <div>
                <p
                    ref={(el) => {
                        if (el) {
                            assert.isTruthy(testRoot.contains(el));
                            mountedEl = el;
                        } else {
                            assert.isTruthy(testRoot.contains(mountedEl));
                        }
                    }}
                >
                    contents
                </p>
            </div>
        );
        unmount();
        assert.isFalsy(testRoot.contains(mountedEl));
        assert.assertionCount(3);
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
        flush();
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

    test('collection can add items', () => {
        const items = collection<string>([], 'source');
        mount(
            testRoot,
            <div>
                {items.mapView(
                    (item) => (
                        <span data-item>{item}</span>
                    ),
                    'first'
                )}
                {items.mapView(
                    (item) => (
                        <span data-item>{item}</span>
                    ),
                    'second'
                )}
            </div>
        );
        assert.is('', testRoot.textContent);
        items.push('foo');
        flush();
        assert.is('foofoo', testRoot.textContent);
        items.push('bar');
        flush();
        assert.is('foobarfoobar', testRoot.textContent);
        items.push('baz');
        flush();
        assert.is('foobarbazfoobarbaz', testRoot.textContent);
    });

    test('collection can unmount', () => {
        const items = collection<string>(['hi']);
        const unmount = mount(
            testRoot,
            <div>{calc(() => items.mapView((item) => <b>{item}</b>))}</div>
        );
        unmount();
    });

    test('add 1 item to end of 10 flat items', async () => {
        const Item = ({ id }: { id: number }) => (
            <a>
                {calc(() => (
                    <b>{id}</b>
                ))}
            </a>
        );
        const items = collection<Model<{ id: number }>>([], 'coll');
        const Items = () => (
            <div>
                {calc(() => items.mapView((item) => <Item id={item.id} />))}
            </div>
        );

        const unmount = mount(testRoot, <Items />);
        flush();

        items.push(model({ id: 1 }, 'new'));
        flush();
        items.pop();
        flush();

        unmount();
    });

    test('collection can remove items from start', () => {
        const items = collection(['foo', 'bar', 'baz']);
        mount(
            testRoot,
            <div>
                {items.mapView((item) => (
                    <span data-item>{item}</span>
                ))}
                {items.mapView((item) => (
                    <span data-item>{item}</span>
                ))}
            </div>
        );
        assert.is('foobarbazfoobarbaz', testRoot.textContent);
        items.pop();
        flush();
        assert.is('foobarfoobar', testRoot.textContent);
        items.pop();
        flush();
        assert.is('foofoo', testRoot.textContent);
        items.pop();
        flush();
        assert.is('', testRoot.textContent);
    });

    test('collection can remove items from middle', () => {
        const items = collection(['foo', 'bar', 'baz', 'bum']);
        mount(
            testRoot,
            <div>
                {items.mapView((item) => (
                    <span data-item>{item}</span>
                ))}
                {items.mapView((item) => (
                    <span data-item>{item}</span>
                ))}
            </div>
        );
        assert.is('foobarbazbumfoobarbazbum', testRoot.textContent);
        items.splice(1, 1);
        flush();
        assert.is('foobazbumfoobazbum', testRoot.textContent);
        items.splice(1, 1);
        flush();
        assert.is('foobumfoobum', testRoot.textContent);
    });

    test('collection can remove items at end', () => {
        const items = collection(['foo', 'bar', 'baz']);
        mount(
            testRoot,
            <div>
                {items.mapView((item) => (
                    <span data-item>{item}</span>
                ))}
                {items.mapView((item) => (
                    <span data-item>{item}</span>
                ))}
            </div>
        );
        assert.is('foobarbazfoobarbaz', testRoot.textContent);
        items.shift();
        flush();
        assert.is('barbazbarbaz', testRoot.textContent);
        items.shift();
        flush();
        assert.is('bazbaz', testRoot.textContent);
        items.shift();
        flush();
        assert.is('', testRoot.textContent);
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
        items.moveSlice(1, 2, 3);
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

suite('xml namespaces', () => {
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
            assert.isFalsy(
                testRoot.children[0].children[0].children[0] instanceof
                    MathMLElement
            );
            assert.isFalsy(
                testRoot.children[0].children[0].children[1] instanceof
                    MathMLElement
            );
        });
    }
});

suite('foreign elements', () => {
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
        ) => {
            const state = model({
                a: 'boop',
                b: 0,
            });
            getContext(CtxA, (a) => {
                state.a = a;
            });
            getContext(CtxB, (b) => {
                state.b = b;
            });

            return (
                <div id={id}>
                    CtxA={calc(() => state.a)}, CtxB={calc(() => state.b)}
                </div>
            );
        };
        mount(
            testRoot,
            <div>
                <MyComponent id="neither" />
            </div>
        );
        flush();
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
        ) => {
            const state = model({
                a: 'boop',
                b: 0,
            });
            getContext(CtxA, (a) => {
                state.a = a;
            });
            getContext(CtxB, (b) => {
                state.b = b;
            });
            return (
                <div id={id}>
                    CtxA={calc(() => state.a)}, CtxB={calc(() => state.b)}
                </div>
            );
        };
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

        flush();

        assert.is(
            'CtxA=outer, CtxB=999',
            testRoot.querySelector('#outer-first')!.textContent
        );
        assert.is(
            'CtxA=inner, CtxB=111',
            testRoot.querySelector('#inner-first')!.textContent
        );
    });

    test('changing context can be observed while moved', () => {
        const Ctx = createContext<string>('default');
        const state = model({
            slot: 'a',
        });

        const MyComponent: Component<{}> = (_props, { getContext }) => {
            const localState = model({
                val: getContext(Ctx, (val) => {
                    localState.val = val;
                }),
            });
            return <div>val: {calc(() => localState.val)}</div>;
        };

        const myComponent = <MyComponent />;
        myComponent.retain();
        const unmount = mount(
            testRoot,
            <div>
                <div id="a">
                    {calc(() => state.slot === 'a' && myComponent)}
                </div>
                <Ctx value="b">
                    <div id="b">
                        {calc(() => state.slot === 'b' && myComponent)}
                    </div>
                </Ctx>
                <Ctx value="c">
                    <div id="c">
                        {calc(() => state.slot === 'c' && myComponent)}
                    </div>
                </Ctx>
            </div>
        );

        assert.is('val: default', testRoot.querySelector('#a')?.textContent);
        assert.is('', testRoot.querySelector('#b')?.textContent);
        assert.is('', testRoot.querySelector('#c')?.textContent);
        state.slot = 'b';
        flush();
        assert.is('', testRoot.querySelector('#a')?.textContent);
        assert.is('val: b', testRoot.querySelector('#b')?.textContent);
        assert.is('', testRoot.querySelector('#c')?.textContent);
        state.slot = 'c';
        flush();
        assert.is('', testRoot.querySelector('#a')?.textContent);
        assert.is('', testRoot.querySelector('#b')?.textContent);
        assert.is('val: c', testRoot.querySelector('#c')?.textContent);
        state.slot = 'a';
        flush();
        assert.is('val: default', testRoot.querySelector('#a')?.textContent);
        assert.is('', testRoot.querySelector('#b')?.textContent);
        assert.is('', testRoot.querySelector('#c')?.textContent);
        unmount();
        myComponent.release();
    });
});

suite('IntrinsicObserver component', () => {
    test('with no children does nothing', () => {
        const nodes: {
            node: Node;
            event: 'mount' | 'unmount';
        }[] = [];
        const elements: {
            element: Element;
            event: 'mount' | 'unmount';
        }[] = [];
        const unmount = mount(
            testRoot,
            <div>
                <IntrinsicObserver
                    nodeCallback={(node: Node, event: 'mount' | 'unmount') =>
                        nodes.push({ node, event })
                    }
                    elementCallback={(
                        element: Element,
                        event: 'mount' | 'unmount'
                    ) => elements.push({ element, event })}
                />
            </div>
        );
        unmount();
        assert.deepEqual([], nodes);
        assert.deepEqual([], elements);
    });

    test('with single string child', () => {
        const nodes: {
            node: Node;
            event: 'mount' | 'unmount';
        }[] = [];
        const elements: {
            element: Element;
            event: 'mount' | 'unmount';
        }[] = [];
        const unmount = mount(
            testRoot,
            <div class="container">
                <IntrinsicObserver
                    nodeCallback={(node: Node, event: 'mount' | 'unmount') =>
                        nodes.push({ node, event })
                    }
                    elementCallback={(
                        element: Element,
                        event: 'mount' | 'unmount'
                    ) => elements.push({ element, event })}
                >
                    Hello, world!
                </IntrinsicObserver>
            </div>
        );

        const container = testRoot.querySelector('.container')!;
        assert.deepEqual([], elements);
        assert.deepEqual(
            [
                {
                    node: container.childNodes[0],
                    event: 'mount',
                },
            ],
            nodes
        );

        unmount();

        assert.deepEqual([], elements);
        assert.deepEqual(
            [
                {
                    node: container.childNodes[0],
                    event: 'mount',
                },
                {
                    node: container.childNodes[0],
                    event: 'unmount',
                },
            ],
            nodes
        );
    });

    test('with dynamic single string child', () => {
        const nodes: {
            node: Node;
            event: 'mount' | 'unmount';
        }[] = [];
        const elements: {
            element: Element;
            event: 'mount' | 'unmount';
        }[] = [];
        const state = model({ visible: false });
        mount(
            testRoot,
            <div class="container">
                <IntrinsicObserver
                    nodeCallback={(node: Node, event: 'mount' | 'unmount') =>
                        nodes.push({ node, event })
                    }
                    elementCallback={(
                        element: Element,
                        event: 'mount' | 'unmount'
                    ) => elements.push({ element, event })}
                >
                    {calc(() => (state.visible ? <>Hello, world!</> : null))}
                </IntrinsicObserver>
            </div>
        );

        const container = testRoot.querySelector('.container')!;
        assert.deepEqual([], elements);
        assert.deepEqual([], nodes);

        state.visible = true;
        flush();

        const textNode = container.childNodes[0];
        assert.deepEqual(
            [
                {
                    node: textNode,
                    event: 'mount',
                },
            ],
            nodes
        );

        state.visible = false;
        flush();

        assert.deepEqual([], elements);
        assert.deepEqual(
            [
                {
                    node: textNode,
                    event: 'mount',
                },
                {
                    node: textNode,
                    event: 'unmount',
                },
            ],
            nodes
        );
    });

    test('with multiple string children', () => {
        const nodes: {
            node: Node;
            event: 'mount' | 'unmount';
        }[] = [];
        const elements: {
            element: Element;
            event: 'mount' | 'unmount';
        }[] = [];
        const unmount = mount(
            testRoot,
            <div>
                <IntrinsicObserver
                    nodeCallback={(node: Node, event: 'mount' | 'unmount') =>
                        nodes.push({ node, event })
                    }
                    elementCallback={(
                        element: Element,
                        event: 'mount' | 'unmount'
                    ) => elements.push({ element, event })}
                >
                    {'Hello,'} {'world!'}
                </IntrinsicObserver>
            </div>
        );

        const strings = ['Hello,', ' ', 'world!'];

        assert.is(3, nodes.length);
        nodes.forEach((item, idx) => {
            assert.isTruthy(item.node instanceof Text);
            assert.is(strings[idx], (item.node as Text).data);
            assert.is('mount', item.event);
        });

        assert.deepEqual([], elements);

        unmount();

        assert.is(6, nodes.length);
        nodes.slice(3).forEach((item, idx) => {
            assert.isTruthy(item.node instanceof Text);
            assert.is(strings[idx], (item.node as Text).data);
            assert.is('unmount', item.event);
        });

        assert.deepEqual([], elements);
    });

    test('with single element child', () => {
        const nodes: {
            node: Node;
            event: 'mount' | 'unmount';
        }[] = [];
        const elements: {
            element: Element;
            event: 'mount' | 'unmount';
        }[] = [];
        const unmount = mount(
            testRoot,
            <div>
                <IntrinsicObserver
                    nodeCallback={(node: Node, event: 'mount' | 'unmount') =>
                        nodes.push({ node, event })
                    }
                    elementCallback={(
                        element: Element,
                        event: 'mount' | 'unmount'
                    ) => elements.push({ element, event })}
                >
                    <div id="outer">
                        <div id="inner-1" />
                        <div id="inner-2" />
                    </div>
                </IntrinsicObserver>
            </div>
        );

        assert.is(1, elements.length);
        assert.isTruthy(elements[0].element instanceof HTMLDivElement);
        assert.is('outer', elements[0].element.id);
        assert.is('mount', elements[0].event);
        assert.is(1, nodes.length);
        assert.is(elements[0].element, nodes[0].node);
        assert.is(elements[0].event, nodes[0].event);

        unmount();

        assert.is(2, elements.length);
        assert.is(elements[0].element, elements[1].element);
        assert.is('unmount', elements[1].event);
        assert.is(2, nodes.length);
        assert.is(elements[1].element, nodes[1].node);
        assert.is(elements[1].event, nodes[1].event);
    });

    test('with multiple element children', () => {
        const nodes: {
            node: Node;
            event: 'mount' | 'unmount';
        }[] = [];
        const elements: {
            element: Element;
            event: 'mount' | 'unmount';
        }[] = [];
        const unmount = mount(
            testRoot,
            <div>
                <IntrinsicObserver
                    nodeCallback={(node: Node, event: 'mount' | 'unmount') =>
                        nodes.push({ node, event })
                    }
                    elementCallback={(
                        element: Element,
                        event: 'mount' | 'unmount'
                    ) => elements.push({ element, event })}
                >
                    <div id="outer-1">
                        <div id="inner-1" />
                        <div id="inner-2" />
                    </div>
                    <div id="outer-2">
                        <div id="inner-2" />
                        <div id="inner-3" />
                    </div>
                    <div id="outer-3">
                        <div id="inner-4" />
                        <div id="inner-5" />
                    </div>
                </IntrinsicObserver>
            </div>
        );

        const ids = ['outer-1', 'outer-2', 'outer-3'];

        assert.is(3, elements.length);
        assert.is(3, nodes.length);
        elements.forEach((item, idx) => {
            assert.isTruthy(item.element instanceof HTMLDivElement);
            assert.is(ids[idx], item.element.id);
            assert.is('mount', item.event);

            assert.is(nodes[idx].node, item.element);
            assert.is(nodes[idx].event, item.event);
        });

        unmount();

        assert.is(6, elements.length);
        assert.is(6, nodes.length);
        elements.slice(3).forEach((item, idx) => {
            assert.isTruthy(item.element instanceof HTMLDivElement);
            assert.is(ids[idx], item.element.id);
            assert.is('unmount', item.event);

            assert.is(nodes[idx + 3].node, item.element);
            assert.is(nodes[idx + 3].event, item.event);
        });
    });

    test('with multiple mixed children', () => {
        const nodes: {
            node: Node;
            event: 'mount' | 'unmount';
        }[] = [];
        const elements: {
            element: Element;
            event: 'mount' | 'unmount';
        }[] = [];
        const unmount = mount(
            testRoot,
            <div>
                <IntrinsicObserver
                    nodeCallback={(node: Node, event: 'mount' | 'unmount') =>
                        nodes.push({ node, event })
                    }
                    elementCallback={(
                        element: Element,
                        event: 'mount' | 'unmount'
                    ) => elements.push({ element, event })}
                >
                    <div id="outer-1">
                        <div id="inner-1" />
                        <div id="inner-2" />
                    </div>
                    Middle text
                    <div id="outer-2">
                        <div id="inner-3" />
                        <div id="inner-4" />
                    </div>
                </IntrinsicObserver>
            </div>
        );

        assert.is(2, elements.length);
        assert.isTruthy(elements[0].element instanceof HTMLDivElement);
        assert.is('outer-1', elements[0].element.id);
        assert.is('mount', elements[0].event);
        assert.isTruthy(elements[1].element instanceof HTMLDivElement);
        assert.is('outer-2', elements[1].element.id);
        assert.is('mount', elements[1].event);

        assert.is(3, nodes.length);
        assert.isTruthy(nodes[0].node instanceof HTMLDivElement);
        assert.is('outer-1', (nodes[0].node as Element).id);
        assert.is('mount', nodes[0].event);
        assert.isTruthy(nodes[1].node instanceof Text);
        assert.is('Middle text', (nodes[1].node as Text).data);
        assert.is('mount', nodes[1].event);
        assert.isTruthy(nodes[2].node instanceof HTMLDivElement);
        assert.is('outer-2', (nodes[2].node as Element).id);
        assert.is('mount', nodes[2].event);

        unmount();

        assert.is(4, elements.length);
        assert.isTruthy(elements[2].element instanceof HTMLDivElement);
        assert.is('outer-1', elements[2].element.id);
        assert.is('unmount', elements[2].event);
        assert.isTruthy(elements[3].element instanceof HTMLDivElement);
        assert.is('outer-2', elements[3].element.id);
        assert.is('unmount', elements[3].event);

        assert.is(6, nodes.length);
        assert.isTruthy(nodes[3].node instanceof HTMLDivElement);
        assert.is('outer-1', (nodes[3].node as Element).id);
        assert.is('unmount', nodes[3].event);
        assert.isTruthy(nodes[4].node instanceof Text);
        assert.is('Middle text', (nodes[4].node as Text).data);
        assert.is('unmount', nodes[4].event);
        assert.isTruthy(nodes[5].node instanceof HTMLDivElement);
        assert.is('outer-2', (nodes[5].node as Element).id);
        assert.is('unmount', nodes[5].event);
    });

    test('with dynamic children', () => {
        const state = model({
            type: 'text',
        });
        const nodes: {
            node: Node;
            event: 'mount' | 'unmount';
        }[] = [];
        const elements: {
            element: Element;
            event: 'mount' | 'unmount';
        }[] = [];
        const unmount = mount(
            testRoot,
            <div class="container">
                <IntrinsicObserver
                    nodeCallback={(node: Node, event: 'mount' | 'unmount') =>
                        nodes.push({ node, event })
                    }
                    elementCallback={(
                        element: Element,
                        event: 'mount' | 'unmount'
                    ) => elements.push({ element, event })}
                >
                    {calc(() => {
                        switch (state.type) {
                            case 'text':
                                return 'dynamic text';
                            case 'element':
                                return <div id="dynamic-el" />;
                            default:
                                return null;
                        }
                    })}
                </IntrinsicObserver>
            </div>
        );

        assert.is(0, elements.length);
        assert.is(1, nodes.length);
        assert.isTruthy(nodes[0].node instanceof Text);
        assert.is('dynamic text', (nodes[0].node as Text).data);
        assert.is('mount', nodes[0].event);

        state.type = 'element';
        flush();

        assert.is(1, elements.length);
        assert.isTruthy(elements[0].element instanceof HTMLDivElement);
        assert.is('dynamic-el', elements[0].element.id);
        assert.is('mount', elements[0].event);

        assert.is(3, nodes.length);
        assert.isTruthy(nodes[1].node instanceof Text);
        assert.is('dynamic text', (nodes[1].node as Text).data);
        assert.is('unmount', nodes[1].event);
        assert.isTruthy(nodes[2].node instanceof HTMLDivElement);
        assert.is('dynamic-el', (nodes[2].node as Element).id);
        assert.is('mount', nodes[2].event);

        state.type = 'nothing';
        flush();

        assert.is(2, elements.length);
        assert.isTruthy(elements[1].element instanceof HTMLDivElement);
        assert.is('dynamic-el', elements[1].element.id);
        assert.is('unmount', elements[1].event);

        assert.is(4, nodes.length);
        assert.isTruthy(nodes[3].node instanceof HTMLDivElement);
        assert.is('dynamic-el', (nodes[3].node as Element).id);
        assert.is('unmount', nodes[3].event);

        state.type = 'element';
        flush();

        assert.is(3, elements.length);
        assert.isTruthy(elements[2].element instanceof HTMLDivElement);
        assert.is('dynamic-el', elements[2].element.id);
        assert.is('mount', elements[2].event);

        assert.is(5, nodes.length);
        assert.isTruthy(nodes[4].node instanceof HTMLDivElement);
        assert.is('dynamic-el', (nodes[4].node as Element).id);
        assert.is('mount', nodes[4].event);

        unmount();

        // mount, unmount, mount
        assert.is(4, elements.length);
        assert.isTruthy(elements[3].element instanceof HTMLDivElement);
        assert.is('dynamic-el', elements[3].element.id);
        assert.is('unmount', elements[3].event);

        assert.is(6, nodes.length);
        assert.isTruthy(nodes[5].node instanceof HTMLDivElement);
        assert.is('dynamic-el', (nodes[5].node as Element).id);
        assert.is('unmount', nodes[5].event);
    });

    test('with collection children', () => {
        const items = collection(['one', 'two', 'three']);
        const nodes: {
            node: Node;
            event: 'mount' | 'unmount';
        }[] = [];
        const elements: {
            text: string | null;
            event: 'mount' | 'unmount';
        }[] = [];
        const unmount = mount(
            testRoot,
            <div>
                <IntrinsicObserver
                    nodeCallback={(node: Node, event: 'mount' | 'unmount') =>
                        nodes.push({ node, event })
                    }
                    elementCallback={(
                        element: Element,
                        event: 'mount' | 'unmount'
                    ) => elements.push({ text: element.textContent, event })}
                >
                    {items.mapView((item) => (
                        <div id={item}>{item}</div>
                    ))}
                </IntrinsicObserver>
            </div>
        );

        assert.deepEqual(
            ['one:mount', 'two:mount', 'three:mount'],
            elements.map((item) => `${item.text}:${item.event}`)
        );

        items.push('four');
        flush();

        assert.deepEqual(
            ['one:mount', 'two:mount', 'three:mount', 'four:mount'],
            elements.map((item) => `${item.text}:${item.event}`)
        );

        items.shift();
        flush();

        assert.deepEqual(
            [
                'one:mount',
                'two:mount',
                'three:mount',
                'four:mount',
                'one:unmount',
            ],
            elements.map((item) => `${item.text}:${item.event}`)
        );

        items.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        flush();

        // Note: no changes triggered, despite sort order changing
        assert.deepEqual(
            [
                'one:mount',
                'two:mount',
                'three:mount',
                'four:mount',
                'one:unmount',
            ],
            elements.map((item) => `${item.text}:${item.event}`)
        );

        unmount();

        assert.deepEqual(
            [
                'one:mount',
                'two:mount',
                'three:mount',
                'four:mount',
                'one:unmount',
                // Note: unmount in newly sorted (alphabetical) document order
                'four:unmount',
                'three:unmount',
                'two:unmount',
            ],
            elements.map((item) => `${item.text}:${item.event}`)
        );
    });
});

suite('rendered node reuse', () => {
    test('element cannot be rendered multiple times', () => {
        const jsx = <p>hello there</p>;
        assert.throwsMatching(/Invariant: Intrinsic node double attached/, () =>
            mount(
                testRoot,
                <div>
                    {jsx}
                    {jsx}
                </div>
            )
        );
    });

    test('a shallow element that is unmounted and then remounted holds the same element reference if retained', () => {
        const references: Element[] = [];
        const refFunc = (val: Element | undefined) => {
            if (val) references.push(val);
        };
        const state = model({ isMounted: false });
        const jsx = <p ref={refFunc}>hello, world!</p>;
        jsx.retain();
        mount(testRoot, <div>{calc(() => state.isMounted && jsx)}</div>);

        assert.deepEqual([], references);

        state.isMounted = true;
        flush();

        assert.is(1, references.length);
        references[0].setAttribute('data-magic', 'it works!');

        state.isMounted = false;
        flush();

        assert.is(1, references.length);
        assert.isFalsy(testRoot.contains(references[0]));

        state.isMounted = true;
        flush();

        assert.is(2, references.length);
        assert.is(references[0], references[1]);
        assert.isTruthy(testRoot.contains(references[0]));
        assert.is('it works!', references[1].getAttribute('data-magic'));
    });

    test('a shallow element that is unmounted and then remounted renders different element references if not retained', () => {
        const references: Element[] = [];
        const refFunc = (val: Element | undefined) => {
            if (val) references.push(val);
        };
        const state = model({ isMounted: false });
        const jsx = <p ref={refFunc}>hello, world!</p>;
        mount(testRoot, <div>{calc(() => state.isMounted && jsx)}</div>);

        assert.deepEqual([], references);

        state.isMounted = true;
        flush();

        assert.is(1, references.length);
        references[0].setAttribute('data-magic', 'it works!');

        state.isMounted = false;
        flush();

        assert.is(1, references.length);
        assert.isFalsy(testRoot.contains(references[0]));

        state.isMounted = true;
        flush();

        assert.is(2, references.length);
        assert.isNot(references[0], references[1]);
        assert.isFalsy(testRoot.contains(references[0]));
        assert.isTruthy(testRoot.contains(references[1]));
        assert.isFalsy(references[1].hasAttribute('data-magic'));
    });

    test('a deep element that is unmounted and then remounted holds the same element reference if retained', () => {
        const references: Element[] = [];
        const refFunc = (val: Element | undefined) => {
            if (val) references.push(val);
        };
        const state = model({ isMounted: false });
        const jsx = (
            <div id="outer">
                <p ref={refFunc}>
                    <strong>hello</strong>, <em>world</em>!
                </p>
            </div>
        );
        jsx.retain();
        mount(testRoot, <div>{calc(() => state.isMounted && jsx)}</div>);

        assert.deepEqual([], references);

        state.isMounted = true;
        flush();

        assert.is(1, references.length);
        references[0].setAttribute('data-magic', 'it works!');

        state.isMounted = false;
        flush();

        assert.is(1, references.length);
        assert.isFalsy(testRoot.contains(references[0]));

        state.isMounted = true;
        flush();

        assert.is(2, references.length);
        assert.is(references[0], references[1]);
        assert.isTruthy(testRoot.contains(references[0]));
        assert.is('it works!', references[1].getAttribute('data-magic'));
    });

    test('a deep element that is unmounted and then remounted holds different element references if not retained', () => {
        const references: Element[] = [];
        const refFunc = (val: Element | undefined) => {
            if (val) references.push(val);
        };
        const state = model({ isMounted: false });
        const jsx = (
            <div id="outer">
                <p ref={refFunc}>
                    <strong>hello</strong>, <em>world</em>!
                </p>
            </div>
        );
        mount(testRoot, <div>{calc(() => state.isMounted && jsx)}</div>);

        assert.deepEqual([], references);

        state.isMounted = true;
        flush();

        assert.is(1, references.length);
        references[0].setAttribute('data-magic', 'it works!');

        state.isMounted = false;
        flush();

        assert.is(1, references.length);
        assert.isFalsy(testRoot.contains(references[0]));

        state.isMounted = true;
        flush();

        assert.is(2, references.length);
        assert.isNot(references[0], references[1]);
        assert.isFalsy(testRoot.contains(references[0]));
        assert.isTruthy(testRoot.contains(references[1]));
        assert.isFalsy(references[1].hasAttribute('data-magic'));
    });

    test('reused jsx can be reparented', () => {
        const references: Element[] = [];
        const refFunc = (val: Element | undefined) => {
            if (val) references.push(val);
        };
        const state = model({ leftSide: true });
        const jsx = (
            <span ref={refFunc}>
                <strong>hello</strong>, <em>world</em>!
            </span>
        );
        jsx.retain();
        mount(
            testRoot,
            <div>
                <div id="left">
                    Left: {calc(() => (state.leftSide ? jsx : null))}
                </div>
                <div id="right">
                    Right: {calc(() => (state.leftSide ? null : jsx))}
                </div>
            </div>
        );

        assert.is(1, references.length);
        references[0].setAttribute('data-magic', 'it works!');
        assert.is(testRoot.querySelector('#left'), references[0].parentNode);

        state.leftSide = false;
        flush();

        assert.is(2, references.length);
        assert.is(references[0], references[1]);
        assert.is(testRoot.querySelector('#right'), references[0].parentNode);
        assert.is('it works!', references[1].getAttribute('data-magic'));

        state.leftSide = true;
        flush();

        assert.is(3, references.length);
        assert.is(references[1], references[2]);
        assert.is(testRoot.querySelector('#left'), references[0].parentNode);
        assert.is('it works!', references[2].getAttribute('data-magic'));
    });

    test('reused jsx can be reparented into a different mount point', () => {
        const references: Element[] = [];
        const refFunc = (val: Element | undefined) => {
            if (val) references.push(val);
        };
        const state = model({ leftSide: true });
        const jsx = (
            <span ref={refFunc}>
                <strong>hello</strong>, <em>world</em>!
            </span>
        );
        jsx.retain();
        const leftMount = document.createElement('div');
        const rightMount = document.createElement('div');

        testRoot.appendChild(leftMount);
        testRoot.appendChild(rightMount);
        mount(
            leftMount,
            <div id="left">
                Left: {calc(() => (state.leftSide ? jsx : null))}
            </div>
        );
        mount(
            rightMount,
            <div id="right">
                Right: {calc(() => (state.leftSide ? null : jsx))}
            </div>
        );

        assert.is(1, references.length);
        references[0].setAttribute('data-magic', 'it works!');
        assert.is(leftMount.querySelector('#left'), references[0].parentNode);

        state.leftSide = false;
        flush();

        assert.is(2, references.length);
        assert.is(references[0], references[1]);
        assert.is(rightMount.querySelector('#right'), references[0].parentNode);
        assert.is('it works!', references[1].getAttribute('data-magic'));

        state.leftSide = true;
        flush();

        assert.is(3, references.length);
        assert.is(references[1], references[2]);
        assert.is(leftMount.querySelector('#left'), references[0].parentNode);
        assert.is('it works!', references[2].getAttribute('data-magic'));
    });
});

suite('error handling', () => {
    test('components can catch render errors', () => {
        const Exploder: Component = () => {
            throw new Error('oh no');
        };
        const ErrorHandler: Component = (props, { onError }) => {
            onError((error: Error) => {
                return (
                    <div class="target" id="error">
                        Got error: {error.message}
                    </div>
                );
            });
            return (
                <div class="target" id="normal">
                    Normal
                    <div id="inner">
                        <Exploder />
                    </div>
                </div>
            );
        };
        mount(testRoot, <ErrorHandler />);
        assert.is(
            'Got error: oh no',
            testRoot.querySelector('.target')?.textContent
        );
    });

    test('components can catch calculation render errors when children rendered', () => {
        const Exploder: Component = () => {
            throw new Error('oh no');
        };
        const state = model({
            error: true,
        });
        const ErrorHandler: Component = (props, { onError }) => {
            onError((error: Error) => {
                return (
                    <div class="target" id="error">
                        Got error: {error.message}
                    </div>
                );
            });
            return (
                <div class="target" id="normal">
                    Normal
                    <div id="inner">
                        {calc(() => state.error && <Exploder />)}
                    </div>
                </div>
            );
        };
        mount(testRoot, <ErrorHandler />);
        assert.is(
            'Got error: oh no',
            testRoot.querySelector('.target')?.textContent
        );
    });

    test('components can catch render errors when children rerendered', () => {
        const Exploder: Component = () => {
            throw new Error('oh no');
        };
        const state = model({
            error: false,
        });
        const ErrorHandler: Component = (props, { onError }) => {
            onError((error: Error) => {
                return (
                    <div class="target" id="error">
                        Got error: {error.message}
                    </div>
                );
            });
            return (
                <div class="target" id="normal">
                    Normal
                    <div id="inner">
                        {calc(() => state.error && <Exploder />)}
                    </div>
                </div>
            );
        };
        mount(testRoot, <ErrorHandler />);
        assert.is('Normal', testRoot.querySelector('.target')?.textContent);
        state.error = true;
        flush();
        assert.is(
            'Got error: oh no',
            testRoot.querySelector('.target')?.textContent
        );
    });

    test('components can catch render errors when collection children rendered', () => {
        const Exploder: Component = () => {
            throw new Error('oh no');
        };
        const items = collection([0, 1, 2]);
        const ErrorHandler: Component = (props, { onError }) => {
            onError((error: Error) => {
                return (
                    <div class="target" id="error">
                        Got error: {error.message}
                    </div>
                );
            });
            return (
                <div class="target" id="normal">
                    Normal
                    <div id="inner">
                        {items.mapView((num) =>
                            num % 2 === 1 ? <Exploder /> : <div>num:${num}</div>
                        )}
                    </div>
                </div>
            );
        };
        mount(testRoot, <ErrorHandler />);
        assert.is(
            'Got error: oh no',
            testRoot.querySelector('.target')?.textContent
        );
    });

    test('components can catch render errors when collection children rendered', () => {
        const Exploder: Component = () => {
            throw new Error('oh no');
        };
        const items = collection([0, 2]);
        const ErrorHandler: Component = (props, { onError }) => {
            onError((error: Error) => {
                return (
                    <div class="target" id="error">
                        Got error: {error.message}
                    </div>
                );
            });
            return (
                <div class="target" id="normal">
                    Normal{' '}
                    <div id="inner">
                        {items.mapView((num) =>
                            num % 2 === 1 ? <Exploder /> : <div>num:{num};</div>
                        )}
                    </div>
                </div>
            );
        };
        mount(testRoot, <ErrorHandler />);
        assert.is(
            'Normal num:0;num:2;',
            testRoot.querySelector('.target')?.textContent
        );
        items.splice(1, 0, 1); // [0, 2] -> [0, 1, 2]
        flush();
        assert.is(
            'Got error: oh no',
            testRoot.querySelector('.target')?.textContent
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

        test('fails when passed one or more nodes', () => {
            assert.isTruthy(
                // @ts-expect-error
                <ParentWithNoChildren>{'hi'}</ParentWithNoChildren>
            );

            assert.isTruthy(
                // @ts-expect-error
                <ParentWithNoChildren>
                    {'hi'}
                    {'hi'}
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

    suite('parent with one child node', () => {
        const ParentWithExactlyOneChild: Component<{ children: JSX.Node }> =
            () => <div />;
        const ParentWithOptionallyOneChild: Component<{
            children?: JSX.Node;
        }> = () => <div />;

        test('exact fails with no children', () => {
            // @ts-expect-error
            assert.isTruthy(<ParentWithExactlyOneChild />);
            assert.isTruthy(<ParentWithOptionallyOneChild />);
        });

        test('typechecks with one child', () => {
            assert.isTruthy(
                <ParentWithExactlyOneChild>{'hi'}</ParentWithExactlyOneChild>
            );
            assert.isTruthy(
                <ParentWithOptionallyOneChild>
                    {'hi'}
                </ParentWithOptionallyOneChild>
            );
        });

        test('fails with multiple children', () => {
            assert.isTruthy(
                // TODO: ts-expect-error does not work here because JSX.Node is a recursive array of JSX.Node
                <ParentWithExactlyOneChild>
                    {'hi'}
                    {'hi'}
                </ParentWithExactlyOneChild>
            );
            assert.isTruthy(
                // TODO: ts-expect-error does not work here because JSX.Node is a recursive array of JSX.Node
                <ParentWithOptionallyOneChild>
                    {'hi'}
                    {'hi'}
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

    suite(
        'parent with zero or 2+ children nodes (this is odd and a weird limitation of TypeScript & JSX)',
        () => {
            const ParentWithExactlyManyChild: Component<{
                children: JSX.Node[];
            }> = () => <div />;
            const ParentWithOptionallyManyChild: Component<{
                children?: JSX.Node[];
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
                        {'hi'}
                    </ParentWithExactlyManyChild>
                );
                assert.isTruthy(
                    <ParentWithOptionallyManyChild>
                        {/* @ts-expect-error */}
                        {'hi'}
                    </ParentWithOptionallyManyChild>
                );
            });

            test('typechecks with multiple children', () => {
                assert.isTruthy(
                    <ParentWithExactlyManyChild>
                        {'hi'}
                        {'hi'}
                    </ParentWithExactlyManyChild>
                );
                assert.isTruthy(
                    <ParentWithOptionallyManyChild>
                        {'hi'}
                        {'hi'}
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

    suite('parent with any number of child nodes', () => {
        const ParentWithOneOrMoreChildren: Component<{
            children: JSX.Node | JSX.Node[];
        }> = () => <div />;
        const ParentWithOptionallyAnyChildren: Component<{
            children?: JSX.Node | JSX.Node[];
        }> = () => <div />;

        test('typechecks fails with no children', () => {
            // @ts-expect-error
            assert.isTruthy(<ParentWithOneOrMoreChildren />);
            assert.isTruthy(<ParentWithOptionallyAnyChildren />);
        });

        test('typechecks with one child (this is odd!)', () => {
            assert.isTruthy(
                <ParentWithOneOrMoreChildren>
                    {'hi'}
                </ParentWithOneOrMoreChildren>
            );
            assert.isTruthy(
                <ParentWithOptionallyAnyChildren>
                    {'hi'}
                </ParentWithOptionallyAnyChildren>
            );
        });

        test('typechecks with multiple children', () => {
            assert.isTruthy(
                <ParentWithOneOrMoreChildren>
                    {'hi'}
                    {'hi'}
                </ParentWithOneOrMoreChildren>
            );
            assert.isTruthy(
                <ParentWithOptionallyAnyChildren>
                    {'hi'}
                    {'hi'}
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

        test('JSX.Element can only receive rendered jsx', () => {
            /* @ts-expect-error */
            assert.isFalsy(receiveJSXElement('strings'));
            /* @ts-expect-error */
            assert.isFalsy(receiveJSXElement(123));
            /* @ts-expect-error */
            assert.isFalsy(receiveJSXElement(null));
            /* @ts-expect-error */
            assert.isFalsy(receiveJSXElement(undefined));
            /* @ts-expect-error */
            assert.isFalsy(receiveJSXElement(Symbol('hi')));
            /* @ts-expect-error */
            assert.isFalsy(receiveJSXElement((a: number, b: number) => a + b));
            /* @ts-expect-error */
            assert.isFalsy(receiveJSXElement(calc(() => 'strings')));
            /* @ts-expect-error */
            assert.isFalsy(receiveJSXElement(collection(['strings'])));
            assert.isFalsy(
                receiveJSXElement(
                    /* @ts-expect-error */
                    collection(['strings']).mapView((item) => item)
                )
            );
            assert.isTruthy(receiveJSXElement(<p>exising jsx</p>));

            function Component() {
                return <p>cool</p>;
            }
            assert.isTruthy(receiveJSXElement(<Component />));

            class MyClass {
                render() {
                    return <div>nope</div>;
                }
            }
            /* @ts-expect-error */
            assert.isFalsy(receiveJSXElement(<MyClass />));
        });
    });

    suite('JSX.Node', () => {
        function receiveJSXElement(jsxElement: JSX.Node) {
            return true;
        }

        test('JSX.Node can receive any valid jsx node', () => {
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

        test('JSX.Node cannot receive arbitrary objects', () => {
            /* @ts-expect-error */
            assert.isFalsy(receiveJSXElement({ what: 'ok' }));
        });

        test('JSX.Node can receive basic types wrapped in calculations', () => {
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

        test('JSX.Node can receive basic types wrapped in collections', () => {
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

        test('JSX.Node can receive basic types wrapped in views', () => {
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

    test('event target passed as second parameter', () => {
        const divHandler = (event: MouseEvent, div: HTMLDivElement) => {
            return false;
        };

        const goodJSx = <div on:click={divHandler} />;
        assert.isTruthy(goodJSx);

        // @ts-expect-error
        const badJSX = <button on:click={divHandler} />;
        assert.isTruthy(badJSX);
    });
}

suite('automatic memory management', () => {
    test('component with calculation, effect leaves empty graph', () => {
        const Item: Component<{ name: string }> = ({ name }, { onMount }) => {
            const state = model(
                {
                    mountCount: 0,
                    count: 0,
                },
                'item:state'
            );
            onMount(() => {
                state.mountCount += 1;
            });
            return (
                <div>
                    <button
                        on:click={() => {
                            state.count += 1;
                        }}
                    >
                        Increment
                    </button>
                    <div
                        data-mount-count={calc(
                            () => state.mountCount.toString(),
                            'data-mount-count'
                        )}
                    >
                        {name}: {calc(() => state.count, 'click-count')}
                    </div>
                </div>
            );
        };
        const unmount = mount(
            testRoot,
            <div>
                <Item name="cool" />
            </div>
        );
        assert.is(
            '0',
            testRoot
                .querySelector('[data-mount-count]')
                ?.getAttribute('data-mount-count')
        );
        assert.is(
            'cool: 0',
            testRoot.querySelector('[data-mount-count]')?.textContent
        );
        flush();
        assert.is(
            '1',
            testRoot
                .querySelector('[data-mount-count]')
                ?.getAttribute('data-mount-count')
        );
        assert.is(
            'cool: 0',
            testRoot.querySelector('[data-mount-count]')?.textContent
        );
        testRoot
            .querySelector('button')
            ?.dispatchEvent(new MouseEvent('click'));
        flush();
        assert.is(
            '1',
            testRoot
                .querySelector('[data-mount-count]')
                ?.getAttribute('data-mount-count')
        );
        assert.is(
            'cool: 1',
            testRoot.querySelector('[data-mount-count]')?.textContent
        );
        testRoot
            .querySelector('button')
            ?.dispatchEvent(new MouseEvent('click'));
        flush();
        assert.is(
            '1',
            testRoot
                .querySelector('[data-mount-count]')
                ?.getAttribute('data-mount-count')
        );
        assert.is(
            'cool: 2',
            testRoot.querySelector('[data-mount-count]')?.textContent
        );
        testRoot
            .querySelector('button')
            ?.dispatchEvent(new MouseEvent('click'));
        flush();
        assert.is(
            '1',
            testRoot
                .querySelector('[data-mount-count]')
                ?.getAttribute('data-mount-count')
        );
        assert.is(
            'cool: 3',
            testRoot.querySelector('[data-mount-count]')?.textContent
        );
        unmount();

        assert.deepEqual([], debugGetGraph()._test_getVertices());
    });

    test('component with mapView leaves empty graph', () => {
        const items = collection(['foo', 'bar', 'baz']);
        const Item: Component<{ name: string }> = ({ name }) => <li>{name}</li>;
        const Items: Component<{}> = () => (
            <ul>
                {items.mapView((item) => (
                    <Item name={item} />
                ))}
            </ul>
        );
        const unmount = mount(testRoot, <Items />);
        flush();
        items.push('bum');
        flush();
        unmount();

        assert.deepEqual([], debugGetGraph()._test_getVertices());
    });
});
