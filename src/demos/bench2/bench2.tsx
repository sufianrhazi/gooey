import Gooey, {
    calc,
    collection,
    field,
    flush,
    model,
    mount,
    VERSION,
} from '../..';
import type { Collection, Component, Model } from '../..';

const isRunning = field(false);

const allMeasurements = [
    { name: '1:add', count: 10000 },
    { name: '2:update-all', count: 10000 },
    { name: '3:update-some', count: 10 },
    { name: '4:insert-some', count: 10 },
    { name: '5:delete-some', count: 10 },
    { name: '6:clear', count: 10000 },
];

function getMedian(count: number, times: number[]) {
    if (times.length === 0) {
        return 'N/A';
    }
    const sorted = [...times].sort((a, b) => a - b);
    const left = sorted[Math.floor((sorted.length - 1) / 2)];
    const right = sorted[Math.ceil((sorted.length - 1) / 2)];
    const median = (left + right) / 2;
    const itemsPerMs = count / median;
    return `${median.toFixed(2)}ms (${itemsPerMs.toFixed(2)} items/ms)`;
}

const measurements: Record<string, Collection<number>> = {
    '1:add': collection<number>([]),
    '2:update-all': collection<number>([]),
    '3:update-some': collection<number>([]),
    '4:insert-some': collection<number>([]),
    '5:delete-some': collection<number>([]),
    '6:clear': collection<number>([]),
};

const measure = (name: string, fn: () => void) => {
    return () => {
        const start = performance.now();
        fn();
        flush();
        const time = performance.now() - start;
        console.log(`gooey ${name} duration`, time);
        measurements[name].push(time);
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

    const insertSomeItems = measure('4:insert-some', () => {
        for (let i = 0; i < 10; ++i) {
            items.splice(Math.floor(Math.random() * items.length), 0, {
                val: itemId++,
            });
        }
    });

    const deleteSomeItems = measure('5:delete-some', () => {
        if (items.length === 0) return;
        for (let i = 0; i < 10; ++i) {
            items.splice(Math.floor(Math.random() * items.length), 1);
        }
    });

    const clearItems = measure('6:clear', () => {
        items.splice(0, items.length);
    });

    const runBenchmark = async () => {
        isRunning.set(true);
        const RUNS = 100;
        for (let i = 0; i < RUNS; ++i) {
            addItems();
            await new Promise((resolve) => setTimeout(resolve, 10));
            updateAllItems();
            await new Promise((resolve) => setTimeout(resolve, 10));
            updateSomeItems();
            await new Promise((resolve) => setTimeout(resolve, 10));
            insertSomeItems();
            await new Promise((resolve) => setTimeout(resolve, 10));
            deleteSomeItems();
            await new Promise((resolve) => setTimeout(resolve, 10));
            clearItems();
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
        isRunning.set(false);
    };

    return (
        <div>
            <p>Gooey version {VERSION}</p>
            <p>
                <button disabled={isRunning} data-gooey-add on:click={addItems}>
                    Add items
                </button>
                <button
                    disabled={isRunning}
                    data-gooey-update-all
                    on:click={updateAllItems}
                >
                    Update all items
                </button>
                <button
                    disabled={isRunning}
                    data-gooey-update-some
                    on:click={updateSomeItems}
                >
                    Update 10 items
                </button>
                <button
                    disabled={isRunning}
                    data-gooey-insert-some
                    on:click={insertSomeItems}
                >
                    Insert 10 items
                </button>
                <button
                    disabled={isRunning}
                    data-gooey-delete-some
                    on:click={deleteSomeItems}
                >
                    Delete 10 items
                </button>
                <button
                    disabled={isRunning}
                    data-gooey-clear
                    on:click={clearItems}
                >
                    Clear items
                </button>
                <button disabled={isRunning} on:click={runBenchmark}>
                    Run benchmark
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
            <ul>
                {allMeasurements.map(({ name, count }) => (
                    <li>
                        {name}:{' '}
                        {calc(() => (
                            <>
                                {measurements[name].length} runs; median time:{' '}
                                {getMedian(count, measurements[name])}
                            </>
                        ))}
                    </li>
                ))}
            </ul>
        </div>
    );
};

mount(document.getElementById('main')!, <Benchmark />);
