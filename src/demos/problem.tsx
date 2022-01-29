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

const m = model({ isActive: false }, 'model');
const c = collection(['a'], 'collection');
const v = c.mapView((item) => item.length, 'view');
const calculation = calc(() => {
    // This calculation grows additional dependencies when m.isActive changes to true
    return m.isActive && v.some((item) => item === 3) ? 'yes' : 'no';
}, 'calculation');

function main() {
    m.isActive = true;
    c.push('foo');
}

const App: Component<{}> = () => {
    return (
        <div>
            <button on:click={main}>Do it</button>
            <div>{calculation}</div>
            <hr />
            <div ref={graphvizRef} />
        </div>
    );
};

const root = document.getElementById('app');
if (root) {
    mount(root, <App />);
}
