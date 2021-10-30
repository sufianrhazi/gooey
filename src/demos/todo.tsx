import {
    React,
    Ref,
    ref,
    name,
    model,
    collection,
    calc,
    flush,
    debug,
    mount,
    subscribe,
    setLogLevel,
    Component,
    Collection,
    Model,
} from '../index';

setLogLevel('debug');

// Initialize flush subscription, so everything automatically updates
subscribe(() => {
    setTimeout(() => flush(), 0);
});

let maxId = 0;
const uniqueId = (): string => `id_${maxId++}`;

/*
 * Application state
 */
interface TodoItem {
    done: boolean;
    task: string;
}

interface TodoList {
    name: string;
    items: Collection<TodoItem>;
}

const globalState: TodoList = model({
    name: 'Groceries',
    items: collection([
        model({
            done: false,
            task: 'apples',
        }),
        model({
            done: false,
            task: 'bananas',
        }),
        model({
            done: false,
            task: 'celery',
        }),
    ]),
});
// Exported to window, so you can play with it in the console!
(window as any).globalState = globalState;

/*
 * Components
 */
const TodoItem: Component<{ item: TodoItem }> = ({ item }) => {
    const onChange = (event: InputEvent) => {
        item.done = (event.target as HTMLInputElement).checked;
    };
    return (
        <li class="list-group-item p-0">
            <label class="d-block px-3 py-2">
                <input
                    type="checkbox"
                    class="form-check-input me-3"
                    on:change={onChange}
                    checked={calc(() => item.done)}
                />
                <span
                    style={calc(() =>
                        item.done ? 'text-decoration: line-through' : ''
                    )}
                >
                    {calc(() => item.task)}
                </span>
            </label>
        </li>
    );
};

const TodoList = () => {
    return (
        <div class="my-2">
            <ul class="list-group">
                {globalState.items.mapView((item) => (
                    <TodoItem item={item} />
                ))}
            </ul>
        </div>
    );
};

const TodoControls: Component<{}> = ({}, { onMount }) => {
    const id = uniqueId();
    const inputRef: Ref<HTMLInputElement> = ref();

    onMount(() => {
        // Auto-focus the input on render
        if (inputRef.current) inputRef.current.focus();
    });

    const onClickAdd = () => {
        if (!inputRef.current) return;
        if (!inputRef.current.value) return;
        globalState.items.push(
            model({
                done: false,
                task: inputRef.current.value,
            })
        );
        inputRef.current.value = '';

        if (inputRef.current) inputRef.current.focus();
    };

    const onClickClear = () => {
        for (let i = globalState.items.length - 1; i >= 0; --i) {
            if (globalState.items[i].done) {
                globalState.items.splice(i, 1);
            }
        }

        if (inputRef.current) inputRef.current.focus();
    };

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Enter') {
            e.preventDefault();
            onClickAdd();
        }
    };

    const onRename = () => {
        globalState.name = prompt('New name')!;
    };

    return (
        <>
            <div class="input-group mb-3">
                <label class="input-group-text" for={id}>
                    Add item
                </label>
                <input
                    id={id}
                    class="form-control"
                    ref={inputRef}
                    type="text"
                    value="Don't forget the milk"
                    on:keydown={onKeyDown}
                />
                <button class="btn btn-primary" on:click={onClickAdd}>
                    +
                </button>
            </div>
            <div class="input-group mb-3">
                <button
                    class="btn btn-secondary"
                    disabled={calc(() =>
                        globalState.items.every((item) => !item.done)
                    )}
                    on:click={onClickClear}
                >
                    Clear completed
                </button>
            </div>
        </>
    );
};

const App = () => {
    const onClickMutate = () => {
        globalState.items.forEach((item) => {
            item.done = Math.random() < 0.5;
            item.task = item.task + '!';
        });
    };

    const onClickDebug = () => {
        console.log(debug());
    };

    return (
        <div class="container">
            <h1>List: {calc(() => globalState.name)}</h1>
            <TodoList />
            <TodoControls />
            <hr class="my-4 border border-2 border-dark" />
            <div class="input-group mb-3">
                <button class="btn btn-warning" on:click={onClickMutate}>
                    Mutate items
                </button>
                <button class="btn btn-outline-warning" on:click={onClickDebug}>
                    Write graphviz dot to console
                </button>
            </div>
        </div>
    );
};

const root = document.getElementById('root');
if (root) {
    mount(root, <App />);
}
