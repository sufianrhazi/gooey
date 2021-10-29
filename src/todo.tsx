import {
    React,
    name,
    model,
    collection,
    computation,
    flush,
    debug,
    mount,
    subscribe,
    setLogLevel,
    Component,
    TrackedModel,
    TrackedCollection,
} from './index';

setLogLevel('debug');

subscribe(() => {
    setTimeout(() => flush(), 0);
});

interface TodoItem {
    done: boolean;
    task: string;
}

interface TodoList {
    name: string;
    items: TrackedCollection<TodoItem>;
}

const list: TodoList = name(
    model({
        name: 'Shopping',
        items: name(
            collection([
                name(
                    model({
                        done: false,
                        task: 'apple',
                    }),
                    'item:0'
                ),
                name(
                    model({
                        done: false,
                        task: 'banana',
                    }),
                    'item:1'
                ),
                name(
                    model({
                        done: false,
                        task: 'celery',
                    }),
                    'item:3'
                ),
            ]),
            'items'
        ),
    }),
    'list'
);
(window as any).list = list;

type TodoItemProps = { item: TodoItem };
const TodoItem: Component<TodoItemProps> = ({ item }, { onUnmount }) => {
    console.log('Mounting TodoItem', item);
    onUnmount(() => {
        console.log('Unmounting TodoItem', item);
    });
    const onChange = (event: any) => {
        item.done = event.target.checked;
    };
    return (
        <li>
            <label>
                <input
                    type="checkbox"
                    on:change={onChange}
                    checked={name(
                        computation(() => item.done),
                        'TodoItem:checked'
                    )}
                />{' '}
                <span
                    style={name(
                        computation(() =>
                            item.done ? 'text-decoration: line-through' : ''
                        ),
                        'TodoItem:strikethrough'
                    )}
                >
                    {name(
                        computation(() => item.task),
                        'TodoItem:task'
                    )}
                </span>
            </label>
        </li>
    );
};

type TodoListProps = { list: TodoList };
const TodoList: Component<TodoListProps> = ({ list }, { onUnmount }) => {
    console.log('TodoList:mount');
    onUnmount(() => {
        console.log('TodoList:unmount');
    });
    const onClickAdd = () => {
        console.log('TodoList:click:add');
        const el = document.getElementById('input');
        if (!el || !(el instanceof HTMLInputElement)) return;
        list.items.push(
            name(
                model({
                    done: false,
                    task: el.value,
                }),
                el.value
            )
        );
        el.value = '';
    };

    const onClickClear = () => {
        for (let i = list.items.length - 1; i >= 0; --i) {
            if (list.items[i].done) {
                list.items.splice(i, 1);
            }
        }
    };

    return (
        <>
            <p>
                {name(
                    computation(() => list.items.length),
                    'TodoList:items.length'
                )}{' '}
                items
            </p>
            <ul>
                {name(
                    list.items.mapCollection((item) => (
                        <TodoItem item={item} />
                    )),
                    'TodoList:items'
                )}
            </ul>
            <button on:click={onClickAdd}>+</button>{' '}
            <input id="input" type="text" value="Don't forget the milk" />
            <br />
            <button on:click={onClickClear}>Clear completed</button>
        </>
    );
};

// main
const root = document.getElementById('root');
if (root) {
    mount(root, <TodoList list={list} />);
}

// non-revise ui
const separator = document.createElement('hr');
separator.style.margin = '20px 0';
document.body.appendChild(separator);

const doSomethingButton = document.createElement('button');
doSomethingButton.textContent = 'doSomething';
doSomethingButton.addEventListener('click', () => {
    list.items.forEach((item) => {
        item.done = Math.random() < 0.5;
        item.task = item.task + '!';
    });
});
document.body.appendChild(doSomethingButton);

const debugButon = document.createElement('button');
debugButon.textContent = 'graphviz';
debugButon.addEventListener('click', () => {
    console.log(debug());
});
document.body.appendChild(debugButon);
