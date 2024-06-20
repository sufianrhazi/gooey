import type {
    Dyn} from '../../index';
import Gooey, {
    calc,
    dynGet,
    field,
    model,
    ref,
    defineCustomElement,
} from '../../index';

const dynGetNumber = (val: Dyn<string | undefined>, def: number) => {
    const v = parseFloat(dynGet(val) ?? '');
    return !isFinite(v) ? def : v;
};

const safeMod = (a: number, b: number) => ((a % b) + b) % b;

const DEFAULT_GAP_X = 5;
const DEFAULT_GAP_Y = 2;
const DEFAULT_SCROLL_EVEN = 10;
const DEFAULT_SCROLL_ODD = -15;
const DEFAULT_ANGLE = Math.PI * 0.2;

defineCustomElement({
    tagName: 'marquee-button',
    shadowMode: 'open',
    observedAttributes: [
        'label',
        'width',
        'height',
        'gap-x',
        'gap-y',
        'scroll-even',
        'scroll-odd',
        'angle',
        'force-active',
    ],
    Component: (
        {
            label,
            width,
            height,
            'gap-x': gapX,
            'gap-y': gapY,
            'scroll-even': scrollEven,
            'scroll-odd': scrollOdd,
            angle,
            'force-active': forceActive,
        },
        { onMount, addEventListener }
    ) => {
        const hasFocus = field(false);
        const hasHover = field(false);
        const isActive = calc(
            () => hasFocus.get() || hasHover.get() || !!dynGet(forceActive)
        );
        const evenShift = field(0.5);
        const oddShift = field(0);

        const elRef = ref<HTMLDivElement>();
        const offscreenRef = ref<HTMLDivElement>();
        const scrollerRef = ref<HTMLDivElement>();

        const rawDimensions = model({
            width: 0,
            height: 0,
        });

        addEventListener('focusin', () => hasFocus.set(true));
        addEventListener('focusout', () => hasFocus.set(false));
        addEventListener('mouseenter', () => hasHover.set(true));
        addEventListener('mouseleave', () => hasHover.set(false));

        const labelDimensions = calc(() => {
            if (!isActive.get() || !offscreenRef.current) {
                return null;
            }
            const spanEl = document.createElement('span');
            spanEl.style.whiteSpace = 'nowrap';
            spanEl.style.display = 'inline-block';
            spanEl.textContent = dynGet(label) ?? '';
            offscreenRef.current.replaceChildren(spanEl);
            const rect = spanEl.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        });

        const nodeInfo = calc(() => {
            if (!isActive.get()) {
                return null;
            }
            const labelDims = labelDimensions.get();
            if (!labelDims) {
                return null;
            }
            const gapXVal = dynGetNumber(gapX, DEFAULT_GAP_X);
            const gapYVal = dynGetNumber(gapY, DEFAULT_GAP_Y);
            const bounds = {
                width: Math.ceil(labelDims.width + gapXVal),
                height: Math.ceil(labelDims.height + gapYVal),
            };
            const ang = dynGetNumber(angle, DEFAULT_ANGLE);
            const rotatedWidth =
                rawDimensions.height * Math.abs(Math.sin(ang)) +
                rawDimensions.width * Math.abs(Math.cos(ang));
            const rotatedHeight =
                rawDimensions.height * Math.abs(Math.cos(ang)) +
                rawDimensions.width * Math.abs(Math.sin(ang));
            let numNodesH = Math.ceil(rotatedWidth / bounds.width) + 2;
            let numNodesV = Math.ceil(rotatedHeight / bounds.height) + 1;
            // Need an even number of nodes in order to keep things centered correctly
            if (numNodesH & 1) {
                numNodesH++;
            }
            if (numNodesV & 1) {
                numNodesV++;
            }
            const totalWidth = numNodesH * bounds.width - gapXVal;
            const totalHeight = numNodesV * bounds.height - gapYVal;
            const totalShiftX = -(totalWidth - rawDimensions.width) / 2;
            const totalShiftY = -(totalHeight - rawDimensions.height) / 2;
            const evenNode = document.createElement('span');
            evenNode.textContent = dynGet(label) ?? '';
            const oddNode = evenNode.cloneNode(true) as HTMLSpanElement;
            evenNode.className = 'marquee-button_item--even';
            oddNode.className = 'marquee-button_item--odd';
            const labelNodes: HTMLSpanElement[] = [];
            for (let x = 0; x < numNodesH; ++x) {
                for (let y = 0; y < numNodesV; ++y) {
                    const toClone = y & 1 ? oddNode : evenNode;
                    const cloned = toClone.cloneNode(true) as HTMLSpanElement;
                    cloned.style.setProperty(
                        '--marquee-button_item-col',
                        x.toString()
                    );
                    cloned.style.setProperty(
                        '--marquee-button_item-row',
                        y.toString()
                    );
                    labelNodes.push(cloned);
                }
            }
            return { bounds, labelNodes, totalShiftX, totalShiftY };
        });

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target === elRef.current) {
                    if (entry.borderBoxSize) {
                        const box = entry.borderBoxSize[0];
                        rawDimensions.width = box.inlineSize;
                        rawDimensions.height = box.blockSize;
                    } else {
                        rawDimensions.width = entry.contentRect.width;
                        rawDimensions.height = entry.contentRect.height;
                    }
                }
            }
        });

        let animationHandle: null | number = null;
        let lastTickMs: null | number = null;
        const tick = (ms: number) => {
            if (lastTickMs === null) {
                lastTickMs = ms;
            }
            const dt = (ms - lastTickMs) / 1000;
            lastTickMs = ms;
            const nodeWidth = nodeInfo.get()?.bounds.width;
            let es =
                evenShift.get() +
                dynGetNumber(scrollEven, DEFAULT_SCROLL_EVEN) * dt;
            let os =
                oddShift.get() +
                dynGetNumber(scrollOdd, DEFAULT_SCROLL_ODD) * dt;
            if (nodeWidth) {
                es = safeMod(es, nodeWidth);
                os = safeMod(os, nodeWidth);
            }
            evenShift.set(es);
            oddShift.set(os);

            animationHandle = requestAnimationFrame(tick);
        };

        onMount(() => {
            if (elRef.current) {
                resizeObserver.observe(elRef.current);
            }
            const unsubscribe = isActive.subscribe((val) => {
                if (val) {
                    evenShift.set(0);
                    oddShift.set(50);
                    animationHandle = requestAnimationFrame(tick);
                } else if (animationHandle) {
                    cancelAnimationFrame(animationHandle);
                    animationHandle = null;
                }
            });
            return () => {
                resizeObserver.disconnect();
                if (animationHandle) {
                    cancelAnimationFrame(animationHandle);
                    animationHandle = null;
                }
                unsubscribe();
            };
        });

        // TODO: bug in gooey where cssprop: props are not bound to dynamic values
        return (
            <>
                <style>{`
:host {
    display: block;
    width: 200px;
    height: 200px;
    background-color: #DDDDDD;
    margin: 20px 0;
    cursor: pointer;
}
.marquee-button {
    --marquee-button_width: auto;
    --marquee-button_height: auto;
    --marquee-button_calc_width: auto;
    --marquee-button_calc_height: auto;
    --marquee-button_transition_time: 100ms;

    display: inline-flex;
    position: relative;
    align-items: center;
    justify-content: center;

    width: var(--marquee-button_width);
    height: var(--marquee-button_height);
}

.marquee-button_overflow {
    width: 100%;
    height: 100%;
    overflow: hidden;

    display: block;
}

.marquee-button_scroller {
    position: relative;
    width: 0;
    height: 0;
}

.marquee-button_offscreen {
    position: absolute;
    top: calc(var(--marquee-button_calc_height) + 10px);

    display: block;
    width: var(--marquee-button_calc_width);
    height: var(--marquee-button_calc_height);
}

.marquee-button_slot {
    width: 100%;
    height: 100%;

    margin: 0;
    border: none;
    padding: 0;
    color: var(--color-black);
    transition: color var(--marquee-button_transition_time);

    cursor: pointer;
}
.marquee-button--active .marquee-button_slot {
    color: transparent;
}

.marquee-button_shifter {
    pointer-events: none;
    width: var(--marquee-button_calc_width);
    height: var(--marquee-button_calc_height);
    --marquee-button_shifter_angle: 30;
    transform: rotateZ(calc(var(--marquee-button_shifter_angle) * -1rad));
    opacity: 0;
    transition: opacity var(--marquee-button_transition_time);
}
.marquee-button--active .marquee-button_shifter {
    opacity: 1;
}

.marquee-button_item--odd,
.marquee-button_item--even {
    position: absolute;
    display: block;
    width: var(--marquee-button_item-width);
    height: var(--marquee-button_item-height);
}

.marquee-button_item--even {
    left: calc((var(--marquee-button_item-col)) * var(--marquee-button_item-width) + var(--marquee-button_even-shift) + var(--marquee-button_total-shift-x));
    top: calc((var(--marquee-button_item-row)) * var(--marquee-button_item-height) + var(--marquee-button_total-shift-y));
}
.marquee-button_item--odd {
    left: calc((var(--marquee-button_item-col)) * var(--marquee-button_item-width) + var(--marquee-button_odd-shift) + var(--marquee-button_total-shift-x));
    top: calc((var(--marquee-button_item-row)) * var(--marquee-button_item-height) + var(--marquee-button_total-shift-y));
}
`}</style>
                <div
                    ref={elRef}
                    class={calc(
                        () =>
                            `marquee-button ${
                                isActive.get() ? 'marquee-button--active' : ''
                            }`
                    )}
                    style={calc(() => {
                        const widthRaw = dynGet(width) ?? '100%';
                        const widthStr =
                            typeof widthRaw === 'string'
                                ? widthRaw
                                : `${widthRaw}px`;
                        const heightRaw = dynGet(height) ?? '100%';
                        const heightStr =
                            typeof heightRaw === 'string'
                                ? heightRaw
                                : `${heightRaw}px`;
                        return [
                            `--marquee-button_width: ${widthStr}`,
                            `--marquee-button_height: ${heightStr}`,
                            `--marquee-button_calc_width: ${rawDimensions.width}px`,
                            `--marquee-button_calc_height: ${rawDimensions.height}px`,
                        ].join(';');
                    })}
                >
                    <div class="marquee-button_overflow">
                        <div class="marquee-button_scroller" ref={scrollerRef}>
                            <div
                                role="presentation"
                                aria-hidden="true"
                                class="marquee-button_offscreen"
                                ref={offscreenRef}
                            ></div>
                            <div
                                role="presentation"
                                aria-hidden="true"
                                class="marquee-button_shifter"
                                style={calc(() => {
                                    const info = nodeInfo.get();
                                    if (!info) {
                                        return '';
                                    }
                                    return [
                                        `--marquee-button_shifter_angle: ${dynGetNumber(
                                            angle,
                                            DEFAULT_ANGLE
                                        )}`,
                                        `--marquee-button_total-shift-x: ${info.totalShiftX}px`,
                                        `--marquee-button_total-shift-y: ${info.totalShiftY}px`,
                                        `--marquee-button_even-shift: ${evenShift.get()}px`,
                                        `--marquee-button_odd-shift: ${oddShift.get()}px`,
                                        `--marquee-button_item-width: ${info.bounds.width}px`,
                                        `--marquee-button_item-height: ${info.bounds.height}px`,
                                    ].join(';');
                                })}
                            >
                                {calc(() => nodeInfo.get()?.labelNodes)}
                            </div>
                        </div>
                        <slot class="marquee-button_slot" />
                    </div>
                </div>
            </>
        );
    },
});
