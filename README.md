Gooey is a tool to ~re~build user interfaces and applications.


Motivation
----------

Gooey embraces mutation: when things change, it knows exactly what needs to be updated and updates things in place.

It's inspired by build systems (specifically by [tup](http://gittup.org/tup/)), which need to understand how to rebuild
files when dependent files change.


Concepts
--------

There are four main concepts in Gooey:
1. A **model** is an ordinary JavaScript object that is watched for changes.
2. A **collection** is an ordinary JavaScript array that is watched for changes. It additionally has a few extra
   functions for convenience.
3. A **calculation** is a function which takes no arguments and returns a value.
4. A **component** is a function which takes props and returns JSX.

For example, here is a simple counter application:

```typescript
import Gooey, { model, calc, mount, subscribe, flush } from 'gooey';

const Counter = () => {
  const state = model({ count: 0 });

  const onIncrement = () => {
    state.count += 1;
  };

  return (
    <div>
      <p>Counter: {calc(() => state.count)}</p>
      <button on:click={onIncrement}>
        Increment
      </button>
    </div>
  );
};

mount(document.body, <Counter />);
```

API
---

Many functions take an optional `debugName` parameter. This parameter gives the returned object a name that is used for
diagnostic logging and other debugging purposes.


## Calculations

### calc(fn)

```typescript
type EqualityFunc<T> = (a: T, b: T) => boolean

interface Calculation<Ret> {
  (): Ret;
  dispose(): void;
  onError(errorHandler: (errorType: 'cycle' | 'error') => Ret): void;
}

function calc<Ret>(func: () => Ret, isEqual: EqualityFunc<Ret>, debugName: string): Calculation<Ret>
function calc<Ret>(func: () => Ret, isEqual: EqualityFunc<Ret>): Calculation<Ret>
function calc<Ret>(func: () => Ret, debugName: string): Calculation<Ret>
function calc<Ret>(func: () => Ret): Calculation<Ret>
```

The `calc` function produces a `Calculation` function, which is a type of function which keeps track of dependencies
read during its execution. Dependencies are all fields on `Model` types, all items within a `View` or `Collection`, or
any other non-effect `Calculation`. If any of these dependencies change, the calculation is re-executed (on the next
`flush`).

When used within JSX, calculations are automatically re-rendered when their dependencies change. Calculations may be
passed directly as JSX nodes, or as props to native elements. No special behavior is performed when passed as props to
Components. 

The `isEqual` function may be passed as an optimization. If a calculation's `isEqual` function returns `true`,
calculations which are dependent on this calculation will reuse the prior calculated value, and not need to be
recalculated. This parameter should only be used as an optimization.

For example, here is a counter component that uses calc:

```typescript
const Counter = () => {
    const state = model({
        count: 0,
    });
    const onIncrement = () => {
        state.count += 1;
    };
    const isOver10 = calc(() => state.count > 10);
    return (
        <div>
            <p>Current count: {calc(() => state.count)}</p>
            {calc(() => isOver10() && <p>That's enough!</p>)}
            <button disabled={isOver10} on:click={onIncrement}>
                +1
            </button>
        </div>
    );
};
```

Note: the returned `calc` must be called before it may be re-executed. This is handled by default when a calculation is
placed in JSX.

Note: if used outside of jsx, calculations must be manually `retain()`ed and `release()`d, otherwise they will not be
recalculated.

#### Disposal

When a calculation is no longer needed, it may be disposed by calling the `.dispose()` method. Disposed calculations
will not be recalculated and if manually called, an exception will be raised.

Note: Calls to `calc()` that are synchronously executed within the body of a component function (or created via
`onEffect()`) should not be disposed: these will automatically be disposed when the component unmounts.


#### Handling errors

If a calculation throws an error or is in a cycle, it may be "caught" using the `.onError(errorHandler)` function. In
this error state, the return value of the `errorHandler` will be returned by the calculation. `errorHandler` will be
called with either `'cycle'` or `'error'`, depending on the kind of error.

Recalculations of nodes caused by changes in their dependencies may cause errors to be recovered and cycles to be
broken.


### effect(fn)

```typescript
function effect(func: () => void, debugName?: string | undefined): Calculation<void>
```

The `effect` function produces a `Calculation` that does not return any values, and does not behave as a dependency.
Like `calc`, it will be re-executed if any of its dependencies change. Effects can be used to respond to changes in
dependencies.

Note: effects must be called once before they are re-executed. They must be manually `retain`ed and `release`


## Data

### model(init, debugName)

```typescript
function model<T>(init: T, debugName?: string): Model<T>
```

The `model` function produces `Model` types, which act just like normal JavaScript objects.


### model.dispose(target)

```typescript
(method) model.dispose(target: Model<any>): void
```

The `model.dispose` function disposes of the model. Disposed models are inert and able to be garbage collected. Disposed
model's should not be accessed or manipulated in any way.


### model.keys(target)

```typescript
(method) model.keys<T>(target: Model<T>): View<string>
```

The `model.keys` function produces a `View` holding the keys of the model. The returned `View` is a collection which
holds keys in the provided model. This view is automatically updated as keys in the model are added (via assignment) or
removed (via `delete`).


### collection(items)

```typescript
function collection<T>(array: T[], debugName?: string): Collection<T>
```

The `collection` function produces `Collection` types, which act just like normal JavaScript arrays, with some
additional methods.


### collection.dispose(target)

```typescript
(method) collection.dispose(target: Collection<any>): void
```

The `collection.dispose` function disposes of the collection. Disposed collections are inert and able to be garbage
collected. Disposed collection's should not be accessed or manipulated in any way.


#### .reject(shouldReject)

```typescript
(method) Collection<T>.reject(shouldReject: (item: T, index: number) => boolean): T[]`
```

The `reject` method mutates the collection to remove all items which pass the provided `shouldReject` predicate test.
The returned array contains the items removed.

Note: the order of items in the returned array does not necessarily match the order of the items as they were in the
array.


#### .mapView(mapFn, debugName)

```typescript
type MappingFunction<T, V> = (item: T) => V

(method) Collection<T>.mapView<V>(mapFn: MappingFunction<T, V>, debugName?: string): View<V>
```

The `mapView` method produces a `View` holding transformed items from the collection. This view is automatically and
efficiently updated as items in the collection are added (via `push`, `unshift`, `splice`), removed (via `pop`, `shift`,
`splice`, `reject`), items reassigned, or mutated via any other means.

Note: the automatic update is **not** extended to data read while the `mapFn` method is performed. `mapFn` gets called
once per item, when the item is added to the collection. 


#### .flatMapView

```typescript
type MappingFunction<T, V> = (item: T) => V

(method) Collection<T>.flatMapView<V>(flatMapFn: MappingFunction<T, V[]>, debugName?: string | undefined): View<V>
```

The `flatMapView` method produces a `View` holding transformed items from the collection. This view is automatically and
efficiently updated as items in the collection are added (via `push`, `unshift`, `splice`), removed (via `pop`, `shift`,
`splice`, `reject`), items reassigned, or mutated via any other means.

Note: the automatic update is **not** extended to data read while the `flatMapFn` method is performed. `flatMapFn` gets
called once per item, when the item is added to the collection. 


#### .filterView

```typescript
type FilterFuction<T> = (item: T) => boolean

(method) Collection<T>.filterView(filterFn: FilterFunction<T>, debugName?: string | undefined): View<T>
```

The `filterView` method produces a `View` holding filtered items from the collection. The provided `filterFn` determines
if the item will exist in the retured view.

This view is automatically updated as items in the collection are added (via `push`, `unshift`, `splice`), removed (via
`pop`, `shift`, `splice`, `reject`), items reassigned, or mutated via any other means.

Note: the automatic update is **not** extended to data read while the `filterView` method is performed. `filterFn` gets
called once per item, when the item is added to the collection. 


#### .moveSlice

```typescript
(method) Collection<T>.moveSlice(fromIndex: number, fromCount: number, toIndex: number): void
```

The `moveSlice` method allows for moving portions of an array to other indexes. When mounted collections of JSX produced
by `mapView` is moved, the corresponding DOM nodes are moved *without* any unmounting/mounting or rerendering.


### View types

`Collection`'s `.mapView`, `.filterView`, and `.flatMapView` functions produce `Collection` types, which act just like
read-only JavaScript arrays.

These views have the same `.mapView`, `.filterView`, and `.flatMapView` functions that exist on `Collection` types.


## DOM

### mount(target, jsx)

```typescript
function mount(target: Element, jsx: JSXNode): () => void
```

The `mount` function mounts the provided `jsx` at the provided `target` DOM node. It returns a function which unmounts
the provided `jsx`.


### ref()

```typescript
type Ref<T> = { current: T | undefined };
function ref<T>(val?: T): Ref<T>;
```

The `ref` function produces ref objects which can be passed to native JSX elements. When mounted, the ref's `current`
property is set to the reference of the native HTML element.

Example:

```typescript
const CanvasText: Component<{ text: string }> = ({ text }, { onMount }) => {
  const canvasRef = ref<HTMLCanvasElement>();
  onMount(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.font = "50px serif";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#FF0000";
    ctx.fillStyle = "#FFDDDD";
    ctx.font = "50px serif";
    ctx.strokeText(text, 10, 75, 480);
    ctx.fillText(text, 10, 75, 480);
  });
  return <canvas ref={canvasRef} width="500" height="100" />;
};

mount(document.body, <CanvasText text="Hello, World!" />);
```


## Components

### The Component type

```typescript
type PropsWithChildren<Props> = Props & { children?: JSXNode[] };

type ComponentListeners = {
    onUnmount: (callback: OnUnmountCallback) => void;
    onMount: (callback: OnMountCallback) => void;
    onEffect: (callback: EffectCallback) => void;
    getContext: <ContextValue>(context: Context<ContextValue>) => ContextValue;
};

type Component<Props extends {}> = (
    props: PropsWithChildren<Props>,
    listeners: ComponentListeners
) => JSXNode;
```

Components are user-defined functions which take props and lifecycle event handlers and return JSX.

Components are never re-rendered. There are two (and only two) lifecycle events to every component:

* Callback functions passed to the `onMount` function are called immediately after the component has been mounted to the DOM
* Callback functions passed to the `onUnmount` function are called immediately before the component has been mounted to the DOM

The `getContext` function allows the component to read context values. See the `createContext` section below.

The `onEffect` function allows the creation of effects which are scoped to the lifetime of the component. These effects
are guaranteed to trigger **after** mounted calculations in JSX, so it is safe to read from the component's DOM subtree
in the effect. Note: this is guaranteed for the mounted children of the component, **not** for parent subtrees.

To demonstrate the use of `onEffect`, here's a "log" component which takes a collection of log messages, and scrolls the
container so that the last log message is visible when additional log messages are added:

```typescript
const Log: Component<{ messages: Collection<string> }> = (
    { messages },
    { onEffect }
) => {
    const logRef = ref<HTMLPreElement>();
    onEffect(() => {
        if (logRef.current && messages.length > 0) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    });
    return (
        <pre class="log" ref={logRef}>
            {messages.mapView((message) => `${message}\n`)}
        </pre>
    );
};
```


## createContext()

Contexts can be used to set values that can be retrieved from child subtrees.

```
function createContext<T>(value: T): ContextProvider<T>
```

Create a new context that has a default value. The returned ContextProvider can be used to set the value of this context
for a JSX subtree.

For example:

```typescript
const ColorContext = createContext<'red' | 'blue'>('red');

const MyComponent: Component<{ message: string }> = ({ message }, { getContext }) => (
  <div style={`color: ${getContext(ColorContext) === 'red' ? '#FFDDDD' : '#DDDDFF'}`}>
    {message}
  </div>
);

mount(document.body, (
  <div>
    <ColorContext value="blue">
      <MyComponent message="This text would be blue" />
    </ColorContext>
    <MyComponent message="And this text would be red, the default" />
  </div>
));
```


## Behavior

### flush()

```typescript
function flush(): void
```

Manually trigger a recalculation of all calculations and effects that have had their dependencies changed. By default,
you will never need to call this function, it gets automatically called after a timeout.


### nextFlush()

```typescript
function flush(): Promise<void>
```

Get a promise which will resolve on the next flush (or immediately, if there is no pending flush).


### subscribe(onReadyToFlush)

```typescript
function subscribe(onReadyToFlush: () => void): void
```

By default, Gooey will call `flush` automatically once any calculation/effect dependencies have changed after a
timeout. If you wish to configure this behavior, use the `subscribe` function, which will be called once when a
`flush()` is necessary.


### debug()

```typescript
function debug(): string
```

Dump the current dependency graph in a [graphviz DOT file format](https://graphviz.org/doc/info/lang.html). The
`debugName` values passed to models, collections, calculations, and effects will be represented in this directed graph.


### debugSubscribe(observer)

```typescript
function debugSubscribe(callback: ((graphviz: string, detail: string) => void) | null): void
```

Subscribe to a stream of debug() calls as the dependency graph is being processed.


### retain(obj); release(obj);

```typescript
function retain(item: Calculation<any> | Collection<any> | View<any>): void;
function release(item: Calculation<any> | Collection<any> | View<any>): void;
```

Note: In typical use, you should not need to use these functions unless you are using `effect` or `calc` outside of
components. There is no need to ever pass a `Collection` or `View` to these methods; this is only required internally
within Gooey.

Gooey automatically stops processing items that are leaf nodes in the dependency tree: if no calculation or effect has
a dependency on an item, that item is no longer processed further.

The `retain` function adds to the reference count of `item`; the `release` function removes from the reference count of
`item`. If this reference count is non-zero, the item will be recalculated when its data dependencies change.

If you are using the exported `effect` or `calc` functions outside of calculations, you must manually `retain` and
`release` these functions, otherwise they will not be processed when their dependencies change.

Note: despite the name, `retain` and `release` have nothing to do with memory management. Please use the various
`dispose` functions to free memory.


### reset()

```typescript
function reset(): void
```

Resets the entire state (releases all retained objects, drops the dependency graph). You should never need to do this
aside from within a test.


Differences from React
----------------------

Gooey has fewer moving parts than React. There are no component classes, no component state, no hooks, and no lifecycle
events.

Component functions get called exactly once in their lifecycle: when they are to be rendered. Components do not
re-render. Instead of lifecycle events, component functions are passed a second parameter which is an object containing
a few subscription callbacks. These callbacks are:
* `onUnmount(callback: () => void)`: called immediately before all of the DOM nodes rendered by the component are
  removed from the DOM.
* `onMount(callback: () => void)`: called immediately after all of the DOM nodes rendered by the component have been
  been added to the DOM. 

Native elements behave slightly differently:
* The `className` prop is not used. Use `class` instead.
* The `style` prop is not an object, it is a `string`.

There currently is no `cloneElement` equivalent.

There is no `isValidElement` or `React.Children` equivalent.

Contexts returned by `createContext` are opaque values. There is no `MyContext.Provider` or `MyContext.Consumer`; to
read a context, a component must use its provided `getContext()` callback.

The `ref` function is equivalent to `createRef()` / `useRef()` equivalent. Refs notably only have default behavior when
placed on native JSX elements. On component functions, the `ref` property is not specially treated and may be used like
any other property. If you want something akin to `useImperativeHandle`, give your component a `ref` prop and assign the
interface to `ref.current` in either the component body or within its `onMount` handler.

The `children` component prop is an array of JSX elements. There is no difference between a `Fragment` and an array: In
fact, the definition of `Fragment` is: `({ children }) => children`.

Events are native browser events, and use [the standardized DOM event type
name](https://www.w3.org/TR/uievents/#event-types-list). For example, to listen to the `mousemove` event, pass
a `on:mousemove={onMouseMove}` prop to an element. Events are bound directly to the element which you are placing an
event handler on. This means [custom
events](https://developer.mozilla.org/en-US/docs/Web/Events/Creating_and_triggering_events) may be used safely. This
also means that `focus` and `blur` events do not bubble. If you want to pay attention to focus entering/leaving a child,
listen for [`focusin`](https://developer.mozilla.org/en-US/docs/Web/API/Element/focusin_event) and
[`focusout`](https://developer.mozilla.org/en-US/docs/Web/API/Element/focusout_event) events.
