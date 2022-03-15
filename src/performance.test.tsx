import Revise, {
    Calculation,
    Collection,
    LogLevel,
    Model,
    calc,
    collection,
    flush,
    getLogLevel,
    model,
    mount,
    release,
    retain,
    setLogLevel,
    reset,
    subscribe,
} from './index';
import { Graph } from './graph';
import { randint } from './util';
import { suite, test, beforeEach, afterEach, assert } from '@srhazi/test-jig';

let testRoot: HTMLElement = document.getElementById('test-root')!;

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

    test('render 100 flat, static items in 8ms', async () => {
        const COUNT = 100;
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

    test('render 100 flat, component items in 8ms', async () => {
        const COUNT = 100;
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

        await assert.medianRuntimeLessThan(8, (measure) => {
            const unmount = measure(() => mount(testRoot, <Items />));
            unmount();
        });
    });

    test('render 100 flat, dynamic items in 18ms', async () => {
        const COUNT = 100;
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

        await assert.medianRuntimeLessThan(18, (measure) => {
            const unmount = measure(() => mount(testRoot, <Items />));
            unmount();
        });
    });

    test('render 100 flat, component+dynamic items in 20ms', async () => {
        const COUNT = 100;
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

        await assert.medianRuntimeLessThan(20, (measure) => {
            const unmount = measure(() => mount(testRoot, <Items />));
            unmount();
        });
    });

    test('add 1 item to end of 100 flat items in 2ms', async () => {
        const COUNT = 100;
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

    test('add 1 item to front of 100 flat items in 10ms', async () => {
        const COUNT = 100;
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
        await assert.medianRuntimeLessThan(10, (measure) => {
            measure(() => {
                items.unshift(model({ id: 1001 }, 'newmodel'));
                flush();
            });
            items.shift();
            flush();
        });
        unmount();
    });

    test('add 1 item to middle of 100 flat items in 5ms', async () => {
        const COUNT = 100;
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
        await assert.medianRuntimeLessThan(5, (measure) => {
            measure(() => {
                items.splice(50, 0, model({ id: 1001 }));
                flush();
            });
            items.splice(50, 1);
            flush();
        });
        unmount();
    });

    test('empty 100 flat items in 19ms', async () => {
        const COUNT = 100;
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
        await assert.medianRuntimeLessThan(19, (measure) => {
            const toReadd = items.splice(0, items.length);
            measure(() => {
                flush();
            });
            items.push(...toReadd);
            flush();
        });
        unmount();
    });

    test('render 10 * 10 nested items in 20ms', async () => {
        type Item = Model<{ id: number }>;
        type Level1 = Collection<Model<{ id: number }>>;
        type Level2 = Collection<Collection<Model<{ id: number }>>>;

        const COUNT = 10;
        const level2: Level2 = collection<Collection<Model<{ id: number }>>>(
            []
        );
        for (let k = 0; k < COUNT; ++k) {
            const level1: Level1 = collection<Model<{ id: number }>>([]);
            for (let l = 0; l < COUNT; ++l) {
                level1.push(model({ id: l }));
            }
            level2.push(level1);
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

        await assert.medianRuntimeLessThan(20, (measure) => {
            const unmount = measure(() =>
                mount(testRoot, <Level2 items={level2} />)
            );
            unmount();
        });
    });

    test('update one of 10 * 10 nested items in 2.5ms', async () => {
        type Item = Model<{ id: number }>;
        type Level1 = Collection<Model<{ id: number }>>;
        type Level2 = Collection<Collection<Model<{ id: number }>>>;

        const COUNT = 10;
        const level2: Level2 = collection<Collection<Model<{ id: number }>>>(
            []
        );
        for (let k = 0; k < COUNT; ++k) {
            const level1: Level1 = collection<Model<{ id: number }>>([]);
            for (let l = 0; l < COUNT; ++l) {
                level1.push(model({ id: l }));
            }
            level2.push(level1);
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

        const unmount = mount(testRoot, <Level2 items={level2} />);

        await assert.medianRuntimeLessThan(2.5, (measure) => {
            measure(() => {
                level2[4][4].id = Math.random();
                flush();
            });
        });

        unmount();
    });

    test('update 100 text nodes amongst 100 flat items in 40ms', async () => {
        const COUNT = 100;
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

    test('update 100 dom attributes in 15ms', async () => {
        const COUNT = 100;
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

    test('make 100 calculations in 0.75ms', async () => {
        const COUNT = 100;
        await assert.medianRuntimeLessThan(0.75, (measure) => {
            measure(() => {
                for (let i = 0; i < COUNT; ++i) {
                    calc(() => i);
                }
            });
        });
    });

    test('call 100 calculations in 0.25ms', async () => {
        const COUNT = 100;
        const calculations: Calculation<number>[] = [];
        await assert.medianRuntimeLessThan(0.25, (measure) => {
            for (let i = 0; i < COUNT; ++i) {
                const calculation = calc(() => i);
                retain(calculation);
                calculations.push(calculation);
            }
            measure(() => {
                for (let i = 0; i < COUNT; ++i) {
                    calculations[i]();
                }
            });
            for (let i = 0; i < COUNT; ++i) {
                release(calculations[i]);
            }
            calculations.splice(0, calculations.length);
        });
    });

    test('allocate + retain 100 calculations in 1.5ms', async () => {
        const COUNT = 100;
        let calculations: Calculation<number>[] = [];
        await assert.medianRuntimeLessThan(1.5, (measure) => {
            measure(() => {
                for (let i = 0; i < COUNT; ++i) {
                    const calculation = calc(() => i);
                    retain(calculation);
                    calculations.push(calculation);
                }
            });
            for (let i = 0; i < COUNT; ++i) {
                calculations[i]();
            }
            for (let i = 0; i < COUNT; ++i) {
                release(calculations[i]);
            }
            calculations = [];
        });
    });

    test('release 100 calculations in 0.25ms', async () => {
        const COUNT = 100;
        const calculations: Calculation<number>[] = [];
        await assert.medianRuntimeLessThan(0.25, (measure) => {
            for (let i = 0; i < COUNT; ++i) {
                const calculation = calc(() => i);
                retain(calculation);
                calculations.push(calculation);
            }
            for (let i = 0; i < COUNT; ++i) {
                calculations[i]();
            }
            measure(() => {
                for (let i = 0; i < COUNT; ++i) {
                    release(calculations[i]);
                }
            });
            calculations.splice(0, calculations.length);
        });
    });

    test('update 100 calculations in 2ms', async () => {
        const COUNT = 100;
        const modelObj = model({ num: 0 });
        const calculations: Calculation<number>[] = [];
        for (let i = 0; i < COUNT; ++i) {
            const calculation = calc(() => {
                return i + modelObj.num;
            });
            retain(calculation);
            calculation();
            calculations.push(calculation);
        }
        await assert.medianRuntimeLessThan(2, (measure) => {
            measure(() => {
                modelObj.num += 1;
                flush();
            });
        });
        for (let i = 0; i < COUNT; ++i) {
            release(calculations[i]);
        }
    });

    test('add 100 nodes in 0.5ms', async () => {
        const COUNT = 100;
        const objects: { i: number }[] = [];
        for (let i = 0; i < COUNT; ++i) {
            objects.push({ i });
        }
        await assert.medianRuntimeLessThan(0.5, (measure) => {
            // Build a random graph of 10k nodes and edges all consolidating on a single destination node
            const graph = new Graph();
            measure(() => {
                for (let i = 0; i < COUNT; ++i) {
                    graph.addNode(objects[i]);
                }
            });
        });
    });

    test('add 100 edges in 1ms', async () => {
        const COUNT = 100;
        const objects: { i: number }[] = [];
        for (let i = 0; i < COUNT; ++i) {
            objects.push({ i });
        }
        await assert.medianRuntimeLessThan(1, (measure) => {
            // Build a random graph of 10k nodes and edges all consolidating on a single destination node
            const graph = new Graph();
            for (let i = 0; i < COUNT; ++i) {
                graph.addNode(objects[i]);
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

    test('process 10% dirty nodes in a 100 node graph in 2ms', async () => {
        const COUNT = 100;
        const objects: { i: number }[] = [];
        for (let i = 0; i < COUNT; ++i) {
            objects.push({ i });
        }
        await assert.medianRuntimeLessThan(2, (measure) => {
            // Build a random graph of 10k nodes and edges all consolidating on a single destination node
            const graph = new Graph();
            for (let i = 0; i < COUNT; ++i) {
                graph.addNode(objects[i]);
                if (Math.random() < 0.1) {
                    graph.markNodeDirty(objects[i]);
                }
            }
            for (let i = 0; i < COUNT - 1; ++i) {
                const candidate = randint(i + 1, COUNT);
                graph.addEdge(objects[i], objects[candidate], Graph.EDGE_HARD);
            }
            measure(() => {
                graph.process(() => false);
            });
        });
    });
});
