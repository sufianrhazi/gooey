import Gooey, { Component, model, calc } from '../..';

export const Counter: Component = () => {
    const state = model({
        count: 0,
    });
    return (
        <div class="p grid-labels">
            <input
                readonly
                type="text"
                value={calc(() => state.count.toString())}
            />
            <button class="primary" on:click={() => state.count++}>
                Count
            </button>
        </div>
    );
};
