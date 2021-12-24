import { graphviz } from '@hpcc-js/wasm';
import Revise, { mount, Fragment, model, collection, calc, setLogLevel, debug, subscribe, flush, ref, } from '../index';
const graphvizRef = ref();
function debugGraph() {
    graphviz.layout(debug(), 'svg', 'dot').then((svg) => {
        if (graphvizRef.current) {
            graphvizRef.current.innerHTML = svg;
        }
    });
}
subscribe(() => {
    setTimeout(() => {
        flush();
        debugGraph();
    }, 0);
});
setTimeout(() => {
    debugGraph();
}, 0);
setLogLevel('debug');
const App = () => {
    const bag = model({
        some: 'starter',
        text: 'here',
    }, 'bag');
    const state = model({
        key: '',
        value: '',
        keysView: true,
    }, 'state');
    const keysCollection = collection(Object.keys(bag), 'keysCollection');
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
        Revise("ul", null, calc(() => (state.keysView
            ? model.keys(bag, 'bagKeys')
            : keysCollection).mapView((key) => (Revise("li", null,
            key,
            " =",
            ' ',
            calc(() => bag[key], 'view bag value'))), 'key item mapView'), 'view list')),
        Revise("p", null, "Filtered items:"),
        Revise("ul", null, calc(() => (state.keysView
            ? model.keys(bag, 'bagKeys2')
            : keysCollection)
            .filterView((key) => key.length % 2 === 0)
            .mapView((key) => (Revise("li", null,
            key,
            " = ",
            calc(() => bag[key])))))),
        Revise("p", null, "FlatMap items:"),
        Revise("ul", null, calc(() => (state.keysView
            ? model.keys(bag, 'bagKeys3')
            : keysCollection)
            .flatMapView((key) => [key, key])
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
        Revise("button", { "on:click": onClickSet, disabled: calc(() => !(state.key && state.value), 'button:set:disabled') }, "set key = value"),
        Revise("button", { "on:click": onClickDelete, disabled: calc(() => !state.key, 'button:delete:disabled') }, "delete key"),
        Revise("label", null,
            Revise("input", { type: "checkbox", checked: calc(() => state.keysView, 'checkbox:keysView:checked'), "on:input": () => (state.keysView = !state.keysView) }),
            ' ',
            "model.keys"),
        Revise("p", null,
            "key: ",
            calc(() => state.key, 'text:key')),
        Revise("p", null,
            "value: ",
            calc(() => state.value, 'text:value')),
        Revise("hr", null),
        Revise("h2", null, "Graphviz"),
        Revise("div", { ref: graphvizRef })));
};
const root = document.getElementById('app');
if (root) {
    mount(root, Revise(App, null));
}
//# sourceMappingURL=bag.js.map