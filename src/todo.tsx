import {
    React,
    name,
    model,
    collection,
    computation,
    flush,
    debug,
} from './index';

declare global {
    namespace JSX {
        interface IntrinsicElements {
            div: any;
            input: any;
            ul: any;
            li: any;
            h1: any;
        }
    }
}

interface TodoItem {
    done: boolean;
    task: string;
}

interface TodoList {
    name: string;
    items: TodoItem[];
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
const TodoItem = ({ item }: TodoItemProps) => {
    console.log('Rendering item', item);
    return (
        <li>
            <input
                type="checkbox"
                checked={name(
                    computation(() => item.done),
                    'TodoItem:checked'
                )}
            />{' '}
            {name(
                computation(() => item.task),
                'TodoItem:task'
            )}
        </li>
    );
};

type TodoListProps = { list: TodoList };
const TodoList = ({ list }: TodoListProps) => {
    console.log('Rendering list');
    return (
        <div>
            <h1 class="whatever">
                To do:{' '}
                {name(
                    computation(() => list.name),
                    'TodoList:name'
                )}
            </h1>
            <ul>
                {name(
                    computation(() =>
                        list.items.map((item) => <TodoItem item={item} />)
                    ),
                    'TodoList:items'
                )}
            </ul>
        </div>
    );
};

// main
const rendered = TodoList({ list });
console.log(rendered);
document.body.appendChild(rendered.node);

// ui
const flushButton = document.createElement('button');
flushButton.textContent = 'flush';
flushButton.addEventListener('click', () => {
    flush();
});
document.body.appendChild(flushButton);

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
alert('All ready to go');
