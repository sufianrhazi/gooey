import { graphviz } from '@hpcc-js/wasm';
import { debug, debugSubscribe, subscribe, flush } from '../index';
import { noop } from '../util';

/**
 * Create a ref to build a debugging graphviz UI
 *
 * DANGER: this is super janky and overrides subscribe()!
 */
export function makeGraphvizDebuggerRef() {
    if (!DEBUG) return noop;

    const debugData: { graphviz: string; detail: string }[] = [];
    let updateGraphviz: (() => void) | null = null;

    const graphvizRef = (graphvizEl: HTMLDivElement | undefined) => {
        if (!graphvizEl) return;

        debugData.push({
            graphviz: debug(),
            detail: 'on attach',
        });

        let currentFrame = 0;

        const currentFrameLabel = document.createElement('div');
        const descLabel = document.createElement('div');

        const prevFrameButton = document.createElement('button');
        prevFrameButton.textContent = '\u23ea';
        const nextFrameButton = document.createElement('button');
        nextFrameButton.textContent = '\u23e9';
        const buttons = document.createElement('div');
        const info = document.createElement('div');
        info.append(currentFrameLabel, descLabel);
        const graphContainer = document.createElement('div');
        buttons.append(prevFrameButton, nextFrameButton);
        graphvizEl.append(buttons, info, graphContainer);

        function updateLabel() {
            const currentFrameStr = (currentFrame + 1).toString();
            const frameCountStr = debugData.length.toString();

            currentFrameLabel.textContent = `Frame ${currentFrameStr} of ${frameCountStr}`;
            descLabel.textContent =
                debugData[currentFrame]?.detail ?? 'nothing yet';
        }

        function updateGraph() {
            const item = debugData[currentFrame];
            if (item) {
                graphviz.layout(item.graphviz, 'svg', 'dot').then((svg) => {
                    graphContainer.innerHTML = svg;
                });
            } else {
                graphContainer.textContent = 'N/A';
            }
        }

        function update() {
            updateLabel();
            updateGraph();
        }

        prevFrameButton.addEventListener('click', () => {
            currentFrame = Math.max(0, currentFrame - 1);
            update();
        });
        nextFrameButton.addEventListener('click', () => {
            currentFrame = Math.min(debugData.length - 1, currentFrame + 1);
            update();
        });
        update();

        updateGraphviz = update;
    };

    debugSubscribe((graphviz, detail) => {
        debugData.push({ graphviz, detail });
        updateGraphviz?.();
    });

    subscribe(() => {
        setTimeout(() => {
            flush();
            debugData.push({
                graphviz: debug(),
                detail: 'flush',
            });
            updateGraphviz?.();
        }, 0);
    });

    return graphvizRef;
}