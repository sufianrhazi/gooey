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
} from './index';
import { DAG } from './dag';
import { randint } from './util';
import { suite, test, beforeEach, afterEach, assert } from './test';

const testRoot = document.getElementById('test-root');
if (!testRoot) throw new Error('oops');

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

    test('render 1000 flat, static items in 8ms', () => {
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

        assert.medianRuntimeLessThan(8, (measure) => {
            const unmount = measure(() => mount(testRoot, <Items />));
            unmount();
        });
    });

    test('render 1000 flat, component items in 8ms', () => {
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

        assert.medianRuntimeLessThan(8, (measure) => {
            const unmount = measure(() => mount(testRoot, <Items />));
            unmount();
        });
    });

    test('render 1000 flat, dynamic items in 18ms', () => {
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

        assert.medianRuntimeLessThan(18, (measure) => {
            const unmount = measure(() => mount(testRoot, <Items />));
            unmount();
        });
    });

    test('render 1000 flat, component+dynamic items in 20ms', () => {
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

        assert.medianRuntimeLessThan(20, (measure) => {
            const unmount = measure(() => mount(testRoot, <Items />));
            unmount();
        });
    });

    test('add 1 item to end of 1000 flat items in 2ms', () => {
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

        assert.medianRuntimeLessThan(2, (measure) => {
            measure(() => {
                items.push(model({ id: 1001 }));
                flush();
            });
            items.pop();
            flush();
        });

        unmount();
    });

    // TODO: this is *bad* why is this so much worse? Because by virtue of invalidating 999 items it takes an extra 1ms?
    test('add 1 item to front of 1000 flat items in 10ms', () => {
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
        assert.medianRuntimeLessThan(10, (measure) => {
            measure(() => {
                items.unshift(model({ id: 1001 }));
                flush();
            });
            items.shift();
            flush();
        });
        unmount();
    });

    // TODO: this is *bad* why is this so much worse? Because by virtue of invalidating 999 items it takes an extra 1ms?
    test('add 1 item to middle of 1000 flat items in 5ms', () => {
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
        assert.medianRuntimeLessThan(5, (measure) => {
            measure(() => {
                items.splice(500, 0, model({ id: 1001 }));
                flush();
            });
            items.splice(500, 1);
            flush();
        });
        unmount();
    });

    test('empty 1000 flat items in 19ms', () => {
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
        assert.medianRuntimeLessThan(19, (measure) => {
            const toReadd = items.splice(0, items.length);
            measure(() => {
                flush();
            });
            items.push(...toReadd);
            flush();
        });
        unmount();
    });

    test('render 10 * 10 * 10 nested items in 20ms', () => {
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

        assert.medianRuntimeLessThan(20, (measure) => {
            const unmount = measure(() =>
                mount(testRoot, <Level3 items={level3} />)
            );
            unmount();
        });
    });

    test('update one of 10 * 10 * 10 nested items in 2.5ms', () => {
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

        assert.medianRuntimeLessThan(2.5, (measure) => {
            measure(() => {
                level3[4][4][4].id = Math.random();
                flush();
            });
        });

        unmount();
    });

    // TODO: this takes a _while_ now
    test('update 1000 text nodes amongst 1000 flat items in 40ms', () => {
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
        assert.medianRuntimeLessThan(40, (measure) => {
            for (let j = 0; j < COUNT; ++j) {
                items[j].id += 1;
            }
            measure(() => {
                flush();
            });
        });
        unmount();
    });

    test('update 1000 dom attributes in 15ms', () => {
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
        assert.medianRuntimeLessThan(15, (measure) => {
            measure(() => {
                for (let j = 0; j < COUNT; ++j) {
                    items[j].id = items[j].id + 1;
                }
                flush();
            });
        });
        unmount();
    });

    test('make 1000 calculations in 0.75ms', () => {
        const COUNT = 1000;
        assert.medianRuntimeLessThan(0.75, (measure) => {
            measure(() => {
                for (let i = 0; i < COUNT; ++i) {
                    calc(() => i);
                }
            });
        });
    });

    test('call 1000 calculations in 0.25ms', () => {
        const COUNT = 1000;
        const calculations: Calculation<number>[] = [];
        assert.medianRuntimeLessThan(0.25, (measure) => {
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

    test('allocate + retain 1000 calculations in 1.5ms', () => {
        const COUNT = 1000;
        let calculations: Calculation<number>[] = [];
        assert.medianRuntimeLessThan(1.5, (measure) => {
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

    test('release 1000 calculations in 0.25ms', () => {
        const COUNT = 1000;
        const calculations: Calculation<number>[] = [];
        assert.medianRuntimeLessThan(0.25, (measure) => {
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

    test('update 1000 calculations in 2ms', () => {
        const COUNT = 1000;
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
        assert.medianRuntimeLessThan(2, (measure) => {
            measure(() => {
                modelObj.num += 1;
                flush();
            });
        });
        for (let i = 0; i < COUNT; ++i) {
            release(calculations[i]);
        }
    });

    test('add 1k nodes in 0.5ms', () => {
        const COUNT = 1_000;
        const objects: { i: number }[] = [];
        for (let i = 0; i < COUNT; ++i) {
            objects.push({ i });
        }
        assert.medianRuntimeLessThan(0.5, (measure) => {
            // Build a random graph of 10k nodes and edges all consolidating on a single destination node
            const dag = new DAG();
            measure(() => {
                for (let i = 0; i < COUNT; ++i) {
                    dag.addNode(objects[i]);
                }
            });
        });
    });

    test('add 1k edges in 1ms', () => {
        const COUNT = 1_000;
        const objects: { i: number }[] = [];
        for (let i = 0; i < COUNT; ++i) {
            objects.push({ i });
        }
        assert.medianRuntimeLessThan(1, (measure) => {
            // Build a random graph of 10k nodes and edges all consolidating on a single destination node
            const dag = new DAG();
            for (let i = 0; i < COUNT; ++i) {
                dag.addNode(objects[i]);
            }
            const edges: [number, number][] = [];
            for (let i = 0; i < COUNT - 1; ++i) {
                const candidate = randint(i + 1, COUNT);
                edges.push([i, candidate]);
            }
            measure(() => {
                edges.forEach(([fromIndex, toIndex]) => {
                    dag.addEdge(
                        objects[fromIndex],
                        objects[toIndex],
                        DAG.EDGE_HARD
                    );
                });
            });
        });
    });

    test('garbage collect lk nodes in 4ms', () => {
        const COUNT = 1_000;
        const objects: { i: number }[] = [];
        for (let i = 0; i < COUNT; ++i) {
            objects.push({ i });
        }

        assert.medianRuntimeLessThan(4, (measure) => {
            // Build a random graph of 10k nodes and edges all consolidating on a single destination node
            const dag = new DAG();
            for (let i = 0; i < COUNT; ++i) {
                dag.addNode(objects[i]);
            }
            for (let i = 0; i < COUNT - 1; ++i) {
                const candidate = randint(i + 1, COUNT);
                dag.addEdge(objects[i], objects[candidate], DAG.EDGE_HARD);
            }
            measure(() => {
                dag.garbageCollect();
            });
        });
    });

    test('toposort 10% dirty nodes in a 1k graph in 2ms', () => {
        const COUNT = 1_000;
        const objects: { i: number }[] = [];
        for (let i = 0; i < COUNT; ++i) {
            objects.push({ i });
        }
        assert.medianRuntimeLessThan(2, (measure) => {
            // Build a random graph of 10k nodes and edges all consolidating on a single destination node
            const dag = new DAG();
            for (let i = 0; i < COUNT; ++i) {
                dag.addNode(objects[i]);
                if (Math.random() < 0.05) {
                    dag.markNodeDirty(objects[i]);
                }
            }
            for (let i = 0; i < COUNT - 1; ++i) {
                const candidate = randint(i + 1, COUNT);
                dag.addEdge(objects[i], objects[candidate], DAG.EDGE_HARD);
            }
            measure(() => {
                dag.visitDirtyTopological(() => false);
            });
        });
    });
});
