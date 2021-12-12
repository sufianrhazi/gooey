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
import { suite, test, beforeEach, afterEach, assert } from './test';

const testRoot = document.getElementById('test-root');
if (!testRoot) throw new Error('oops');

suite('perf tests', () => {
    let logLevel: LogLevel | null = null;

    beforeEach(() => {
        reset();
        logLevel = getLogLevel();
        setLogLevel('error');
    });

    afterEach(() => {
        if (logLevel) setLogLevel(logLevel);
    });

    test('render 1000 flat, static items in 5ms', () => {
        const COUNT = 1000;
        const items = collection<{ id: number }>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push({ id: i });
        }
        const Items = () => (
            <div>
                {calc(() => items.mapView((item) => <div>{item.id}</div>))}
            </div>
        );

        assert.medianRuntimeLessThan(5, (measure) => {
            const unmount = measure(() => mount(testRoot, <Items />));
            unmount();
        });
    });

    test('render 1000 flat, component items in 7ms', () => {
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

        assert.medianRuntimeLessThan(7, (measure) => {
            const unmount = measure(() => mount(testRoot, <Items />));
            unmount();
        });
    });

    test('render 1000 flat, dynamic items in 15ms', () => {
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

        assert.medianRuntimeLessThan(15, (measure) => {
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

    test('add 1 item to end of 1000 flat items in 1ms', () => {
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

        assert.medianRuntimeLessThan(1, (measure) => {
            measure(() => {
                items.push(model({ id: 1001 }));
                flush();
            });
            items.pop();
            flush();
        });

        unmount();
    });

    test('add 1 item to front of 1000 flat items in 3ms', () => {
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
        assert.medianRuntimeLessThan(3, (measure) => {
            measure(() => {
                items.unshift(model({ id: 1001 }));
                flush();
            });
            items.shift();
            flush();
        });
        unmount();
    });

    test('add 1 item to middle of 1000 flat items in 2ms', () => {
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
                items.splice(500, 0, model({ id: 1001 }));
                flush();
            });
            items.splice(500, 1);
            flush();
        });
        unmount();
    });

    test('empty 1000 flat items in 5ms', () => {
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
            const toReadd = measure(() => {
                const toReadd = items.splice(0, items.length);
                flush();
                return toReadd;
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
        const level3: Level3 = collection([]);
        for (let j = 0; j < COUNT; ++j) {
            const level2: Level2 = collection([]);
            for (let k = 0; k < COUNT; ++k) {
                const level1: Level1 = collection([]);
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

    test('update one of 10 * 10 * 10 nested items in 2ms', () => {
        type Item = Model<{ id: number }>;
        type Level1 = Collection<Model<{ id: number }>>;
        type Level2 = Collection<Collection<Model<{ id: number }>>>;
        type Level3 = Collection<Collection<Collection<Model<{ id: number }>>>>;

        const COUNT = 10;
        const level3: Level3 = collection([]);
        for (let j = 0; j < COUNT; ++j) {
            const level2: Level2 = collection([]);
            for (let k = 0; k < COUNT; ++k) {
                const level1: Level1 = collection([]);
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

        assert.medianRuntimeLessThan(2, (measure) => {
            measure(() => {
                level3[4][4][4].id = Math.random();
                flush();
            });
        });

        unmount();
    });

    test('update 1000 text nodes amongst 1000 flat items in 20ms', () => {
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
        assert.medianRuntimeLessThan(20, (measure) => {
            for (let j = 0; j < COUNT; ++j) {
                items[j].id += 1;
            }
            measure(() => {
                flush();
            });
        });
        unmount();
    });

    test('update 1000 dom attributes in 25ms', () => {
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
        assert.medianRuntimeLessThan(25, (measure) => {
            measure(() => {
                for (let j = 0; j < COUNT; ++j) {
                    items[j].id = items[j].id + 1;
                }
                flush();
            });
        });
        unmount();
    });

    test('make 1000 calculations in 1ms', () => {
        const COUNT = 1000;
        assert.medianRuntimeLessThan(1, () => {
            for (let i = 0; i < COUNT; ++i) {
                calc(() => i);
            }
        });
    });

    test('call 1000 calculations in 1ms', () => {
        const COUNT = 1000;
        const calculations: Calculation<number>[] = [];
        assert.medianRuntimeLessThan(1, (measure) => {
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

    test('allocate + retain 1000 calculations in 2ms', () => {
        const COUNT = 1000;
        let calculations: Calculation<number>[] = [];
        assert.medianRuntimeLessThan(2, (measure) => {
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

    test('release 1000 calculations in 1ms', () => {
        const COUNT = 1000;
        const calculations: Calculation<number>[] = [];
        assert.medianRuntimeLessThan(1, (measure) => {
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

    test('update 1000 calculations in 3ms', () => {
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
        assert.medianRuntimeLessThan(3, (measure) => {
            measure(() => {
                modelObj.num += 1;
                flush();
            });
        });
        for (let i = 0; i < COUNT; ++i) {
            release(calculations[i]);
        }
    });
});
