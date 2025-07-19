import Gooey, { calc, collection, field, mount } from '../..';

const items1 = collection([1, 2, 3, 4, 5, 6]);
const items2 = collection(['a', 'b', 'c', 'd', 'e']);

const item = <div class="item">X</div>;
const isLeft = field(true);
const leftSide = calc(() => (isLeft.get() ? item : null));
const rightSide = calc(() => (isLeft.get() ? null : item));

mount(
    document.getElementById('app')!,
    <>
        <p>
            The following items have a CSS animation on enter, they should fade
            in when they apper:
        </p>
        <div class="items">
            {items1.mapView((num) => (
                <div class="item">{num}</div>
            ))}
            {items2.mapView((num) => (
                <div class="item">{num}</div>
            ))}
        </div>
        <p>
            These operations mutate the collection. <b>Moving</b> or{' '}
            <b>sorting</b> items SHOULD NOT trigger the CSS animation if your
            browser supports the <code>moveBefore</code> function.
        </p>
        <p>
            Browser support for <code>moveBefore</code>:{' '}
            {'moveBefore' in Element.prototype ? (
                <strong>Supported</strong>
            ) : (
                <strong>NOT Supported</strong>
            )}
        </p>
        <p>
            The following controls operate on <strong>both</strong> lists
            simultaneously
        </p>
        <p>
            <button
                on:click={() => {
                    items1.moveSlice(2, 3, 0);
                    items2.moveSlice(2, 3, 0);
                }}
            >
                Move index 2 & 3 & 4 to start
            </button>
        </p>
        <p>
            <button
                on:click={() => {
                    items1.sort((a, b) => a - b);
                    items2.sort();
                }}
            >
                Sort
            </button>
        </p>
        <p>
            <button
                on:click={() => {
                    items1.push(items1.length + 1);
                    items2.push(
                        String.fromCharCode(
                            'a'.charCodeAt(0) + items1.length + 1
                        )
                    );
                }}
            >
                Push item
            </button>
        </p>
        <p>
            <button
                on:click={() => {
                    items1.unshift(items1.length + 1);
                    items2.unshift(
                        String.fromCharCode(
                            'a'.charCodeAt(0) + items1.length + 1
                        )
                    );
                }}
            >
                Unshift item
            </button>
        </p>
        <p>
            <button
                on:click={() => {
                    items1.splice(2, 0, items1.length + 1);
                    items2.splice(
                        2,
                        0,
                        String.fromCharCode(
                            'a'.charCodeAt(0) + items1.length + 1
                        )
                    );
                }}
            >
                Splice item in at index 2
            </button>
        </p>
        <hr />
        <p>Here we have two lists of items:</p>
        <div class="items">
            <div class="item">A</div>
            {leftSide}
            <div class="item">B</div>
        </div>
        <div class="items">
            <div class="item">C</div>
            {rightSide}
            <div class="item">D</div>
        </div>
        <button on:click={() => isLeft.set(!isLeft.get())}>Toggle side</button>
    </>
);
