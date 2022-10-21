import Gooey, {
    Calculation,
    Collection,
    Component,
    LogLevel,
    Model,
    calc,
    collection,
    flush,
    getLogLevel,
    model,
    mount,
    setLogLevel,
    reset,
    subscribe,
} from './index';
import { Graph } from './graph';
import { randint } from './util';
import { suite, test, beforeEach, afterEach, assert } from '@srhazi/gooey-test';

let testRoot: HTMLElement = document.getElementById('test-root')!;
const mrt = assert.medianRuntimeLessThan;
assert.medianRuntimeLessThan = (ms: number, fn: any) =>
    mrt.call(assert, ms * 1000, fn);

beforeEach(() => {
    testRoot = document.getElementById('test-root')!;
    subscribe();
});

suite('perf tests', () => {
    let logLevel: LogLevel | null = null;

    beforeEach(() => {
        if (typeof gc === 'undefined') {
            assert.fail(
                'No global gc() function found. With chrome, pass --js-flags="--expose-gc"'
            );
        }
        reset();
        logLevel = getLogLevel();
        setLogLevel('error');
        gc();
    });

    afterEach(() => {
        if (logLevel) setLogLevel(logLevel);
        gc();
    });

    test('render 1000 flat, static items in 8ms', async () => {
        const COUNT = 1000;
        const items = collection<{ id: number }>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push({ id: i });
        }
        const Items = () => (
            <div>
                {items.mapView((item) => (
                    <div>{item.id}</div>
                ))}
            </div>
        );

        await assert.medianRuntimeLessThan(8, (measure) => {
            const unmount = measure(() => mount(testRoot, <Items />));
            unmount();
        });
    });

    test('empty 1000 flat, static items in 8ms', async () => {
        const COUNT = 1000;
        const items = collection<{ id: number }>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push({ id: i });
        }
        const Items = () => (
            <div>
                {items.mapView((item) => (
                    <div>{item.id}</div>
                ))}
            </div>
        );

        await assert.medianRuntimeLessThan(8, (measure) => {
            const unmount = mount(testRoot, <Items />);
            items.splice(0, items.length);
            measure(() => {
                flush();
            });
            unmount();
        });
    });

    test('render 1000 flat, component items in 15ms', async () => {
        const COUNT = 1000;
        const items = collection<{ id: number }>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push({ id: i });
        }
        const Item = ({ id }: { id: number }) => <div>{id}</div>;
        const Items = () => (
            <div>
                {calc(() => items.mapView((item) => <Item id={item.id} />))}
            </div>
        );

        await assert.medianRuntimeLessThan(15, (measure) => {
            const unmount = measure(() => mount(testRoot, <Items />));
            unmount();
        });
    });

    test('render 1000 flat, dynamic items in 24ms', async () => {
        const COUNT = 1000;
        const items = collection<Model<{ id: number }>>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push(model({ id: i }));
        }
        const Items = () => (
            <div>
                {calc(() =>
                    items.mapView((item) => <div>{calc(() => item.id)}</div>)
                )}
            </div>
        );

        await assert.medianRuntimeLessThan(24, (measure) => {
            const unmount = measure(() => mount(testRoot, <Items />));
            unmount();
        });
    });

    test('render 1000 flat, component+dynamic items in 30ms', async () => {
        const COUNT = 1000;
        const items = collection<Model<{ id: number }>>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push(model({ id: i }));
        }
        const Item = ({ item }: { item: Model<{ id: number }> }) => (
            <div>{calc(() => item.id)}</div>
        );
        const Items = () => (
            <div>
                {calc(() => items.mapView((item) => <Item item={item} />))}
            </div>
        );

        await assert.medianRuntimeLessThan(30, (measure) => {
            const unmount = measure(() => mount(testRoot, <Items />));
            unmount();
        });
    });

    test('add 1 item to end of 1000 flat items in 2ms', async () => {
        const COUNT = 1000;
        const Item = ({ id }: { id: number }) => <div>{calc(() => id)}</div>;
        const items = collection<Model<{ id: number }>>([], 'coll');
        for (let i = 0; i < COUNT; ++i) {
            items.push(model({ id: i }));
        }
        const Items = () => (
            <div>
                {calc(() => items.mapView((item) => <Item id={item.id} />))}
            </div>
        );

        const unmount = mount(testRoot, <Items />);
        flush();

        await assert.medianRuntimeLessThan(2, (measure) => {
            measure(() => {
                items.push(model({ id: 1001 }, 'new'));
                flush();
            });
            items.pop();
            flush();
        });

        unmount();
    });

    test('add 1 item to front of 1000 flat items in 150ms', async () => {
        const COUNT = 1000;
        const Item = ({ id }: { id: number }) => (
            <div>{calc(() => id, `calcitem-${id}`)}</div>
        );
        const items = collection<Model<{ id: number }>>([], 'collection');
        for (let i = 0; i < COUNT; ++i) {
            items.push(model({ id: i }, `model-${i}`));
        }
        const Items = () => (
            <div>
                {calc(
                    () =>
                        items.mapView(
                            (item) => <Item id={item.id} />,
                            'mapView'
                        ),
                    'calc-mapview'
                )}
            </div>
        );

        const unmount = mount(testRoot, <Items />);
        flush();
        await assert.medianRuntimeLessThan(150, (measure) => {
            // TODO: Wow this is slow!!! Graph is fucked
            measure(() => {
                items.unshift(model({ id: 1001 }, 'newmodel'));
                flush();
            });
            items.shift();
            flush();
        });
        unmount();
    });

    test('add 1 item to middle of 1000 flat items in 120ms', async () => {
        const COUNT = 1000;
        const Item = ({ id }: { id: number }) => <div>{calc(() => id)}</div>;
        const items = collection<Model<{ id: number }>>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push(model({ id: i }));
        }
        const Items = () => (
            <div>
                {calc(() => items.mapView((item) => <Item id={item.id} />))}
            </div>
        );

        const unmount = mount(testRoot, <Items />);
        await assert.medianRuntimeLessThan(120, (measure) => {
            // TODO: Wow this is slow!!! Graph is fucked
            measure(() => {
                items.splice(50, 0, model({ id: 1001 }));
                flush();
            });
            items.splice(50, 1);
            flush();
        });
        unmount();
    });

    test('empty 1000 flat items in 150ms', async () => {
        const COUNT = 1000;
        const Item = ({ id }: { id: number }) => <div>{calc(() => id)}</div>;
        const items = collection<Model<{ id: number }>>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push(model({ id: i }));
        }
        const Items = () => (
            <div>
                {calc(() => items.mapView((item) => <Item id={item.id} />))}
            </div>
        );

        const unmount = mount(testRoot, <Items />);
        await assert.medianRuntimeLessThan(150, (measure) => {
            // TODO: Wow this is slow!! Graph is fucked
            const toReadd = items.splice(0, items.length);
            measure(() => {
                flush();
            });
            items.push(...toReadd);
            flush();
        });
        unmount();
    });

    test('render 10 * 10 * 10 nested items in 30ms', async () => {
        type Item = Model<{ id: number }>;
        type Level1 = Collection<Model<{ id: number }>>;
        type Level2 = Collection<Collection<Model<{ id: number }>>>;
        type Level3 = Collection<Collection<Collection<Model<{ id: number }>>>>;

        const COUNT = 10;
        const level3: Level3 = collection<
            Collection<Collection<Model<{ id: number }>>>
        >([]);
        for (let j = 0; j < COUNT; ++j) {
            const level2: Level2 = collection<
                Collection<Model<{ id: number }>>
            >([]);
            for (let k = 0; k < COUNT; ++k) {
                const level1: Level1 = collection<Model<{ id: number }>>([]);
                for (let l = 0; l < COUNT; ++l) {
                    level1.push(model({ id: l }));
                }
                level2.push(level1);
            }
            level3.push(level2);
        }

        const Item = ({ id }: { id: number }) => <div>{calc(() => id)}</div>;
        const items = collection<Model<{ id: number }>>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push(model({ id: i }));
        }
        const Level1 = ({ items }: { items: Level1 }) => (
            <div>
                {calc(() => items.mapView((item) => <Item id={item.id} />))}
            </div>
        );
        const Level2 = ({ items }: { items: Level2 }) => (
            <div>
                {calc(() => items.mapView((item) => <Level1 items={item} />))}
            </div>
        );
        const Level3 = ({ items }: { items: Level3 }) => (
            <div>
                {calc(() => items.mapView((item) => <Level2 items={item} />))}
            </div>
        );

        await assert.medianRuntimeLessThan(30, (measure) => {
            const unmount = measure(() =>
                mount(testRoot, <Level3 items={level3} />)
            );
            unmount();
        });
    });

    test('update one of 10 * 10 * 10 nested items in 1ms', async () => {
        type Item = Model<{ id: number }>;
        type Level1 = Collection<Model<{ id: number }>>;
        type Level2 = Collection<Collection<Model<{ id: number }>>>;
        type Level3 = Collection<Collection<Collection<Model<{ id: number }>>>>;

        const COUNT = 10;
        const level3: Level3 = collection<
            Collection<Collection<Model<{ id: number }>>>
        >([]);
        for (let j = 0; j < COUNT; ++j) {
            const level2: Level2 = collection<
                Collection<Model<{ id: number }>>
            >([]);
            for (let k = 0; k < COUNT; ++k) {
                const level1: Level1 = collection<Model<{ id: number }>>([]);
                for (let l = 0; l < COUNT; ++l) {
                    level1.push(model({ id: l }));
                }
                level2.push(level1);
            }
            level3.push(level2);
        }

        const Item = ({ id }: { id: number }) => <div>{calc(() => id)}</div>;
        const items = collection<Model<{ id: number }>>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push(model({ id: i }));
        }
        const Level1 = ({ items }: { items: Level1 }) => (
            <div>
                {calc(() => items.mapView((item) => <Item id={item.id} />))}
            </div>
        );
        const Level2 = ({ items }: { items: Level2 }) => (
            <div>
                {calc(() => items.mapView((item) => <Level1 items={item} />))}
            </div>
        );
        const Level3 = ({ items }: { items: Level3 }) => (
            <div>
                {calc(() => items.mapView((item) => <Level2 items={item} />))}
            </div>
        );

        const unmount = mount(testRoot, <Level3 items={level3} />);
        await assert.medianRuntimeLessThan(1, (measure) => {
            measure(() => {
                level3[4][4][4].id = Math.random();
                flush();
            });
        });
        unmount();
    });

    test('update 1000 text nodes amongst 1000 flat items in 40ms', async () => {
        const COUNT = 1000;
        const Item = ({ item }: { item: Model<{ id: number }> }) => (
            <div>{calc(() => item.id, `item-${item.id}-calc`)}</div>
        );
        const items = collection<Model<{ id: number }>>([], 'items-coll');
        for (let i = 0; i < COUNT; ++i) {
            items.push(model({ id: i }, `model-${i}`));
        }
        const Items = () => (
            <div>
                {calc(
                    () =>
                        items.mapView(
                            (item) => <Item item={item} />,
                            'items-list'
                        ),
                    'items-list-calc'
                )}
            </div>
        );

        const unmount = mount(testRoot, <Items />);
        await assert.medianRuntimeLessThan(40, (measure) => {
            for (let j = 0; j < COUNT; ++j) {
                items[j].id += 1;
            }
            measure(() => {
                flush();
            });
        });
        unmount();
    });

    test('update 1000 dom attributes in 15ms', async () => {
        const COUNT = 1000;
        const Item = ({ item }: { item: Model<{ id: number }> }) => (
            <div data-whatever={calc(() => item.id)} />
        );
        const items = collection<Model<{ id: number }>>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push(model({ id: i }));
        }
        const Items = () => (
            <div>
                {calc(() => items.mapView((item) => <Item item={item} />))}
            </div>
        );

        const unmount = mount(testRoot, <Items />);
        await assert.medianRuntimeLessThan(15, (measure) => {
            measure(() => {
                for (let j = 0; j < COUNT; ++j) {
                    items[j].id = items[j].id + 1;
                }
                flush();
            });
        });
        unmount();
    });

    test('make 1000 calculations in 10ms', async () => {
        const COUNT = 1000;
        await assert.medianRuntimeLessThan(10, (measure) => {
            measure(() => {
                for (let i = 0; i < COUNT; ++i) {
                    calc(() => i);
                }
            });
        });
    });

    test('call 1000 calculations in 1ms', async () => {
        const COUNT = 1000;
        const calculations: Calculation<number>[] = [];
        await assert.medianRuntimeLessThan(1, (measure) => {
            for (let i = 0; i < COUNT; ++i) {
                const calculation = calc(() => i);
                calculation.retain();
                calculations.push(calculation);
            }
            measure(() => {
                for (let i = 0; i < COUNT; ++i) {
                    calculations[i]();
                }
            });
            for (let i = 0; i < COUNT; ++i) {
                calculations[i].release();
            }
            calculations.splice(0, calculations.length);
        });
    });

    test('allocate + retain 1000 calculations in 10ms', async () => {
        const COUNT = 1000;
        let calculations: Calculation<number>[] = [];
        await assert.medianRuntimeLessThan(10, (measure) => {
            measure(() => {
                for (let i = 0; i < COUNT; ++i) {
                    const calculation = calc(() => i);
                    calculation.retain();
                    calculations.push(calculation);
                }
            });
            for (let i = 0; i < COUNT; ++i) {
                calculations[i]();
            }
            for (let i = 0; i < COUNT; ++i) {
                calculations[i].release();
            }
            calculations = [];
        });
    });

    test('release 1000 calculations in 1ms', async () => {
        const COUNT = 1000;
        const calculations: Calculation<number>[] = [];
        await assert.medianRuntimeLessThan(1, (measure) => {
            for (let i = 0; i < COUNT; ++i) {
                const calculation = calc(() => i);
                calculation.retain();
                calculations.push(calculation);
            }
            for (let i = 0; i < COUNT; ++i) {
                calculations[i]();
            }
            measure(() => {
                for (let i = 0; i < COUNT; ++i) {
                    calculations[i].release();
                }
            });
            calculations.splice(0, calculations.length);
        });
    });

    test('update 1000 calculations in 4ms', async () => {
        const COUNT = 1000;
        const modelObj = model({ num: 0 });
        const calculations: Calculation<number>[] = [];
        for (let i = 0; i < COUNT; ++i) {
            const calculation = calc(() => {
                return i + modelObj.num;
            });
            calculation.retain();
            calculation();
            calculations.push(calculation);
        }
        await assert.medianRuntimeLessThan(4, (measure) => {
            measure(() => {
                modelObj.num += 1;
                flush();
            });
        });
        for (let i = 0; i < COUNT; ++i) {
            calculations[i].release();
        }
    });

    test('add 1000 nodes in 2ms', async () => {
        const COUNT = 1000;
        const objects: { $__id: number; i: number }[] = [];
        for (let i = 0; i < COUNT; ++i) {
            objects.push({ $__id: i, i });
        }
        await assert.medianRuntimeLessThan(2, (measure) => {
            // Build a random graph of 10k nodes and edges all consolidating on a single destination node
            const graph = new Graph(() => false);
            measure(() => {
                for (let i = 0; i < COUNT; ++i) {
                    graph.addVertex(objects[i]);
                }
            });
        });
    });

    test('add 1000 edges in 1ms', async () => {
        const COUNT = 1000;
        const objects: { $__id: number; i: number }[] = [];
        for (let i = 0; i < COUNT; ++i) {
            objects.push({ $__id: i, i });
        }
        await assert.medianRuntimeLessThan(1, (measure) => {
            // Build a random graph of 10k nodes and edges all consolidating on a single destination node
            const graph = new Graph(() => false);
            for (let i = 0; i < COUNT; ++i) {
                graph.addVertex(objects[i]);
            }
            const edges: [number, number][] = [];
            for (let i = 0; i < COUNT - 1; ++i) {
                const candidate = randint(i + 1, COUNT);
                edges.push([i, candidate]);
            }
            measure(() => {
                edges.forEach(([fromIndex, toIndex]) => {
                    graph.addEdge(
                        objects[fromIndex],
                        objects[toIndex],
                        Graph.EDGE_HARD
                    );
                });
            });
        });
    });

    test('allocate and process 10% dirty nodes in a 1000 node graph in 20ms', async () => {
        const COUNT = 1000;
        const objects: { $__id: number; i: number }[] = [];
        for (let i = 0; i < COUNT; ++i) {
            objects.push({ $__id: i, i });
        }
        await assert.medianRuntimeLessThan(20, (measure) => {
            // TODO: this should be much faster, it is slow due to topological sorting
            // Build a random graph of 10k nodes and edges all consolidating on a single destination node
            const graph = new Graph(() => false);
            for (let i = 0; i < COUNT; ++i) {
                graph.addVertex(objects[i]);
                if (Math.random() < 0.1) {
                    graph.markVertexDirty(objects[i]);
                }
            }
            for (let i = 0; i < COUNT - 1; ++i) {
                const candidate = randint(i + 1, COUNT);
                graph.addEdge(objects[i], objects[candidate], Graph.EDGE_HARD);
            }
            measure(() => {
                graph.process();
            });
        });
    });

    test('process 10% existing dirty nodes in a 1000 node graph in 20ms', async () => {
        const COUNT = 1000;
        const objects: { $__id: number; i: number }[] = [];
        for (let i = 0; i < COUNT; ++i) {
            objects.push({ $__id: i, i });
        }
        await assert.medianRuntimeLessThan(4, (measure) => {
            // Build a random graph of 10k nodes and edges all consolidating on a single destination node
            const graph = new Graph(() => false);
            for (let i = 0; i < COUNT; ++i) {
                graph.addVertex(objects[i]);
            }
            for (let i = 0; i < COUNT - 1; ++i) {
                const candidate = randint(i + 1, COUNT);
                graph.addEdge(objects[i], objects[candidate], Graph.EDGE_HARD);
            }
            graph.process();

            for (let i = 0; i < COUNT; ++i) {
                if (Math.random() < 0.1) {
                    graph.markVertexDirty(objects[i]);
                }
            }

            measure(() => {
                graph.process();
            });
        });
    });
});

suite('application benchmarks', () => {
    const measure = (name: string, fn: () => void) => {
        return () => {
            fn();
            flush();
        };
    };

    const Benchmark: Component = () => {
        const items = collection<Model<{ val: number }>>([]);
        let itemId = 0;

        const add1kItems = measure('add1k', () => {
            for (let i = 0; i < 1000; ++i) {
                items.push(model({ val: itemId++ }));
            }
        });

        const updateItems = measure('update', () => {
            items.forEach((item) => (item.val *= 2));
        });

        const clearItems = measure('clear', () => {
            items.splice(0, items.length);
        });

        return (
            <div>
                <p>
                    <button data-add on:click={add1kItems}>
                        Add 1k items
                    </button>
                    <button data-update on:click={updateItems}>
                        Update items
                    </button>
                    <button data-clear on:click={clearItems}>
                        Clear items
                    </button>
                </p>
                <ul style="height: 100px; overflow: auto; contain: strict">
                    {items.mapView((item) => (
                        <li>{calc(() => item.val)}</li>
                    ))}
                </ul>
            </div>
        );
    };

    test('add 1k', async () => {
        await assert.medianRuntimeLessThan(4, (measure) => {
            const unmount = mount(testRoot, <Benchmark />);
            const add = testRoot.querySelector('[data-add]')!;
            measure(() => {
                add.dispatchEvent(new Event('click'));
                flush();
            });
            unmount();
        });
    });

    test('append 1k', async () => {
        await assert.medianRuntimeLessThan(4, (measure) => {
            const unmount = mount(testRoot, <Benchmark />);
            const add = testRoot.querySelector('[data-add]')!;
            add.dispatchEvent(new Event('click'));
            measure(() => {
                add.dispatchEvent(new Event('click'));
                flush();
            });
            unmount();
        });
    });

    test('update 1k', async () => {
        await assert.medianRuntimeLessThan(4, (measure) => {
            const unmount = mount(testRoot, <Benchmark />);
            const add = testRoot.querySelector('[data-add]')!;
            const update = testRoot.querySelector('[data-update]')!;
            add.dispatchEvent(new Event('click'));
            flush();
            measure(() => {
                update.dispatchEvent(new Event('click'));
                flush();
            });
            unmount();
        });
    });

    test('clear 1k', async () => {
        await assert.medianRuntimeLessThan(4, (measure) => {
            const unmount = mount(testRoot, <Benchmark />);
            const add = testRoot.querySelector('[data-add]')!;
            const clear = testRoot.querySelector('[data-clear]')!;
            add.dispatchEvent(new Event('click'));
            flush();
            measure(() => {
                clear.dispatchEvent(new Event('click'));
                flush();
            });
            unmount();
        });
    });

    test('add 1k after update and clear', async () => {
        await assert.medianRuntimeLessThan(4, (measure) => {
            const unmount = mount(testRoot, <Benchmark />);
            const add = testRoot.querySelector('[data-add]')!;
            const update = testRoot.querySelector('[data-update]')!;
            const clear = testRoot.querySelector('[data-clear]')!;
            add.dispatchEvent(new Event('click'));
            flush();
            update.dispatchEvent(new Event('click'));
            flush();
            clear.dispatchEvent(new Event('click'));
            flush();
            measure(() => {
                add.dispatchEvent(new Event('click'));
                flush();
            });
            unmount();
        });
    });
});
