import Revise, { mount, Fragment, ref, model, collection, calc, debug, setLogLevel, } from '../index';
setLogLevel('debug');
function makeTodoListItem(task) {
    return model({ done: false, task }, `TodoItem:${task}`);
}
const globalState = model({
    name: 'Groceries',
    items: collection([
        makeTodoListItem('apples'),
        makeTodoListItem('bananas'),
        makeTodoListItem('celery'),
    ], 'TodoListItems'),
}, 'TodoList');
// Exported to window, so you can play with it in the console!
window.globalState = globalState;
////////////////////////////////////////////////////////////////////////////////
// Components
////////////////////////////////////////////////////////////////////////////////
const TodoItem = ({ item }) => {
    const onChange = (event) => {
        item.done = event.target.checked;
    };
    return (Revise("li", { class: "list-group-item p-0" },
        Revise("label", { class: "d-block px-3 py-2" },
            Revise("input", { type: "checkbox", class: "form-check-input me-3", "on:change": onChange, checked: calc(() => item.done, 'ItemCheckbox') }),
            Revise("span", { style: calc(() => item.done ? 'text-decoration: line-through' : '', 'ItemStyle') }, calc(() => item.task, 'ItemName')))));
};
const TodoList = () => {
    return (Revise("div", { class: "my-2" },
        Revise("ul", { class: "list-group" }, calc(() => globalState.items.mapView((item) => (Revise(TodoItem, { item: item }))), 'ItemList'))));
};
const TodoControls = (_props, { onMount }) => {
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
    return (Revise(Fragment, null,
        Revise("div", { class: "input-group mb-3" },
            Revise("label", { class: "input-group-text", for: "add-item" }, "Add item"),
            Revise("input", { id: "add-item", class: "form-control", ref: inputRef, type: "text", value: "Don't forget the milk", "on:keydown": onKeyDown }),
            Revise("button", { class: "btn btn-primary", "on:click": onClickAdd }, "+")),
        Revise("div", { class: "input-group mb-3" },
            Revise("button", { class: "btn btn-secondary", disabled: calc(() => globalState.items.every((item) => !item.done), 'ClearButtonDisabled'), "on:click": onClickClear }, "Clear completed"))));
};
const App = () => {
    const graphvizContainerRef = ref();
    const onClickMutate = () => {
        globalState.items.forEach((item) => {
            item.done = Math.random() < 0.5;
            item.task = item.task + '!';
        });
    };
    const onClickDebug = () => {
        if (graphvizContainerRef.current) {
            graphvizContainerRef.current.textContent = debug();
        }
    };
    return (Revise(Fragment, null,
        Revise("div", { class: "container" },
            Revise("h1", null,
                "List: ",
                calc(() => globalState.name, 'ListName')),
            Revise(TodoList, null),
            Revise(TodoControls, null),
            Revise("hr", { class: "my-4 border border-2 border-dark" }),
            Revise("div", { class: "input-group mb-3" },
                Revise("button", { class: "btn btn-warning", "on:click": onClickMutate }, "Mutate items"),
                Revise("button", { class: "btn btn-outline-warning", "on:click": onClickDebug }, "Show graphviz"))),
        Revise("div", { class: "container-fluid d-flex my-4 justify-content-center" },
            Revise("pre", { class: "border", ref: graphvizContainerRef }))));
};
const root = document.getElementById('app');
if (root) {
    mount(root, Revise(App, null));
}
//# sourceMappingURL=todo.js.map