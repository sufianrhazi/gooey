import Gooey, {
    Component,
    mount,
    collection,
    model,
    calc,
    subscribe,
    flush,
    IntrinsicObserver,
} from '../../index';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

subscribe(() => noop);

const strings = [
    'goo',
    'goober',
    'good',
    'Goodenia',
    'Goodeniaceae',
    'goodeniaceous',
    'Goodenoviaceae',
    'goodhearted',
    'goodheartedly',
    'goodheartedness',
    'gooding',
    'goodish',
    'goodishness',
    'goodlihead',
    'goodlike',
    'goodliness',
    'goodly',
    'goodman',
    'goodmanship',
    'goodness',
    'goods',
    'goodsome',
    'goodwife',
    'goodwill',
    'goodwillit',
    'goodwilly',
    'goody',
    'goodyear',
    'Goodyera',
    'goodyish',
    'goodyism',
    'goodyness',
    'goodyship',
    'goof',
    'goofer',
    'goofily',
    'goofiness',
    'goofy',
    'googly',
    'googol',
    'googolplex',
    'googul',
    'gook',
    'gool',
    'goolah',
    'gools',
    'gooma',
    'goon',
    'goondie',
    'goonie',
    'Goop',
    'goosander',
    'goose',
    'goosebeak',
    'gooseberry',
    'goosebill',
    'goosebird',
    'goosebone',
    'gooseboy',
    'goosecap',
    'goosefish',
    'gooseflower',
    'goosefoot',
    'goosegirl',
    'goosegog',
    'gooseherd',
    'goosehouse',
    'gooselike',
    'goosemouth',
    'gooseneck',
    'goosenecked',
    'gooserumped',
    'goosery',
    'goosetongue',
    'gooseweed',
    'goosewing',
    'goosewinged',
    'goosish',
    'goosishly',
    'goosishness',
    'goosy',
    'gopher',
    'gopherberry',
    'gopherroot',
    'gopherwood',
    'gopura',
    'Gor',
    'gor',
    'gora',
    'goracco',
    'goral',
    'goran',
    'gorb',
    'gorbal',
    'gorbellied',
    'gorbelly',
    'gorbet',
    'gorble',
    'gorblimy',
    'gorce',
];

const snapshotMemory = () => {
    const mozMemory =
        (performance as any).mozMemory?.gc || (performance as any).mozMemory;
    if ((window as any).gc) {
        (window as any).gc();
        (window as any).gc();
    }
    if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize as number;
    } else if (mozMemory && 'gcBytes' in mozMemory) {
        return mozMemory.gcBytes;
    }
    return 0;
};

const calcStats = (n: number[]) => {
    const sorted = n.slice().sort((a, b) => a - b);
    const size = n.length - 1;
    return {
        min: sorted[0],
        p05:
            (sorted[Math.floor(size * 0.05)] + sorted[Math.ceil(size * 0.05)]) /
            2,
        p10:
            (sorted[Math.floor(size * 0.1)] + sorted[Math.ceil(size * 0.1)]) /
            2,
        p50:
            (sorted[Math.floor(size * 0.5)] + sorted[Math.ceil(size * 0.5)]) /
            2,
        p90:
            (sorted[Math.floor(size * 0.9)] + sorted[Math.ceil(size * 0.9)]) /
            2,
        p95:
            (sorted[Math.floor(size * 0.95)] + sorted[Math.ceil(size * 0.95)]) /
            2,
        max: sorted[size],
    };
};

const kb = (n: number) => (n / 1024).toFixed(2).padStart(8, ' ') + 'kB';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DELAY = 50;
const NUM_RUNS = 50;

const TestCase: Component<{
    name: JSX.Node;
    test: (element: HTMLElement) => {
        start: () => void;
        stop: () => void;
        destroy: () => void;
    };
    children?: JSX.Node;
}> = ({ name, test, children }) => {
    const testRoot = document.createElement('div');
    const results = document.createElement('pre');
    const run = async () => {
        const testCase = test(testRoot);
        const allocs: number[] = [];
        const deltas: number[] = [];
        for (let i = 0; i < NUM_RUNS; ++i) {
            const a = snapshotMemory();
            testCase.start();
            await sleep(DELAY);
            const c = snapshotMemory();
            testCase.stop();
            await sleep(DELAY);
            const e = snapshotMemory();
            const delta = e - a;
            allocs.push(c - a);
            deltas.push(delta);
            const allocStats = calcStats(allocs);
            const cleanStats = calcStats(deltas);
            results.textContent = `
allocated memory  | leaked memory
----------------- | -----------------
min : ${kb(allocStats.min)}  |  min : ${kb(cleanStats.min)}
p05 : ${kb(allocStats.p05)}  |  p05 : ${kb(cleanStats.p05)}
p10 : ${kb(allocStats.p10)}  |  p10 : ${kb(cleanStats.p10)}
p50 : ${kb(allocStats.p50)}  |  p50 : ${kb(cleanStats.p50)}
p90 : ${kb(allocStats.p90)}  |  p90 : ${kb(cleanStats.p90)}
p95 : ${kb(allocStats.p95)}  |  p95 : ${kb(cleanStats.p95)}
max : ${kb(allocStats.max)}  |  max : ${kb(cleanStats.max)}
`;
        }
        testCase.destroy();
    };
    return (
        <fieldset class="test-case">
            <legend>{name}</legend>
            <button on:click={run}>Run test</button>
            <div>{children}</div>
            {results}
            <div style="width: 100px; height: 100px; overflow: hidden">
                {testRoot}
            </div>
        </fieldset>
    );
};

const App = () => (
    <>
        <h1>Memory test</h1>
        <p>
            A number of test cases to ensure we are properly releasing allocated
            memory. To get non-zero numbers:
        </p>
        <ul>
            <li>
                In Chrome, launch with{' '}
                <code>
                    --js-flags="--expose-gc" --enable-precise-memory-info
                </code>
            </li>
            <li>
                In Firefox, enable the <code>dom.enable_memory_stats</code>{' '}
                config in <code>about:config</code>. There is no way (afaict) to
                programmatically force gc, so this is less accurate than in
                Chrome.
            </li>
            <li>
                These numbers cannot be trusted -- only use as an easy check to
                determine if leaks have occurred (i.e. use a memory profiler).
            </li>
        </ul>
        <div class="test-cases">
            <TestCase
                name="Fragment of strings"
                test={(el) => {
                    let unmount: null | (() => void) = null;
                    return {
                        destroy: noop,
                        start: () => {
                            unmount = mount(el, <>{strings}</>);
                        },
                        stop: () => {
                            unmount?.();
                        },
                    };
                }}
            >
                <p>100 text fragments</p>
            </TestCase>
            <TestCase
                name="Fragment of elements"
                test={(el) => {
                    const elements = strings.map((text) => (
                        <div aria-label={text} tabindex={-1}>
                            {text}
                        </div>
                    ));
                    let unmount: null | (() => void) = null;
                    return {
                        destroy: noop,
                        start: () => {
                            unmount = mount(el, <>{elements}</>);
                        },
                        stop: () => {
                            unmount?.();
                        },
                    };
                }}
            >
                <p>100 elements with text</p>
            </TestCase>
            <TestCase
                name="Nested elements"
                test={(el) => {
                    const elements: JSX.Element[] = [];
                    for (let i = 0; i < 10; ++i) {
                        const items = [];
                        for (let j = 0; j < 10; ++j) {
                            items.push(<div>{strings[i * 10 + j]}</div>);
                        }
                        elements.push(<div>{items}</div>);
                    }
                    let unmount: null | (() => void) = null;
                    return {
                        destroy: noop,
                        start: () => {
                            unmount = mount(el, <>{elements}</>);
                        },
                        stop: () => {
                            unmount?.();
                        },
                    };
                }}
            >
                <p>100 (10*10) nested elements</p>
            </TestCase>
            <TestCase
                name="Calculated elements"
                test={(el) => {
                    const state = model({ value: 0 });
                    const elements: JSX.Element[] = [];
                    for (let i = 0; i < 100; ++i) {
                        elements.push(
                            <div>
                                {calc(() => strings[(i + state.value) % 100])}
                            </div>
                        );
                    }
                    let unmount: null | (() => void) = null;
                    return {
                        destroy: noop,
                        start: () => {
                            unmount = mount(el, <>{elements}</>);
                        },
                        stop: () => {
                            unmount?.();
                        },
                    };
                }}
            >
                <p>Mount 100 elements with calc children</p>
            </TestCase>
            <TestCase
                name="Updated elements"
                test={(el) => {
                    const state = model({ value: 0 });
                    const elements: JSX.Element[] = [];
                    for (let i = 0; i < 100; ++i) {
                        elements.push(
                            <div>
                                {calc(() => strings[(i + state.value) % 100])}
                            </div>
                        );
                    }
                    let unmount: null | (() => void) = null;
                    unmount = mount(el, <>{elements}</>);
                    return {
                        start: () => {
                            state.value += 1;
                            flush();
                        },
                        stop: noop,
                        destroy: () => {
                            unmount?.();
                        },
                    };
                }}
            >
                <p>Update 100 elements with calc children</p>
            </TestCase>
            <TestCase
                name="Collection mount"
                test={(el) => {
                    const items = collection(strings);
                    let unmount: null | (() => void) = null;
                    return {
                        destroy: noop,
                        start: () => {
                            unmount = mount(
                                el,
                                <>
                                    {items.mapView((item) => (
                                        <div>{item}</div>
                                    ))}
                                </>
                            );
                        },
                        stop: () => {
                            unmount?.();
                        },
                    };
                }}
            >
                <p>Mount collection of 100 elements</p>
            </TestCase>
            <TestCase
                name="Collection update"
                test={(el) => {
                    const items = collection(strings);
                    let unmount: null | (() => void) = null;
                    unmount = mount(
                        el,
                        <>
                            {items.mapView((item) => (
                                <div>{item}</div>
                            ))}
                        </>
                    );
                    return {
                        destroy: () => {
                            unmount?.();
                        },
                        start: () => {
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            items.push(items.shift()!);
                            flush();
                        },
                        stop: noop,
                    };
                }}
            >
                <p>Update collection of 100 elements</p>
            </TestCase>
            <TestCase
                name="Component mount"
                test={(el) => {
                    const MyComponent: Component<{ name: string }> = (
                        { name },
                        { onMount, onUnmount }
                    ) => {
                        onMount(noop);
                        onUnmount(noop);
                        return <div>{name}</div>;
                    };
                    let unmount: null | (() => void) = null;
                    return {
                        destroy: noop,
                        start: () => {
                            unmount = mount(
                                el,
                                <>
                                    {strings.map((item) => (
                                        <MyComponent name={item} />
                                    ))}
                                </>
                            );
                        },
                        stop: () => {
                            unmount?.();
                        },
                    };
                }}
            >
                <p>Mount 100 components</p>
            </TestCase>
            <TestCase
                name="Component retained unmount / mount"
                test={(el) => {
                    const state = model({
                        isMounted: true,
                    });
                    const MyComponent: Component<{ name: string }> = (
                        { name },
                        { onMount, onUnmount }
                    ) => {
                        onMount(noop);
                        onUnmount(noop);
                        return <div>{name}</div>;
                    };
                    const components = strings.map((item) => (
                        <MyComponent name={item} />
                    ));
                    components.forEach((component) => component.retain());
                    const unmount = mount(
                        el,
                        <>{calc(() => state.isMounted && components)}</>
                    );
                    return {
                        start: () => {
                            state.isMounted = false;
                            flush();
                            state.isMounted = true;
                            flush();
                        },
                        stop: noop,
                        destroy: () => {
                            unmount();
                            components.forEach((component) =>
                                component.release()
                            );
                        },
                    };
                }}
            >
                <p>Unmount and remount 100 retained components</p>
            </TestCase>
            <TestCase
                name="Component model subscribe"
                test={(el) => {
                    const state = model({ value: 0 });
                    const MyComponent: Component<{ name: string }> = (
                        { name },
                        { onMount }
                    ) => {
                        const div = document.createElement('div');
                        onMount(() => {
                            return model.subscribe(state, (effects) => {
                                for (const effect of effects) {
                                    if (effect.prop === 'value') {
                                        div.textContent = name + effect.value;
                                    }
                                }
                            });
                        });

                        return <>{div}</>;
                    };
                    const unmount = mount(
                        el,
                        <>
                            {strings.map((item) => (
                                <MyComponent name={item} />
                            ))}
                        </>
                    );
                    return {
                        destroy: () => {
                            unmount();
                        },
                        start: () => {
                            state.value += 1;
                            flush();
                        },
                        stop: noop,
                    };
                }}
            >
                <p>Run 100 component effects</p>
            </TestCase>
            <TestCase
                name="IntrinsicObserver"
                test={(el) => {
                    const state = model({
                        visible: false,
                        mountNodes: 0,
                        mountElements: 0,
                        unmountNodes: 0,
                        unmountElements: 0,
                    });
                    const unmount = mount(
                        el,
                        <>
                            <div>
                                Elements: {calc(() => state.mountElements)} /{' '}
                                {calc(() => state.unmountElements)}
                            </div>
                            <div>
                                Nodes: {calc(() => state.mountNodes)} /{' '}
                                {calc(() => state.unmountNodes)}
                            </div>
                            <IntrinsicObserver
                                elementCallback={(el, action) => {
                                    if (action === 'mount')
                                        state.mountElements += 1;
                                    if (action === 'unmount')
                                        state.unmountElements += 1;
                                }}
                                nodeCallback={(node, action) => {
                                    if (action === 'mount')
                                        state.mountNodes += 1;
                                    if (action === 'unmount')
                                        state.unmountNodes += 1;
                                }}
                            >
                                {calc(
                                    () =>
                                        state.visible &&
                                        strings.map((str, i) =>
                                            i % 2 === 0 ? <p>{str}</p> : str
                                        )
                                )}
                            </IntrinsicObserver>
                        </>
                    );
                    return {
                        destroy: () => {
                            unmount();
                        },
                        start: () => {
                            state.visible = true;
                            flush();
                            state.visible = false;
                            flush();
                        },
                        stop: noop,
                    };
                }}
            >
                <p>
                    Mount and unmount 100 strings (50 Text nodes; 50 elements
                    with Text nodes) observed by a IntrinsicObserver
                </p>
            </TestCase>
        </div>
    </>
);

const root = document.getElementById('app');
if (root) {
    mount(root, <App />);
}
