import { suite, test, beforeEach, assert } from '@srhazi/gooey-test';
import * as gooey from './index';

beforeEach(() => {
    gooey.subscribe();
});

suite('behavior', () => {
    beforeEach(() => {
        gooey.reset();
    });
    function setUp() {
        type Renderer = () => string;

        interface TodoItem {
            task: string;
            done: boolean;
        }
        interface TodoList {
            name: string;
            items: TodoItem[];
        }

        const model0 = gooey.model<TodoItem>(
            {
                task: 'apples',
                done: false,
            },
            'model0'
        );
        const model1 = gooey.model<TodoItem>(
            {
                task: 'bananas',
                done: false,
            },
            'model1'
        );
        const model2 = gooey.model<TodoItem>(
            {
                task: 'milk',
                done: false,
            },
            'model2'
        );
        const model3 = gooey.model<TodoItem>(
            {
                task: 'cookies',
                done: false,
            },
            'model3'
        );
        const model4 = gooey.model<TodoItem>(
            {
                task: 'and',
                done: true,
            },
            'model4'
        );

        const todoList = gooey.model<TodoList>(
            {
                name: 'Shopping',
                items: gooey.collection<TodoItem>([model0, model1]),
            },
            'todoList'
        );

        const itemNames = new Map<TodoItem, string>();
        itemNames.set(model0, 'model0');
        itemNames.set(model1, 'model1');
        itemNames.set(model2, 'model2');
        itemNames.set(model3, 'model3');
        itemNames.set(model4, 'model4');

        const renders: string[] = [];

        const makeItemRenderer = (item: TodoItem) => {
            return gooey.calc(() => {
                renders.push(`item:${itemNames.get(item)}`);
                return `[${item.done ? 'x' : ' '}] ${item.task}`;
            }, 'itemRenderer:' + item.task);
        };

        const itemRenderers = new WeakMap<any, gooey.Calculation<any>>();
        const getItemRenderer = (todoItem: TodoItem): Renderer => {
            let renderer = itemRenderers.get(todoItem);
            if (!renderer) {
                renderer = makeItemRenderer(todoItem);
                itemRenderers.set(todoItem, renderer);
            }
            const r = renderer;
            return () => r.get();
        };

        const makeTodoListRenderer = (todoList: TodoList) => {
            return gooey.calc(() => {
                renders.push('list');
                const lines = [`${todoList.name}:`];
                todoList.items.forEach((item) => {
                    lines.push(getItemRenderer(item)());
                });
                return lines.join('\n');
            }, 'list');
        };

        const app = makeTodoListRenderer(todoList);
        app.retain();

        return {
            model0,
            model1,
            model2,
            model3,
            model4,
            todoList,
            app,
            renders,
        };
    }

    test('initial render renders tree', () => {
        const { model0, app, renders } = setUp();

        assert.is(app.get(), 'Shopping:\n[ ] apples\n[ ] bananas');
        assert.deepEqual(renders, ['list', 'item:model0', 'item:model1']);
        model0.task = 'what';
        gooey.flush();
        assert.is(app.get(), 'Shopping:\n[ ] what\n[ ] bananas');
    });

    test('no-op rerender does nothing', () => {
        const { app, renders } = setUp();
        assert.deepEqual(renders, []);
        app.get();
        assert.deepEqual(renders, ['list', 'item:model0', 'item:model1']);
        app.get();
        assert.deepEqual(renders, ['list', 'item:model0', 'item:model1']);
    });

    test('change a dependency does nothing if flush not called', () => {
        const { model0, app, renders } = setUp();
        app.get(); // Force initial render
        model0.done = true;
        assert.is(app.get(), 'Shopping:\n[ ] apples\n[ ] bananas');
        assert.deepEqual(renders, ['list', 'item:model0', 'item:model1']);
    });

    test('flush causes update', () => {
        const { model0, app, renders } = setUp();
        app.get(); // Force initial render

        model0.done = true;

        assert.deepEqual(renders, ['list', 'item:model0', 'item:model1']);
        renders.splice(0, renders.length); // clear renders

        // flush causes update
        gooey.flush();
        assert.deepEqual(renders, ['item:model0', 'list']);

        // manual recomupute does nothing
        renders.splice(0, renders.length); // clear renders
        assert.is(app.get(), 'Shopping:\n[x] apples\n[ ] bananas');
        assert.deepEqual(renders, []);
    });

    test('duplicate flush does nothing', () => {
        const { model0, app, renders } = setUp();
        app.get(); // Force initial render
        assert.deepEqual(renders, ['list', 'item:model0', 'item:model1']);

        model0.done = true;

        // flush causes update
        renders.splice(0, renders.length);
        gooey.flush();
        assert.deepEqual(renders, ['item:model0', 'list']);

        // flush again does nothing
        renders.splice(0, renders.length);
        gooey.flush();
        assert.deepEqual(renders, []);
    });

    test('change multiple dependencies', () => {
        const { model0, model1, app, renders } = setUp();
        app.get(); // initial render
        assert.deepEqual(renders, ['list', 'item:model0', 'item:model1']);

        renders.splice(0, renders.length);
        // change another dependency
        model0.done = true;
        model1.task = 'cherries';
        gooey.flush();

        assert.arrayIncludes(renders, 'item:model0');
        assert.arrayIncludes(renders, 'item:model1');
        assert.arrayIncludes(renders, 'list');
        assert.lessThan(
            renders.indexOf('item:model0'),
            renders.indexOf('list')
        );
        assert.lessThan(
            renders.indexOf('item:model1'),
            renders.indexOf('list')
        );

        assert.is(app.get(), 'Shopping:\n[x] apples\n[ ] cherries');
    });

    test('high level dependencies does not cause child dependencies to rerender', () => {
        const { todoList, app, renders } = setUp();
        app.get(); // initial render
        assert.deepEqual(renders, ['list', 'item:model0', 'item:model1']);

        renders.splice(0, renders.length);
        todoList.name = 'Grocery';
        gooey.flush();
        assert.deepEqual(renders, ['list']);
        assert.is(app.get(), 'Grocery:\n[ ] apples\n[ ] bananas');
    });

    test('adding new items updates collection and renders new items', () => {
        const { model2, model3, todoList, app, renders } = setUp();
        app.get(); // initial render
        assert.deepEqual(renders, ['list', 'item:model0', 'item:model1']);

        renders.splice(0, renders.length);
        todoList.items.push(model2);
        todoList.items.unshift(model3);
        gooey.flush();
        assert.deepEqual(['list', 'item:model3', 'item:model2'], renders);
        assert.is(
            app.get(),
            'Shopping:\n[ ] cookies\n[ ] apples\n[ ] bananas\n[ ] milk'
        );
    });

    test('fancy array stuff like splicing works', () => {
        const {
            model0,
            model1,
            model2,
            model3,
            model4,
            todoList,
            app,
            renders,
        } = setUp();
        todoList.items = gooey.collection([model3, model0, model1, model2]);
        app.get(); // initial render

        todoList.items.splice(1, 2, model4);
        gooey.flush();
        assert.deepEqual(renders, [
            'list',
            'item:model3',
            'item:model0',
            'item:model1',
            'item:model2',
            // <<flush here>>
            'list',
            'item:model4',
        ]);
        assert.is(app.get(), 'Shopping:\n[ ] cookies\n[x] and\n[ ] milk');
    });

    test('updating items that once caused renders but no longer do takes no effect', () => {
        const { model0, todoList, app, renders } = setUp();
        app.get(); // initial render
        todoList.items.shift(); // remove model0
        gooey.flush(); // flush 1: update with model0 removed
        model0.task = 'whatever';
        gooey.flush(); // flush 2: nothing should happen
        assert.deepEqual(renders, [
            'list',
            'item:model0',
            'item:model1',
            // <<flush 1 here>>
            'list',
            // <<flush 2 here>>
        ]);
        assert.is(app.get(), 'Shopping:\n[ ] bananas');
    });
});

suite('invariants', () => {
    suite('models feel like objects', () => {
        interface Ctx {
            model: {
                foo: number;
                bar: any;
            };
        }

        beforeEach((ctx: Ctx) => {
            ctx.model = gooey.model({
                foo: 3,
                bar: {
                    hello: 'world',
                },
            });
        });

        test('reads feel like reads', (ctx: Ctx) => {
            assert.is(ctx.model.foo, 3);
            assert.deepEqual(ctx.model.bar, { hello: 'world' });
        });

        test('deepEquality works as expected', (ctx: Ctx) => {
            assert.deepEqual(ctx.model, {
                foo: 3,
                bar: { hello: 'world' },
            });
        });

        test('writes are written', (ctx: Ctx) => {
            ctx.model.foo = 4;
            assert.is(ctx.model.foo, 4);
        });

        test('keys are correct', (ctx: Ctx) => {
            const keys = Object.keys(ctx.model);
            assert.arrayIncludes(keys, 'foo');
            assert.arrayIncludes(keys, 'bar');
        });
    });
});
