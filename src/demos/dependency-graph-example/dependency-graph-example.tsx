import Gooey, {
    Model,
    Calculation,
    Component,
    Collection,
    calc,
    model,
    collection,
    mount,
} from '../../index';

function lerp(from: number, to: number, pct: number) {
    return from + (to - from) * pct;
}
const easeIn = (t: number) => t * t;
const flip = (t: number) => 1 - t;
const easeOut = (t: number) => flip(easeIn(flip(t)));
const easeInOut = (t: number) => lerp(easeIn(t), easeOut(t), t);

function clamp(low: number, val: number, high: number) {
    if (val < low) return low;
    if (val > high) return high;
    return val;
}

const classNames = (args: Record<string, boolean>) => {
    const parts: string[] = [];
    for (const [key, val] of Object.entries(args)) {
        if (val) parts.push(key);
    }
    return parts.join(' ');
};

enum VertexState {
    NORMAL,
    DIRTY,
    ACTIVE,
    DONE,
}
type Vertex = {
    x: number;
    y: number;
    type: 'calc' | 'field';
    label: string;
    desc?: string | undefined;
    value: string;
    state: VertexState;
    isAnimating: boolean;
    animX: number;
    animY: number;
};
type Edge = {
    start: number;
    end: number;
    side: 'top' | 'bottom';
    delta: number;
    visible: Calculation<boolean>;
    extra?: Record<string, boolean>;
};

class VertexModel {
    private states: Partial<Vertex>[];
    private vertex: Model<Vertex>;

    constructor(
        init: Omit<Vertex, 'isAnimating' | 'animX' | 'animY'>,
        states: Partial<Vertex>[]
    ) {
        this.states = states;
        this.vertex = model({
            ...init,
            isAnimating: false,
            animX: init.x,
            animY: init.y,
        });
    }

    moveTo(state: number) {
        const targetState = this.states[state];
        const beforeX = this.vertex.x;
        const beforeY = this.vertex.y;
        for (const [key, val] of Object.entries(targetState)) {
            (this.vertex as any)[key] = val;
        }
        const afterX = this.vertex.x;
        const afterY = this.vertex.y;
        if (beforeX !== afterX || beforeY !== afterY) {
            this.animate(beforeX, beforeY, 1000);
        }
    }

    animate(fromX: number, fromY: number, duration: number) {
        this.vertex.animX = fromX;
        this.vertex.animY = fromY;
        this.vertex.isAnimating = true;
        let start: number | null = null;
        const step = (ms: number) => {
            if (start === null) start = ms;
            const pct = (ms - start) / duration;
            if (pct > 1) {
                this.vertex.isAnimating = false;
                return;
            }
            this.vertex.animX = lerp(fromX, this.vertex.x, easeInOut(pct));
            this.vertex.animY = lerp(fromY, this.vertex.y, easeInOut(pct));
            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    getX() {
        if (this.vertex.isAnimating) {
            return this.vertex.animX;
        }
        return this.vertex.x;
    }

    getY() {
        if (this.vertex.isAnimating) {
            return this.vertex.animY;
        }
        return this.vertex.y;
    }

    getType() {
        return this.vertex.type;
    }

    getState() {
        return this.vertex.state;
    }

    getLabel() {
        return this.vertex.label;
    }

    getDesc() {
        return this.vertex.desc;
    }

    getValue() {
        return this.vertex.value;
    }
}

const SvgVertex: Component<{
    vertex: VertexModel;
}> = ({ vertex }, { onDestroy }) => {
    const fillClass = calc(() =>
        classNames({
            dge_vertex_fill: true,
            'dge_vertex_fill--active': vertex.getState() === VertexState.ACTIVE,
            'dge_vertex_fill--dirty': vertex.getState() === VertexState.DIRTY,
            'dge_vertex_fill--done': vertex.getState() === VertexState.DONE,
        })
    );

    return (
        <g
            class="dge_vertex"
            transform={calc(
                () => `translate(${vertex.getX()} ${vertex.getY()})`
            )}
        >
            {calc(() =>
                vertex.getType() === 'calc' ? (
                    <>
                        <rect
                            class={fillClass}
                            x="-50"
                            y="-50"
                            width="100"
                            height="100"
                        />
                        <rect
                            class="dge_vertex_stroke"
                            x="-50"
                            y="-50"
                            width="100"
                            height="100"
                        />
                    </>
                ) : (
                    <>
                        <circle class={fillClass} cx="0" cy="0" r="50" />
                        <circle
                            class="dge_vertex_stroke"
                            cx="0"
                            cy="0"
                            r="50"
                        />
                    </>
                )
            )}
            <text class="dge_vertex_text">
                <tspan x="0" y="-5">
                    {calc(() => vertex.getLabel())}
                </tspan>
                <tspan x="0" y="20">
                    {calc(() => vertex.getValue())}
                </tspan>
                {calc(() =>
                    vertex.getDesc() ? (
                        <tspan x="0" y="100">
                            {vertex.getDesc()}
                        </tspan>
                    ) : null
                )}
            </text>
        </g>
    );
};

const Connector: Component<{
    x1: Calculation<number>;
    y1: Calculation<number>;
    x2: Calculation<number>;
    y2: Calculation<number>;
    delta: Calculation<number>;
    visible: Calculation<boolean>;
    extra: Record<string, boolean>;
}> = ({ x1, y1, x2, y2, delta, visible, extra }) => {
    const mx = calc(() => (x1.get() + x2.get()) / 2);
    const my = calc(() => (y1.get() + y2.get()) / 2 - delta.get());
    const controlX = calc(() => (x2.get() - x1.get()) / 4);
    const controlY = calc(() => (y2.get() - y1.get()) / 4 + delta.get());
    return (
        <path
            class={calc(() =>
                classNames({
                    dge_edge: true,
                    'dge_edge--hidden': !visible.get(),
                    ...extra,
                })
            )}
            d={calc(
                () => `
M ${x1.get()} ${y1.get()}
C ${x1.get()} ${y1.get() - controlY.get()} ${
                    mx.get() - controlX.get()
                } ${my.get()} ${mx.get()} ${my.get()}
C ${mx.get() + controlX.get()} ${my.get()} ${x2.get()} ${
                    y2.get() - controlY.get()
                } ${x2.get()} ${y2.get()}
`
            )}
        />
    );
};

const verticesById: Record<string, VertexModel> = {
    stateLeft: new VertexModel(
        {
            x: 60,
            y: 100,
            type: 'field',
            label: 'state.left',
            value: 'false',
            state: VertexState.NORMAL,
            desc: '',
        },
        [
            { value: 'false', state: VertexState.NORMAL, desc: '' },
            { value: 'true', state: VertexState.ACTIVE, desc: 'Changed!' },
            { value: 'true', state: VertexState.DONE, desc: 'Propagate' },
            { value: 'true', state: VertexState.DONE, desc: '' },
            { value: 'true', state: VertexState.DONE, desc: '' },
            { value: 'true', state: VertexState.DONE, desc: '' },
            { value: 'true', state: VertexState.DONE, desc: '' },
            { value: 'true', state: VertexState.DONE, desc: '' },
        ]
    ),
    leftChecked: new VertexModel(
        {
            x: 170,
            y: 100,
            type: 'calc',
            label: 'left:checked',
            value: 'false',
            state: VertexState.NORMAL,
            desc: '',
        },
        [
            { value: 'false', state: VertexState.NORMAL, desc: '' },
            { value: 'false', state: VertexState.NORMAL, desc: '' },
            { value: 'false', state: VertexState.DIRTY, desc: 'Needs recalc' },
            {
                value: 'true',
                state: VertexState.ACTIVE,
                desc: `Recalculated`,
            },
            { value: 'true', state: VertexState.DONE, desc: '' },
            { value: 'true', state: VertexState.DONE, desc: '' },
            { value: 'true', state: VertexState.DONE, desc: '' },
            { value: 'true', state: VertexState.DONE, desc: '' },
        ]
    ),
    isLocked: new VertexModel(
        {
            x: 280,
            y: 100,
            type: 'calc',
            label: 'isLocked',
            value: 'true',
            state: VertexState.NORMAL,
            desc: '',
        },
        [
            { value: 'true', state: VertexState.NORMAL, x: 280, desc: '' },
            { value: 'true', state: VertexState.NORMAL, x: 280, desc: '' },
            {
                value: 'true',
                state: VertexState.DIRTY,
                x: 280,
                desc: 'Needs recalc',
            },
            {
                value: 'true',
                state: VertexState.DIRTY,
                x: 280,
                desc: 'Needs recalc',
            },
            {
                value: 'true',
                state: VertexState.ACTIVE,
                x: 280,
                desc: 'Recalculated; gained new edge!',
            },
            {
                value: 'true',
                state: VertexState.ACTIVE,
                x: 280,
                desc: 'Bad order',
            },
            {
                value: 'true',
                state: VertexState.ACTIVE,
                x: 390,
                desc: 'Reordered',
            },
            {
                value: 'true',
                state: VertexState.DONE,
                x: 390,
                desc: "Value didn't change; no propagation",
            },
        ]
    ),
    launchButton: new VertexModel(
        {
            x: 390,
            y: 100,
            type: 'calc',
            label: 'launch:button',
            value: '"Locked"',
            state: VertexState.NORMAL,
            desc: '',
        },
        [
            { x: 390, desc: '' },
            { x: 390, desc: '' },
            { x: 390, desc: '' },
            { x: 390, desc: '' },
            { x: 390, desc: '' },
            { x: 390, desc: 'Bad order' },
            { x: 500, desc: 'Reordered' },
            { x: 500, desc: '' },
        ]
    ),
    stateRight: new VertexModel(
        {
            x: 500,
            y: 100,
            type: 'field',
            label: 'state.right',
            value: 'false',
            state: VertexState.NORMAL,
            desc: '',
        },
        [
            { x: 500, desc: '' },
            { x: 500, desc: '' },
            { x: 500, desc: '' },
            { x: 500, desc: '' },
            { x: 500, desc: '' },
            { x: 500, desc: 'Bad order' },
            { x: 280, desc: 'Reordered' },
            { x: 280, desc: '' },
        ]
    ),
    rightChecked: new VertexModel(
        {
            x: 610,
            y: 100,
            type: 'calc',
            label: 'right:checked',
            value: 'false',
            state: VertexState.NORMAL,
            desc: '',
        },
        [{}, {}, {}, {}, {}, {}, {}, {}]
    ),
};

const Diagram: Component<{
    vertices: Collection<VertexModel>;
    edges: Collection<Edge>;
}> = ({ vertices, edges }) => {
    return (
        <svg
            class="dge_diagram"
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
            xmlns:xl="http://www.w3.org/1999/xlink"
            xmlns:dc="http://purl.org/dc/elements/1.1/"
            viewBox="0 0 700 220"
            width="700"
            height="220"
        >
            <style>{`
.dge_diagram {
    width: 100%;
    height: auto;
}
.dge_vertex {
}
.dge_vertex_fill {
    fill: white;
    transition: fill 500ms;
    filter: url(#svg_shadow);
}
.dge_vertex_fill--active {
    fill: #F6C2C1;
}
.dge_vertex_fill--dirty {
    fill: #FFFEC6;
}
.dge_vertex_fill--done {
    fill: #CCCCCC;
}

.dge_vertex_stroke {
    stroke: black;
    stroke-width: 1px;
}

.dge_vertex_text {
    fill: black;
    text-anchor: middle;
    font-size: 14px;
}
.dge_edge {
    stroke: black;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1px;
    marker-end: url(#svg_arrowhead);
    opacity: 1;
    transition: opacity 300ms;
}
.dge_edge--dashed {
    stroke-dasharray: 6 3;
}
.dge_edge--hidden {
    opacity: 0;
}
.dge_buttons {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
}
.dge_buttons button {
    flex: 0 0 auto;
    width: 22px;
    height: 22px;
    text-align: center;
    padding: 0;
    pointer: cursor;
}
.dge_step {
    cursor: pointer;
    border-radius: 100%;
    border: thin black solid;
}
.dge_step:disabled {
    color: black;
    background-color: #F6C2C1;
}
            `}</style>
            <defs>
                <filter id="svg_shadow">
                    <feGaussianBlur
                        in="SourceAlpha"
                        result="blur"
                        stdDeviation="1.308"
                    />
                    <feOffset in="blur" result="offset" dx="0" dy="2" />
                    <feFlood
                        flood-color="black"
                        flood-opacity=".5"
                        result="flood"
                    />
                    <feComposite
                        in="flood"
                        in2="offset"
                        operator="in"
                        result="color"
                    />
                    <feMerge>
                        <feMergeNode in="color" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <marker
                    orient="auto"
                    overflow="visible"
                    markerUnits="strokeWidth"
                    id="svg_arrowhead"
                    stroke-linejoin="miter"
                    stroke-miterlimit="10"
                    viewBox="-1 -4 10 8"
                    markerWidth="10"
                    markerHeight="8"
                    color="black"
                >
                    <g transform="translate(-8 0)">
                        <path
                            d="M 8 0 L 0 -3 L 0 3 Z"
                            fill="currentColor"
                            stroke="currentColor"
                            stroke-width="1"
                        />
                    </g>
                </marker>
            </defs>
            <g
                fill="none"
                stroke="none"
                stroke-opacity="1"
                stroke-dasharray="none"
                fill-opacity="1"
            >
                {vertices.mapView((vertex) => (
                    <SvgVertex vertex={vertex} />
                ))}
                {edges.mapView(
                    ({ start, end, side, delta, visible, extra }) => (
                        <Connector
                            x1={calc(() => vertices[start].getX())}
                            y1={calc(
                                () =>
                                    vertices[start].getY() +
                                    (side === 'top' ? -50 : 50)
                            )}
                            x2={calc(() =>
                                vertices[start].getX() < vertices[end].getX()
                                    ? vertices[end].getX() - 15
                                    : vertices[end].getX() + 15
                            )}
                            y2={calc(
                                () =>
                                    vertices[end].getY() +
                                    (side === 'top' ? -50 : 50)
                            )}
                            delta={calc<number>(() => delta)}
                            visible={visible}
                            extra={extra || {}}
                        />
                    )
                )}
            </g>
        </svg>
    );
};

const App = () => {
    const state = model({
        index: 0,
    });
    const setIndex = (newIndex: number) => {
        state.index = clamp(0, newIndex, 7);
        for (const vertex of Object.values(verticesById)) {
            vertex.moveTo(state.index);
        }
    };

    const vertices = collection([
        verticesById.stateLeft,
        verticesById.leftChecked,
        verticesById.isLocked,
        verticesById.launchButton,
        verticesById.stateRight,
        verticesById.rightChecked,
    ]);

    const edges = collection<Edge>([
        {
            start: 0,
            end: 1,
            side: 'top',
            delta: 30,
            visible: calc<boolean>(() => true),
        },
        {
            start: 0,
            end: 2,
            side: 'bottom',
            delta: -30,
            visible: calc<boolean>(() => true),
        },
        {
            start: 2,
            end: 3,
            side: 'top',
            delta: 30,
            visible: calc<boolean>(() => true),
        },
        {
            start: 4,
            end: 5,
            side: 'bottom',
            delta: -30,
            visible: calc<boolean>(() => true),
        },
        {
            start: 4,
            end: 2,
            side: 'bottom',
            delta: -35,
            visible: calc<boolean>(() => state.index >= 4),
            extra: { 'dge_edge--dashed': true },
        },
    ]);

    return (
        <div class="dge">
            <Diagram vertices={vertices} edges={edges} />
            <div class="dge_buttons">
                <button
                    disabled={calc(() => state.index === 0)}
                    on:click={() => {
                        setIndex(state.index - 1);
                    }}
                >
                    ←
                </button>
                {Array(8)
                    .fill(null)
                    .map((n, index) => (
                        <button
                            class="dge_step"
                            disabled={calc(() => state.index === index)}
                            on:click={() => setIndex(index)}
                        >
                            {index + 1}
                        </button>
                    ))}
                <button
                    disabled={calc(() => state.index === 7)}
                    on:click={() => {
                        setIndex(state.index + 1);
                    }}
                >
                    →
                </button>
            </div>
        </div>
    );
};

const root = document.getElementById('dge');

if (root) {
    mount(root, <App />);
}
