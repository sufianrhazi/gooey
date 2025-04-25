import type { Component } from '../../index';
import Gooey, { calc, model, mount } from '../../index';

const appRoot = document.getElementById('app');
if (!appRoot) {
    throw new Error('Cannot find app root');
}

const Drawing: Component = () => {
    const phrases = ['Hey', 'Hello', 'Wow', 'Ouch', 'Neat', 'Cool', 'Fun'];
    const onClick = (e: MouseEvent, canvasEl: HTMLCanvasElement) => {
        const ctx = canvasEl.getContext('2d');
        if (!ctx) return;
        ctx.save();
        ctx.font = '30px serif';
        ctx.lineWidth = 5;
        const hue = Math.floor(Math.random() * 360);
        ctx.strokeStyle = `hsl(${hue} 100% 80%)`;
        ctx.fillStyle = `hsl(${hue} 100% 40%)`;
        const phrase = phrases[Math.floor(Math.random() * phrases.length)];
        const { width } = ctx.measureText(phrase);
        ctx.strokeText(phrase, e.offsetX - width / 2, e.offsetY, 480);
        ctx.fillText(phrase, e.offsetX - width / 2, e.offsetY, 480);
    };

    return <canvas on:click={onClick} width="500" height="100" />;
};

const Example: Component<{ children: JSX.Element }> = (
    { children },
    { onMount }
) => {
    const state = model({
        left: false,
    });
    onMount(() => {
        children.retain?.();
        const handle = setInterval(() => {
            state.left = !state.left;
        }, 3000);
        return () => {
            children.release?.();
            clearInterval(handle);
        };
    });
    return (
        <fieldset>
            <legend>Movement</legend>
            <div class="columns">
                <fieldset>
                    <legend>Left side</legend>
                    {calc(() => (state.left ? children : null))}
                </fieldset>
                <fieldset>
                    <legend>Right side</legend>
                    {calc(() => (state.left ? null : children))}
                </fieldset>
            </div>
        </fieldset>
    );
};

const App: Component<{}> = (_props, { onMount, onUnmount }) => {
    let handle: number | null = null;
    const state = model({
        isShowing: true,
    });
    onMount(() => {
        handle = setInterval(() => {
            state.isShowing = !state.isShowing;
        }, 1000);
    });
    onUnmount(() => {
        if (handle !== null) {
            clearInterval(handle);
        }
    });

    return (
        <>
            <h1>Teleportation</h1>
            <p>Demonstration of relocating JSX elements</p>
            <Example>
                <p>
                    Lets move a text input around:{' '}
                    <textarea>Hello there</textarea>
                </p>
            </Example>
            <Example>
                <p>
                    Lets move a canvas that draws some text when clicked:{' '}
                    <Drawing />
                </p>
            </Example>
        </>
    );
};

mount(appRoot, <App />);
