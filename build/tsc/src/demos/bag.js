import Revise, { mount, Fragment, model, collection, calc, setLogLevel, } from '../index';
setLogLevel('debug');
const App = () => {
    const bag = model({});
    const state = model({
        key: '',
        value: '',
        keysView: true,
    });
    const keysCollection = collection([]);
    const onClickSet = () => {
        bag[state.key] = state.value;
        keysCollection.push(state.key);
    };
    const onClickDelete = () => {
        delete bag[state.key];
    };
    return (Revise(Fragment, null,
        Revise("h1", null, "Bag demo"),
        Revise("p", null, "Key items:"),
        Revise("ul", null, calc(() => (state.keysView ? model.keys(bag) : keysCollection).mapView((key) => (Revise("li", null,
            key,
            " = ",
            calc(() => bag[key])))))),
        Revise("p", null, "Filtered items:"),
        Revise("ul", null, calc(() => (state.keysView ? model.keys(bag) : keysCollection)
            .filterView((key) => key.length % 2 === 0)
            .mapView((key) => (Revise("li", null,
            key,
            " = ",
            calc(() => bag[key])))))),
        Revise("p", null, "FlatMap items:"),
        Revise("ul", null, calc(() => (state.keysView ? model.keys(bag) : keysCollection)
            .flatMapView((key) => [key, key])
            .mapView((key) => (Revise("li", null,
            key,
            " = ",
            calc(() => bag[key])))))),
        Revise("p", null, "Sorted items:"),
        Revise("ul", null, calc(() => (state.keysView ? model.keys(bag) : keysCollection)
            .sortedView((a, b) => (a === b ? 0 : a < b ? -1 : 1))
            .mapView((key) => (Revise("li", null,
            key,
            " = ",
            calc(() => bag[key])))))),
        Revise("p", null,
            Revise("label", null,
                "Key:",
                ' ',
                Revise("input", { type: "text", "on:input": (e) => {
                        state.key = e.target.value;
                    } }))),
        Revise("p", null,
            Revise("label", null,
                "Value:",
                ' ',
                Revise("input", { type: "text", "on:input": (e) => {
                        state.value = e.target.value;
                    } }))),
        Revise("button", { "on:click": onClickSet, disabled: calc(() => !(state.key && state.value)) }, "set key = value"),
        Revise("button", { "on:click": onClickDelete, disabled: calc(() => !state.key) }, "delete key"),
        Revise("label", null,
            Revise("input", { type: "checkbox", checked: calc(() => state.keysView), "on:input": () => (state.keysView = !state.keysView) }),
            ' ',
            "model.keys"),
        Revise("p", null,
            "key: ",
            calc(() => state.key)),
        Revise("p", null,
            "value: ",
            calc(() => state.value))));
};
const root = document.getElementById('app');
if (root) {
    mount(root, Revise(App, null));
}
//# sourceMappingURL=bag.js.map