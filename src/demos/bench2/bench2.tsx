import Gooey, {
    Component,
    Model,
    mount,
    model,
    collection,
    calc,
    flush,
} from '../..';

const measurements = collection<string>([]);
const byType = {
    '1:add': collection<number>([]),
    '2:update-all': collection<number>([]),
    '3:update-some': collection<number>([]),
    '4:clear': collection<number>([]),
};

const measure = (name: keyof typeof byType, fn: () => void) => {
    return () => {
        const start = performance.now();
        fn();
        flush();
        const time = performance.now() - start;
        console.log(`gooey ${name} duration`, time);
        measurements.push(`gooey ${name} duration: ${time}ms`);
        byType[name].push(time);
    };
};

const Benchmark: Component = () => {
    const items = collection<Model<{ val: number }>>([]);
    let itemId = 0;

    const addItems = measure('1:add', () => {
        for (let i = 0; i < 10000; ++i) {
            items.push(model({ val: itemId++ }));
        }
    });

    const updateAllItems = measure('2:update-all', () => {
        items.forEach((item) => (item.val *= 2));
    });

    const updateSomeItems = measure('3:update-some', () => {
        if (items.length === 0) return;
        for (let i = 0; i < 10; ++i) {
            items[Math.floor(Math.random() * items.length)].val *= 2;
        }
    });

    const clearItems = measure('4:clear', () => {
        items.splice(0, items.length);
    });

    return (
        <div>
            <p>
                <button data-gooey-add on:click={addItems}>
                    Add items
                </button>
                <button data-gooey-update-all on:click={updateAllItems}>
                    Update all items
                </button>
                <button data-gooey-update-some on:click={updateSomeItems}>
                    Update 10 random items
                </button>
                <button data-gooey-clear on:click={clearItems}>
                    Clear items
                </button>
            </p>
            <ul
                class="bx by"
                style="height: 100px; overflow: auto; contain: strict"
            >
                {items.mapView((item) => (
                    <li>{calc(() => item.val)}</li>
                ))}
            </ul>
            <table>
                <thead>
                    <tr>
                        <th>Action</th>
                        <th>Min</th>
                        <th>Max</th>
                        <th>Median</th>
                        <th>p95</th>
                        <th>p99</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(byType).map(([type, collection]) => (
                        <tr>
                            <td>{type}</td>
                            <td>
                                {calc(() =>
                                    collection.reduce(
                                        (acc, val) => (acc < val ? acc : val),
                                        Infinity
                                    )
                                )}
                            </td>
                            <td>
                                {calc(() =>
                                    collection.reduce(
                                        (acc, val) => (acc > val ? acc : val),
                                        -Infinity
                                    )
                                )}
                            </td>
                            {calc(() => {
                                const sorted = collection
                                    .slice()
                                    .sort((a, b) => a - b);
                                return (
                                    <>
                                        <td>
                                            {(sorted[
                                                Math.floor(sorted.length / 2)
                                            ] +
                                                sorted[
                                                    Math.ceil(sorted.length / 2)
                                                ]) /
                                                2}
                                        </td>
                                        <td>
                                            {(sorted[
                                                Math.floor(
                                                    (sorted.length * 0.95) / 2
                                                )
                                            ] +
                                                sorted[
                                                    Math.ceil(
                                                        (sorted.length * 0.95) /
                                                            2
                                                    )
                                                ]) /
                                                2}
                                        </td>
                                        <td>
                                            {(sorted[
                                                Math.floor(
                                                    (sorted.length * 0.99) / 2
                                                )
                                            ] +
                                                sorted[
                                                    Math.ceil(
                                                        (sorted.length * 0.99) /
                                                            2
                                                    )
                                                ]) /
                                                2}
                                        </td>
                                    </>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <ul>
                {measurements.mapView((measurement) => (
                    <li>{measurement}</li>
                ))}
            </ul>
        </div>
    );
};

const mainEl = document.getElementById('main');
if (mainEl) {
    mount(mainEl, <Benchmark />);
}

(window as any).run = async function run() {
    const impl = {
        add: document.querySelector('[data-gooey-add]'),
        updateAll: document.querySelector('[data-gooey-update-all]'),
        updateSome: document.querySelector('[data-gooey-update-some]'),
        clear: document.querySelector('[data-gooey-clear]'),
    };

    const RUNS = 100;
    for (let i = 0; i < RUNS; ++i) {
        impl.add?.dispatchEvent(new MouseEvent('click'));
        await new Promise((resolve) => setTimeout(resolve, 0));
        impl.updateSome?.dispatchEvent(new MouseEvent('click'));
        await new Promise((resolve) => setTimeout(resolve, 0));
        impl.updateAll?.dispatchEvent(new MouseEvent('click'));
        await new Promise((resolve) => setTimeout(resolve, 0));
        impl.clear?.dispatchEvent(new MouseEvent('click'));
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
};
