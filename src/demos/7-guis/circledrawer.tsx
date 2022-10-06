import Gooey, {
    Model,
    ClassComponent,
    Ref,
    Calculation,
    Collection,
    collection,
    model,
    calc,
    ref,
} from '../..';
import { Window, WindowPosition } from './window';

/* An undo/redo stack that handles reversible operations */
class UndoStack<TAction, TResult> {
    accum: TResult;
    canUndo: Calculation<boolean>;
    canRedo: Calculation<boolean>;

    private actions: TAction[];
    private state: Model<{ index: number; numActions: number }>;

    private doAction: (val: TResult, action: TAction) => TResult;
    private undoAction: (val: TResult, action: TAction) => TResult;

    constructor(
        init: TResult,
        config: {
            doAction: (val: TResult, action: TAction) => TResult;
            undoAction: (val: TResult, action: TAction) => TResult;
        }
    ) {
        this.doAction = config.doAction;
        this.undoAction = config.undoAction;
        this.accum = init;
        this.actions = [];
        this.state = model({
            numActions: 0,
            index: 0,
        });

        this.canUndo = calc(() => this.state.index > 0);
        this.canRedo = calc(() => this.state.index < this.state.numActions);
    }

    addAction(action: TAction) {
        this.actions.splice(
            this.state.index,
            this.actions.length - this.state.index,
            action
        );
        this.accum = this.doAction(this.accum, action);
        this.state.numActions = this.actions.length;
        this.state.index = this.actions.length;
    }

    undo() {
        if (!this.canUndo()) {
            return;
        }
        this.state.index--;
        const action = this.actions[this.state.index];
        this.accum = this.undoAction(this.accum, action);
    }

    redo() {
        if (!this.canRedo()) {
            return;
        }
        const action = this.actions[this.state.index];
        this.state.index++;
        this.accum = this.doAction(this.accum, action);
    }
}

type Circle = Model<{
    x: number;
    y: number;
    r: number;
}>;

type Action =
    | { type: 'new'; circle: Circle }
    | { type: 'adjust'; from: Circle; to: Circle };

export class CircleDrawer extends ClassComponent {
    childWindowPosition: undefined | WindowPosition;
    undoStack: UndoStack<Action, Collection<Circle>>;
    state: Model<{
        width: number;
        height: number;
        selected: null | Circle;
        dynamicR: number;
    }>;
    svgContainerEl: Ref<HTMLDivElement>;
    actions: Action[];

    constructor(props: {}) {
        super(props);

        this.undoStack = new UndoStack(collection([]), {
            doAction: (state: Collection<Circle>, action: Action) => {
                switch (action.type) {
                    case 'new':
                        state.push(action.circle);
                        break;
                    case 'adjust': {
                        const index = state.indexOf(action.from);
                        if (index >= 0) state[index] = action.to;
                        break;
                    }
                }
                return state;
            },
            undoAction: (state: Collection<Circle>, action: Action) => {
                switch (action.type) {
                    case 'new':
                        state.pop();
                        break;
                    case 'adjust':
                        {
                            const index = state.indexOf(action.to);
                            if (index >= 0) state[index] = action.from;
                            break;
                        }
                        break;
                }
                return state;
            },
        });

        this.actions = [];
        this.state = model({
            toIndex: 0,
            numActions: 0,
            width: 400,
            height: 300,
            selected: null,
            dynamicR: 30,
        });
        this.childWindowPosition = undefined;

        this.svgContainerEl = ref<HTMLDivElement>();
    }

    renderChildWindow() {
        return (
            <Window
                name="Adjust circle"
                onClose={() => {
                    if (!this.state.selected) return;
                    this.saveAdjustment();
                }}
                startPosition={this.childWindowPosition}
                onMove={(position) => {
                    this.childWindowPosition = position;
                }}
            >
                {calc(() => {
                    return (
                        <div class="p col cross-center">
                            <label for="circle-diameter">
                                Adjust diameter of circle at (
                                {calc(() => this.state.selected?.x)},{' '}
                                {calc(() => this.state.selected?.y)})
                            </label>
                            <input
                                id="circle-diameter"
                                type="range"
                                min="3"
                                max="200"
                                on:input={(e, el) => {
                                    if (!this.state.selected) return;
                                    this.state.dynamicR = parseInt(el.value);
                                }}
                                value={calc(
                                    () => `${this.state.dynamicR ?? 3}`
                                )}
                            />
                        </div>
                    );
                })}
            </Window>
        );
    }

    onMount() {
        const observer = new ResizeObserver((items) => {
            for (const item of items) {
                if (item.contentRect.width !== this.state.width) {
                    this.state.width = item.contentRect.width;
                }
                if (item.contentRect.height !== this.state.height) {
                    this.state.height = item.contentRect.height;
                }
            }
        });
        if (this.svgContainerEl.current) {
            observer.observe(this.svgContainerEl.current);
        }
        return () => {
            observer.disconnect();
        };
    }

    onUndoClick = () => {
        this.undoStack.undo();
    };

    onRedoClick = () => {
        this.undoStack.redo();
    };

    saveAdjustment() {
        if (!this.state.selected) return;
        this.undoStack.addAction({
            type: 'adjust',
            from: this.state.selected,
            to: model({
                ...this.state.selected,
                r: this.state.dynamicR,
            }),
        });
        this.state.selected = null;
    }

    onSvgClick = (event: MouseEvent) => {
        const circles = this.undoStack.accum;
        const selected = circles.find((circle) => {
            const dx = circle.x - event.offsetX;
            const dy = circle.y - event.offsetY;
            return dx * dx + dy * dy < circle.r * circle.r;
        });
        if (selected) {
            this.state.selected = selected;
            this.state.dynamicR = selected.r;
        } else if (this.state.selected) {
            this.saveAdjustment();
        } else {
            this.undoStack.addAction({
                type: 'new',
                circle: model({
                    x: event.offsetX,
                    y: event.offsetY,
                    r: 30,
                }),
            });
        }
    };

    render() {
        return (
            <div class="p col clip">
                <div class="row stretch main-center">
                    <button
                        on:click={this.onUndoClick}
                        disabled={calc(() => !this.undoStack.canUndo())}
                    >
                        Undo
                    </button>
                    <button
                        on:click={this.onRedoClick}
                        disabled={calc(() => !this.undoStack.canRedo())}
                    >
                        Redo
                    </button>
                </div>
                {calc(() => {
                    const selected = this.state.selected;
                    if (!selected) return null;
                    return this.renderChildWindow();
                })}
                <div
                    ref={this.svgContainerEl}
                    class="row shrink grow stretch clip"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="cursor-crosshair"
                        width={calc(() => this.state.width)}
                        height={calc(() => this.state.height)}
                        viewBox={calc(
                            () => `0 0 ${this.state.width} ${this.state.height}`
                        )}
                        on:click={this.onSvgClick}
                    >
                        <rect
                            width={calc(() => this.state.width)}
                            height={calc(() => this.state.height)}
                            fill="white"
                        />
                        {this.undoStack.accum.mapView((circle) => (
                            <circle
                                cx={circle.x}
                                cy={circle.y}
                                r={calc(() =>
                                    circle === this.state.selected
                                        ? this.state.dynamicR
                                        : circle.r
                                )}
                                fill={calc(() =>
                                    circle === this.state.selected
                                        ? '#808080'
                                        : 'transparent'
                                )}
                                stroke="black"
                                class="cursor-pointer"
                            />
                        ))}
                    </svg>
                </div>
            </div>
        );
    }
}
