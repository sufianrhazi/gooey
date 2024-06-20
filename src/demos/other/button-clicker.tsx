import type { Component} from '../..';
import Gooey, { calc, model, mount } from '../..';

const App: Component = () => {
    const state = model({ clicks: 0 });

    return (
        <>
            <p>
                Click count: <b>{calc(() => state.clicks)}</b>
            </p>
            <button on:click={() => state.clicks++}>Click me</button>
        </>
    );
};

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
mount(document.getElementById('button-clicker')!, <App />);
