import Revise, {
    Component,
    calc,
    collection,
    model,
    mount,
    setLogLevel,
} from '../index';
import { makeGraphvizDebuggerRef } from './debug';

setLogLevel('debug');

const graphvizRef = makeGraphvizDebuggerRef();

const c = collection(['a'], 'collection');
const v = c.mapView((item) => item.length, 'view');
const m = model({ isActive: false }, 'model');
const calculation = calc(() => {
    // This calculation grows additional dependencies when m.isActive changes to true
    return m.isActive && v.some((item) => item === 3) ? 'yes' : 'no';
}, 'calculation');

function doPush() {
    m.isActive = true;
    c.push('foo');
}

function doUpdate() {
    c[0] = 'foo';
    m.isActive = true;
}

const App: Component<{}> = () => {
    return (
        <div>
            <button on:click={doPush}>doPush</button>
            <button on:click={doUpdate}>doUpdate</button>
            <div>{calculation}</div>
            <ul>
                {c.mapView(
                    (item) => (
                        <li>{item}</li>
                    ),
                    'dom-view'
                )}
            </ul>
            <hr />
            <div ref={graphvizRef} />
        </div>
    );
};

const root = document.getElementById('app');
if (root) {
    mount(root, <App />);
}
