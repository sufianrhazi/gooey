export class InvariantError extends Error {
    detail?: any;
    constructor(msg: string, detail?: any) {
        super(msg);
        this.detail = detail;
    }
}

export const TypeTag = Symbol('typeTag');
export const ContextGetterTag = Symbol('contextGetter');
export const DataTypeTag = Symbol('dataTypeTag');
export const CalculationTypeTag = Symbol('calculationType');
export const CalculationRecalculateTag = Symbol('calculationRecalculate');
export const CalculationRecalculateCycleTag = Symbol(
    'calculationRecalculateCycle'
);
export const CalculationInvalidateTag = Symbol('calculationInvalidate');
export const CalculationSetCycleTag = Symbol('calculationSetCycle');

export const ObserveKey = Symbol('observe');
export const GetSubscriptionConsumerKey = Symbol('getSubscriptionConsumer');
export const GetSubscriptionEmitterKey = Symbol('getSubscriptionEmitter');
export const MakeModelViewKey = Symbol('makeModelView');

export const DisposeKey = Symbol('dispose');
export const MarkRootKey = Symbol('markRoot');
export const UnmarkRootKey = Symbol('unmarkRoot');

export const FlushKey = Symbol('flush');
export const AddSubscriptionConsumerWorkKey = Symbol(
    'addSubscriptionConsumerWork'
);
export const NotifyKey = Symbol('notify');

export type IntrinsicNodeObserverNodeCallback = (
    node: Node,
    event: 'add' | 'remove'
) => void;
export type IntrinsicNodeObserverElementCallback = (
    element: Element,
    event: 'add' | 'remove'
) => void;

export type ProcessAction =
    | 'recalculate'
    | 'recalculate-cycle'
    | 'cycle'
    | 'invalidate';

/**
 * A ref object that can be passed to native elements.
 */
export type Ref<T> = {
    [TypeTag]: 'ref';
    current: T | undefined;
};
export function isRef(ref: any): ref is Ref<unknown> {
    return ref && ref[TypeTag] === 'ref';
}

/**
 * Make a ref object that can be passed to native elements.
 */
export function ref<T>(val?: T): Ref<T> {
    return {
        [TypeTag]: 'ref',
        current: val,
    };
}

export type ModelEvent =
    | {
          type: 'add';
          key: string | number | symbol;
      }
    | {
          type: 'set';
          key: string | number | symbol;
          value: any;
      }
    | {
          type: 'delete';
          key: string | number | symbol;
      };
export type ModelObserver = (event: ModelEvent) => void;

export type EqualityFunc<T> = (a: T, b: T) => boolean;
export type MappingFunction<T, V> = (item: T) => V;
export type FilterFunction<T> = (item: T) => boolean;
export type FlatMapFunction<T, V> = (item: T) => V[];

export interface ViewSpec<TInitialize, TItem, TEvent> {
    /**
     * Return initial items
     */
    initialize: (items: TInitialize) => TItem[];

    /**
     * Process subscription events
     */
    processEvent: (
        view: Collection<TItem>,
        event: TEvent,
        initialValue: TItem[]
    ) => void;
}

export type CollectionEvent<T> =
    | {
          type: 'splice';
          index: number;
          count: number;
          items: readonly T[];
          removed: readonly T[];
      }
    | {
          type: 'move';
          fromIndex: number;
          fromCount: number;
          toIndex: number;
          moved: readonly T[];
      }
    | {
          type: 'sort';
          indexes: readonly number[];
      };

export type TrackedData<TTypeTag, TEvent> = {
    [TypeTag]: 'data';
    [DataTypeTag]: TTypeTag;
    [AddSubscriptionConsumerWorkKey]: (task: () => void) => void;
    [ObserveKey]: (
        listener: (
            events: TEvent[],
            subscriptionEmitter: SubscriptionEmitter
        ) => void
    ) => () => void;
    [GetSubscriptionConsumerKey]: () => SubscriptionConsumer;
    [GetSubscriptionEmitterKey]: () => SubscriptionEmitter;
    [NotifyKey](event: TEvent): void; // Note: bivariance needed here!

    [DisposeKey]: () => void;
    [MarkRootKey]: () => void;
    [UnmarkRootKey]: () => void;
};

/**
 * A mutable object to hold state
 */
interface ModelMethods<T extends {}> {
    [MakeModelViewKey]: <V>(
        modelViewSpec: ViewSpec<Readonly<T>, V, ModelEvent>,
        debugName?: string
    ) => View<V>;
}
export type Model<T> = TrackedData<'model', ModelEvent> &
    ModelMethods<T> & {
        [Key in keyof T]: T[Key];
    };

/**
 * A mutable array to hold state, with some additional convenience methods
 */
interface CollectionMethods<T> {
    makeView<V>(
        viewSpec: ViewSpec<readonly T[], V, CollectionEvent<T>>,
        debugName?: string
    ): View<V>;
    mapView<V>(mapFn: MappingFunction<T, V>, debugName?: string): View<V>;
    filterView(filterFn: FilterFunction<T>, debugName?: string): View<T>;
    flatMapView<V>(
        flatMapFn: MappingFunction<T, V[]>,
        debugName?: string
    ): View<V>;
    reject(shouldReject: (item: T, index: number) => boolean): T[];
    moveSlice(fromIndex: number, fromCount: number, toIndex: number): void;
}
export interface Collection<T>
    extends TrackedData<'collection', CollectionEvent<T>>,
        CollectionMethods<T>,
        Array<T> {}

/**
 * A readonly array to hold projected state
 */
interface ViewMethods<T> {
    makeView<V>(
        viewSpec: ViewSpec<readonly T[], V, CollectionEvent<T>>,
        debugName?: string
    ): View<V>;
    mapView<V>(mapFn: MappingFunction<T, V>, debugName?: string): View<V>;
    filterView(filterFn: FilterFunction<T>, debugName?: string): View<T>;
    flatMapView<V>(
        flatMapFn: MappingFunction<T, V[]>,
        debugName?: string
    ): View<V>;
}
export interface View<T>
    extends TrackedData<'collection', CollectionEvent<T>>,
        ViewMethods<T>,
        ReadonlyArray<T> {}

export interface SubscriptionConsumer {
    $__id: number;
    [TypeTag]: 'subscriptionConsumer';
    item: any;
    [FlushKey]: () => boolean;
}

export interface SubscriptionEmitter {
    $__id: number;
    [TypeTag]: 'subscriptionEmitter';
    item: any;
    [FlushKey]: () => boolean;
}

export interface NodeOrdering {
    $__id: number;
    [TypeTag]: 'nodeOrdering';
}

/**
 * A key-value pair that is active for a subtree
 */
export interface Context<TValue> {
    (): never;
    [ContextGetterTag]: () => TValue;
    [TypeTag]: 'context';
}

export function createContext<TValue>(val: TValue): Context<TValue> {
    return Object.assign(
        () => {
            throw new Error('Do not call contexts as functions');
        },
        {
            [ContextGetterTag]: () => val,
            [TypeTag]: 'context' as const,
        }
    );
}

export function getContext<TValue>(context: Context<TValue>): TValue {
    return context[ContextGetterTag]();
}

export function isContext(val: any): val is Context<any> {
    return !!(val && val[TypeTag] === 'context');
}

/**
 * A calculation cell that recalculates when dependencies change
 */
export interface Calculation<Result> {
    (): Result;
    $__id: number;
    [TypeTag]: 'calculation';
    [CalculationTypeTag]: 'calculation' | 'effect';
    [DisposeKey]: () => void;
    onError: (handler: (errorType: 'cycle' | 'error') => Result) => this;
    [CalculationSetCycleTag]: () => boolean;
    [CalculationRecalculateTag]: () => boolean;
    [CalculationRecalculateCycleTag]: () => boolean;
    [CalculationInvalidateTag]: () => void;
}

export interface ModelField {
    $__id: number;
    model: {
        [DataTypeTag]: any;
    };
    key: string | number | symbol;
}

export function isModel(thing: any): thing is Model<unknown> {
    return !!(
        thing &&
        thing[TypeTag] === 'data' &&
        thing[DataTypeTag] === 'model'
    );
}

export function isModelField(thing: any): thing is ModelField {
    return !!(
        thing &&
        !thing[TypeTag] &&
        !!thing.model &&
        !!thing.model[DataTypeTag]
    );
}

export function isCollection(thing: any): thing is Collection<any> | View<any> {
    return !!(
        thing &&
        thing[TypeTag] === 'data' &&
        thing[DataTypeTag] === 'collection'
    );
}

export function isCalculation(thing: any): thing is Calculation<any> {
    return !!(thing && thing[TypeTag] === 'calculation');
}

export function isEffect(thing: Calculation<unknown>): boolean {
    return thing[CalculationTypeTag] === 'effect';
}

export function isSubscriptionEmitter(
    thing: any
): thing is SubscriptionEmitter {
    return !!(thing && thing[TypeTag] === 'subscriptionEmitter');
}

export function isSubscriptionConsumer(
    thing: any
): thing is SubscriptionConsumer {
    return !!(thing && thing[TypeTag] === 'subscriptionConsumer');
}

export function isNodeOrdering(thing: any): thing is NodeOrdering {
    return !!(thing && thing[TypeTag] === 'nodeOrdering');
}

export type GraphNode =
    | Calculation<any>
    | ModelField
    | SubscriptionConsumer
    | SubscriptionEmitter
    | NodeOrdering;

export type RetainedItem = GraphNode | Model<any> | Collection<any> | View<any>;

const RenderNodeTag = Symbol('renderNodeTag');

/**
 * The RenderNode lifecycle
 * ========================
 *
 * - Each RenderNode starts in the "inert" state, which is initialized
 *   via the call to the `init` function passed to `createRenderNode(type, metadata, init)`
 * - When a RenderNode is .retain()ed, its refcount increases; if the refcount is initialized for the first time, it
 *   creates/populates its persistent state data and becomes "alive" (ready to be attached)
 * - Intrinsic nodes should create their corresponding DOM nodes in persistent state initialization
 * - When a RenderNode is .release()d, causing its refcount to go to zero, it destroys its persistent state
 *   initialization and is "inert"
 * - It is possible for a RenderNode to transition between "alive" and "inert" multiple times.
 * - When a RenderNode is .attach(handler, callback)ed, it is "attached" to its parent node. It cannot be attached to
 *   multiple parent RenderNodes at the same time. When a node is "attached" it is not necessarily mounted to the DOM.
 * - Attached state is *separate* from mounted state
 *   - Immediately after a node is mounted, its .afterMount() should be called
 *   - Immediately before a node is unmounted, its .beforeUnmount() should be called
 *   - In either of these cases, a node should first call these methods on its children before performing actions.
 * - When a node becomes "alive" it should call attach() on all of its child nodes; when a node becomes "inert" it should call detach() on all of its child nodes
 *   - If a node is not mounted and gains responsibility for a child node, it should call childNode.attach()
 *   - If a node is mounted and releases responsibility for a child node, it should call childNode.beforeUnmount() followed by childNode.detach()
 *   - If a node is not mounted and releases responsibility for a child node, it should call childNode.detach()
 * - When a root node is mounted via mount(rootDomNode, rootRenderNode) and then unmounted, the following sequence of calls is performed:
 *   - On unmount = mount(rootDomNode, rootRenderNode):
 *     - rootRenderNode.retain()
 *     - rootRenderNode.attach(eventHandler, context)
 *     - (any nodes spliced in via the eventHandler are added to rootDomNode)
 *     - rootRenderNode.afterMount()
 *   - On unmount();
 *     - rootRenderNode.beforeUnmount()
 *     - rootRenderNode.detach(eventHandler, context)
 *     - rootRenderNode.release()
 *
 *
 *                                   Throw Error
 *                                 (double attach)
 *                                        ▲
 *                 attach()               │- attach()
 *           ┌─────┐  |               ┌───┴────┐
 *           │alive├─────────────────►│attached│
 *           └────┬┘                  └───────┬┘
 *            ▲   │- release()         ▲      │- detach()
 *            │   │                    │      │
 *            │   │                    │      │
 *            │   │                    │      │
 *            │   │                    │      │
 *            │   │                    │      │
 *            │   │                    │      │
 *  retain() -│   ▼          attach() -│      ▼
 *           ┌┴────┐                  ┌┴───────┐
 *           │inert│◄─────────────────┤detached│
 *           └─────┘             |    └────┬───┘
 *              ▲            release()     │- detach()
 *              │                          ▼
 *              │                     Throw Error
 *            start                 (double detach)
 *
 */

/**
 * This is a big ol hack that allows components which don't declare any props (const MyComponent: Component<{}> = ...) to enforce that no children can be passed.
 * Why does this work? {} types as function properties accept _any_ props
 *
 * See:
 * - https://www.typescriptlang.org/play?jsx=1#code/C4TwDgpgBAShB2ATCAnCiDCB7AtmL8CwUAvFAN5QDGWWANgFxQBGtdEAhvFAL4DcAKGRU6HNNQIBnYgFd4MyegDKIHK0ZQ5ASwCOM6JNXrBoSFGx4CRADwAVAAoosYSQD5SUABRgnLpg99JKAAyCigAbTkFZSN6AF0AfiZWek5uHgBKUnc4JFR0C3xCeGBBIQgRMWh4DhwISTAOKmgAKSUADQoBKB6oU2gASRKULXhJLSoAUXY6kqCycm7e5Yg8UCZF5eWeJa2oAC9ULA3dvd6AfXOoxUQkvpR9ABpT7ZfeqxOzraoACy06RBoeBMNrtAB001WREEXx4zy+VgA8mBgJ8vr1fv9AQg7qCITNoW8ejsvjgZHRgFo0ejqH8AUCQR18VCSuE4jCznCiVAyRStMjUV0aT1MfScYzwZDZsA2Ry9lyEYRESgALLkynU9Gi7HAqB4qVEKAAHz1TINrPZ3IVZyRqvV-JRmq+2qBuLNBJKxtNko9MstsPhZ3CVAUwFw5sF0hG8AA5nEnUGQ9Jw76AILAYAjZgyYAQJhR0ZxphcEByrb8U47U6jXMoABmTWgEYwdJ16czWmzuaFZxdCA2Fdep36UAjHgLsa98jUqC9KXYXC9cmQddG6Cn5LoXtyyDQmFwRUJVYA9MeBKeoEMO2MJlAIL7JOez0-R2sQFAfM4gp49PVKQQmAAdx+d9ECweo+j+IJmAgH4OAAN2gYAoKgQCOBABIMgEaxVhRd9j1cQQcLfVxrAADygAjrGPXDQEI7DaJAUiKKoljSJokiygvAAtI5aSxIFsMOJxKPo6xhKwZjROoiSxNk8jpLYmSjnol9EUIO8yKaYhtWwqxRKI-SpKo48rDEsyFNY6TTMIVSL3U6BnH-Got106wkRRAy9KVTzjPYjzgHMnzAssvzqICuzjygNU+TAdhNO0-ixXgbDeUpLzrDSrQoDC48srE-LQqKvL7Ui6LyS0OLHJRLQCA4VzW0EzL7QFDKsta3L2pRAqWu6oqlJKvkBTKyYtKoYA6HffSsBQHkZugPsUvcpU7T5DLbRi9Lco20rDJWzatDCgadr5MqBVqlzJqgabZpweakp1LwSygacYJQLDlogZUDtagi9q+1bKQ64qTqB7r-u+3qQqU479qhyKX0KKxPXvFlgEfC8BAEGgxmISY3yYJHimAaxyB4dwyE8LISHcTxKBoegmEzfReAyQQcekKBeKcQmD2RkmyYprxqdp+m2CZh5oEydmpGIBzecsYnSYehlvWZaVeCFqnsi8MXGfuFnpex2WoAcgUFcPEplcWt0fTRzWPG1mndYkfXmaltnjdx8q+Qt-nrca-s1YjNkHcpkWXYZjR3dZmXvZ+x1zD5pX6cD+BbfVohQ-Jx2I7p13o8l2Ovc5s3AapJPFZsVOBKD-VfS9eu0ezrW871wvDc9jm5bhobE6J6uVfFYOG5NJvpRb3OdfzqOJc7riovxvCP0CLxf2kC6gJAqAwIg5CtGg2CEKQlC0Iwj6l9ADLL6Y4qb7E+-+us++F65vjFuw7msAyr-ct-ojf5PxMv-LG9kNIQDGjpVs2EHIZVgblByYlEFAPYog1+sCnIXXqg9GBwU4F4IQcFJBRCUHUTNuDUBUUDpVQSuNIeS0DoZUYblA6YlWGkOPKw1+MVKrxUwXVBqtcGFQyYSIlh8MiIJ2hopayUiRqQKujdOa4gP7WDLowv6uCAbMOKuo3aWjIanQ4Xo066CaoCMURpGayiFppyevAd8r1UAfRMWDYgmi1G9zcTlXRXiHSBSIq4-xR1rJBOGgvRGydDSo2lEEUYdZUB7hfFjbul4b6O3OJ+PwFBMjT3bnPD2cdOYDC-o7LJkgNhQEuNcdAdx5xpFZnkguBTi6pIGLAym5TKmLQlJnT0uTnYz3FgbQpJdiDtLwZTTJgRulpwzmOAZotmkjNaSbAYjCpldLCD0kezc4iNMGfklZRs2lSIyVsmuyV5m+mzm3ZZMcTlrKCecmZ2y069LHGPd0eyDlLNnscruTy-GtU2a8y5Oprn2y+XbCe+zFmR2GQ8z2L50nlLXvoDeAFULb13kEfeh84KIUggfVC6FMLYQGOkjxlKSLFRpXhMS9K6IcKZUxV+pTVElL4tSwBA0uVOEZbymRJl+WSXQeAyBODrATOgNS+BdK0EUuQTDayMqzpWPMS5KVMrfqMvIcQXKOqKHSv1SEkVpruH2hoRAxKnKNGMp0XyrhFL2EqpFc6l8PCaH8K1XakR1KzmGrkURdZ8MWXBsoaOBRU0rG3Xupy55cq-E+L5UEvVfizXsR1eXM6mr6qWMcnGlRdjPDPSce9JVwLPJJu0WIhVVaAmVtrX3aRVlzUNsIkAA
 */
export type RenderEvent =
    | {
          type: 'splice';
          index: number;
          count: number;
          nodes: (Text | Element)[];
      }
    | {
          type: 'move';
          fromIndex: number;
          count: number;
          toIndex: number;
      }
    | {
          type: 'sort';
          fromIndex: number;
          /** Note: indexes are absolute, not relative from fromIndex */
          indexes: number[];
      };

// Next up:
// - Probably: add a test to verify elements can be _moved_ (gasp) without being recreated; this may totally fuck with Context? But maybe not? Mutable renderContext? :shrug:
// const MyComponent = ({ children }) => {
//     const state = model({ left: false });
//     return <div><div id="left">{calc(() => state.left ? children : null)}</div><div id="right">{calc(() => state.left ? null : children)}</div></div>;
// }
// - Probably: add a bunch of tests to see what happens when a rendered node is unmounted and re-mounted without being re-createElemented (i.e. hide children and then show children)

export type RenderEventHandler = (event: RenderEvent) => void;

export type RenderContext = {
    nodeOrdering: NodeOrdering;
    contextMap: Map<Context<any>, any>;
};

interface RenderNodeLifecycle {
    attach?: (handler: RenderEventHandler, context: RenderContext) => void;
    detach?: (handler: RenderEventHandler, context: RenderContext) => void;
    afterMount?: () => void;
    beforeUnmount?: () => void;
    destroy?: () => void;
}

export type RenderNode = {
    [RenderNodeTag]: true;
    type: string | RenderNodeType;
    metadata: any;
    retain: () => RenderNodeLifecycle;
    release: () => void;

    _lifecycle: null | RenderNodeLifecycle;
};

export function isRenderNode(obj: any): obj is RenderNode {
    return obj && obj[RenderNodeTag] === true;
}

export enum RenderNodeType {
    empty,
    text,
    foreignElement,
    calculation,
    intrinsicElement,
    array,
    component,
    context,
    lifecycleObserver,
    collection,
}

/*
 * Components
 */
type OnUnmountCallback = () => void;
type OnMountCallback = () => void;
type EffectCallback = () => void;

export type ComponentListeners = {
    onUnmount: (callback: OnUnmountCallback) => void;
    onMount: (callback: OnMountCallback) => void;
    onEffect: (callback: EffectCallback, debugName?: string) => void;
    getContext: <TVal>(context: Context<TVal>) => TVal;
};

const UnusedSymbol = Symbol('unused');
export type Component<TProps extends {}> = (
    props: TProps & { [UnusedSymbol]?: boolean },
    listeners: ComponentListeners
) => JSX.Element | null;
