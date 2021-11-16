import Revise, { mount, model, collection, calc, flush, subscribe, } from '../index';
// Disable default flushing
// eslint-disable-next-line @typescript-eslint/no-empty-function
subscribe(() => { });
function _random(max) {
    return Math.round(Math.random() * 1000) % max;
}
function time(fn) {
    const wrapped = (...args) => {
        console.log(`Running ${fn.name}...`);
        const start = performance.now();
        const result = fn(...args);
        const duration = performance.now() - start;
        console.log(`${fn.name} took ${duration}ms`);
        return result;
    };
    return wrapped;
}
const Button = ({ id, onClick, children }) => (Revise("button", { "on:click": onClick, type: "button", class: "btn btn-primary btn-block", id: id }, children));
const Controls = ({ store }) => {
    let maxId = 0;
    const makeRows = (count) => {
        const adjectives = [
            'pretty',
            'large',
            'big',
            'small',
            'tall',
            'short',
            'long',
            'handsome',
            'plain',
            'quaint',
            'clean',
            'elegant',
            'easy',
            'angry',
            'crazy',
            'helpful',
            'mushy',
            'odd',
            'unsightly',
            'adorable',
            'important',
            'inexpensive',
            'cheap',
            'expensive',
            'fancy',
        ];
        const colours = [
            'red',
            'yellow',
            'blue',
            'green',
            'pink',
            'brown',
            'purple',
            'brown',
            'white',
            'black',
            'orange',
        ];
        const nouns = [
            'table',
            'chair',
            'house',
            'bbq',
            'desk',
            'car',
            'pony',
            'cookie',
            'sandwich',
            'burger',
            'pizza',
            'mouse',
            'keyboard',
        ];
        const data = [];
        for (let i = 0; i < count; i++)
            data.push(model({
                id: maxId++,
                label: adjectives[_random(adjectives.length)] +
                    ' ' +
                    colours[_random(colours.length)] +
                    ' ' +
                    nouns[_random(nouns.length)],
            }));
        return data;
    };
    const create1KRows = (e) => {
        e.preventDefault();
        store.selected = undefined;
        store.items.splice(0, store.items.length, ...makeRows(1000));
        flush();
    };
    const create10KRows = (e) => {
        e.preventDefault();
        store.selected = undefined;
        store.items.splice(0, store.items.length, ...makeRows(10000));
        flush();
    };
    const append1KRows = (e) => {
        e.preventDefault();
        store.selected = undefined;
        store.items.splice(store.items.length, 0, ...makeRows(1000));
        flush();
    };
    const updateEvery10Rows = (e) => {
        e.preventDefault();
        store.selected = undefined;
        for (let i = 0; i < store.items.length; i += 10) {
            store.items[i].label += ' !!!';
        }
        flush();
    };
    const clear = (e) => {
        e.preventDefault();
        store.selected = undefined;
        store.items.splice(0, store.items.length);
        flush();
    };
    const swapRows = (e) => {
        e.preventDefault();
        if (store.items.length > 998) {
            const a = store.items[1];
            store.items[1] = store.items[998];
            store.items[998] = a;
        }
        flush();
    };
    return (Revise("div", { class: "col-md-6" },
        Revise("div", { class: "row" },
            Revise("div", { class: "col-sm-6 smallpad" },
                Revise(Button, { onClick: time(create1KRows), id: "run" }, "Create 1,000 rows")),
            Revise("div", { class: "col-sm-6 smallpad" },
                Revise(Button, { onClick: time(create10KRows), id: "runlots" }, "Create 10,000 rows")),
            Revise("div", { class: "col-sm-6 smallpad" },
                Revise(Button, { onClick: time(append1KRows), id: "add" }, "Append 1,000 rows")),
            Revise("div", { class: "col-sm-6 smallpad" },
                Revise(Button, { onClick: time(updateEvery10Rows), id: "update" }, "Update every 10th row")),
            Revise("div", { class: "col-sm-6 smallpad" },
                Revise(Button, { onClick: time(clear), id: "clear" }, "Clear")),
            Revise("div", { class: "col-sm-6 smallpad" },
                Revise(Button, { onClick: time(swapRows), id: "swaprows" }, "Swap Rows")))));
};
const Row = ({ store, item }) => {
    function selectItem(e) {
        e.preventDefault();
        store.selected = item.id;
        flush();
    }
    return (Revise("tr", { class: calc(() => (store.selected === item.id ? 'danger' : '')) },
        Revise("td", { class: "col-md-1" }, calc(() => item.id)),
        Revise("td", { class: "col-md-4" },
            Revise("a", { class: "lbl", "on:click": time(selectItem) }, calc(() => item.label))),
        Revise("td", { class: "col-md-1" },
            Revise("a", { class: "remove" },
                Revise("span", { class: "remove glyphicon glyphicon-remove", "aria-hidden": "true" }))),
        Revise("td", { class: "col-md-6" })));
};
const Table = ({ store }) => {
    return (Revise("tbody", { id: "tbody" }, store.items.mapView((item) => (Revise(Row, { store: store, item: item })))));
};
const JsFrameworkBenchmark = () => {
    const store = model({
        selected: undefined,
        items: collection([]),
    });
    return (Revise("div", { class: "container" },
        Revise("div", { class: "jumbotron" },
            Revise("div", { class: "row" },
                Revise("div", { class: "col-md-6" },
                    Revise("h1", null, "Revise-\"keyed\"")),
                Revise(Controls, { store: store }))),
        Revise("table", { class: "table table-hover table-striped test-data" },
            Revise(Table, { store: store })),
        Revise("span", { class: "preloadicon glyphicon glyphicon-remove", "aria-hidden": "true" })));
};
// main
const root = document.getElementById('main');
if (root) {
    mount(root, Revise(JsFrameworkBenchmark, null));
}
//# sourceMappingURL=benchmark.js.map