import Revise, { mount, Fragment, ref, model, collection, calc, flush, debug, subscribe, setLogLevel, } from '../index';
setLogLevel('debug');
// Initialize flush subscription, so everything automatically updates
subscribe(() => {
    setTimeout(() => flush(), 0);
});
let maxId = 0;
const uniqueId = () => `id_${maxId++}`;
const globalState = model({
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
window.globalState = globalState;
/*
 * Components
 */
const TodoItem = ({ item }) => {
    const onChange = (event) => {
        item.done = event.target.checked;
    };
    return (Revise("li", { class: "list-group-item p-0" },
        Revise("label", { class: "d-block px-3 py-2" },
            Revise("input", { type: "checkbox", class: "form-check-input me-3", "on:change": onChange, checked: calc(() => item.done) }),
            Revise("span", { style: calc(() => item.done ? 'text-decoration: line-through' : '') }, calc(() => item.task)))));
};
const TodoList = () => {
    return (Revise("div", { class: "my-2" },
        Revise("ul", { class: "list-group" }, globalState.items.mapView((item) => (Revise(TodoItem, { item: item }))))));
};
const TodoControls = ({}, { onMount }) => {
    const id = uniqueId();
    const inputRef = ref();
    onMount(() => {
        // Auto-focus the input on render
        if (inputRef.current)
            inputRef.current.focus();
    });
    const onClickAdd = () => {
        if (!inputRef.current)
            return;
        if (!inputRef.current.value)
            return;
        globalState.items.push(model({
            done: false,
            task: inputRef.current.value,
        }));
        inputRef.current.value = '';
        if (inputRef.current)
            inputRef.current.focus();
    };
    const onClickClear = () => {
        for (let i = globalState.items.length - 1; i >= 0; --i) {
            if (globalState.items[i].done) {
                globalState.items.splice(i, 1);
            }
        }
        if (inputRef.current)
            inputRef.current.focus();
    };
    const onKeyDown = (e) => {
        if (e.code === 'Enter') {
            e.preventDefault();
            onClickAdd();
        }
    };
    const onRename = () => {
        globalState.name = prompt('New name');
    };
    return (Revise(Fragment, null,
        Revise("div", { class: "input-group mb-3" },
            Revise("label", { class: "input-group-text", for: id }, "Add item"),
            Revise("input", { id: id, class: "form-control", ref: inputRef, type: "text", value: "Don't forget the milk", "on:keydown": onKeyDown }),
            Revise("button", { class: "btn btn-primary", "on:click": onClickAdd }, "+")),
        Revise("div", { class: "input-group mb-3" },
            Revise("button", { class: "btn btn-secondary", disabled: calc(() => globalState.items.every((item) => !item.done)), "on:click": onClickClear }, "Clear completed"))));
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
    return (Revise("div", { class: "container" },
        Revise("h1", null,
            "List: ",
            calc(() => globalState.name)),
        Revise(TodoList, null),
        Revise(TodoControls, null),
        Revise("hr", { class: "my-4 border border-2 border-dark" }),
        Revise("div", { class: "input-group mb-3" },
            Revise("button", { class: "btn btn-warning", "on:click": onClickMutate }, "Mutate items"),
            Revise("button", { class: "btn btn-outline-warning", "on:click": onClickDebug }, "Write graphviz dot to console"))));
};
const root = document.getElementById('root');
if (root) {
    mount(root, Revise(App, null));
}
//# sourceMappingURL=todo.js.map