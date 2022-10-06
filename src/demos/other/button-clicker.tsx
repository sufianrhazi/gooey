import Gooey, { Component, calc, model, mount } from '../..';

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

mount(document.getElementById('button-clicker')!, <App />);
