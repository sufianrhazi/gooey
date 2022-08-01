# Gooey

Gooey is a focused web framework designed to be predictable, fast, and flexible.


## Overview

### Setup and Configuration

Since Gooey uses JSX and is designed for TypeScript, you'll need to configure your frontend toolchain of
choice to compile things correctly.

In TypeScript, you'll want the following compilerOptions in your `tsconfig.json`:

```
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "Gooey",
    "jsxFragmentFactory": "Gooey.Fragment",
  }
}
```

For other toolchains, ensure that:
* JSX expressions are compiled to `Gooey.createElement(type, props, ...children)`
* JSX Fragments are compiled to `Gooey.Fragment`
* Optionally, you may configure the default export of `@srhazi/gooey` to be auto-imported as `Gooey`


### Definitions

Gooey has a few specific core concepts which have specific meaning:

* **calculation**: a special function that takes no arguments and returns a value. When actively used by Gooey
  or manually retained, calculations are **automatically memoized and recalculated** when necessary.
* **field**: a single value that can act as a dependency for calculations.
* **model**: an object that behaves like a plain old JavaScript object, except all property access reads are
  treated as dependencies when accessed within the body of a calculation.
* **collection**: an object that behaves like a plain old JavaScript array, except all item access reads are
  treated as dependencies when accessed within the body of a calculation.
* **view**: an object that behaves like a read-only JavaScript array, except all item access reads are
  treated as dependencies when accessed within the body of a calculation.
* **render node**: the result of evaluating a JSX expression.
* **props**: the property names and values passed to a JSX element.
* **component**: a function that takes **props** and a set of lifecycle handlers as arguments and returns a
  JSX expression.

More on how these can be used in practice later.


### JSX

Like React and other frameworks, Gooey uses [JSX](https://facebook.github.io/jsx/) to render HTML.

JSX elements that start with lowercase letters are **intrinsic elements**. JSX elements that start with
uppercase letters are **component functions**, more on that in the next section.

Unlike other frameworks, intrinsic elements in Gooey have prop names that match those used when writing HTML:
DOM attributes are named after their standard DOM names. There is no camel-casing or special-casing involved.
All of the following are valid JSX elements:

* `<h1 class="title">Hello, world</h1>`
* `<label for="my-input">Name:</label>`
* `<img srcset="cool1x.png, cool2x.png 2x" />`

For example, here's how we can render a standard HTML form:

```typescript
import Gooey, { mount } from '@srhazi/gooey';

mount(
    document.body,
    <fieldset>
        <legend>Example Login</legend>
        <div>
            <label for="login-username">Username: </label>
            <input type="text" id="login-username" minlength="3" />
        </div>
        <div>
            <label for="login-password">Password: </label>
            <input type="password" id="login-password" />
        </div>
        <button>Log in</button>
    </fieldset>
);
```

#### Event handling

To add event listeners to **intrinsic elements**, a few different attribute _prefixes_ can be used, depending
on the kind of event listener:
* <code>on:<u>eventname</u></code> (i.e. `on:click`, `on:focus`, etc...): binds a standard event handler to
  the DOM node. Equivalent to `element.addEventListener('eventname', handler);`
* <code>on:capture:<u>eventname</u></code> (i.e. `on:capture:click`, `on:capture:focusin`, etc...): binds a
  standard event handler to the DOM node that passes `true` as the optional `useCapture` parameter. Equivalent
  to `element.addEventListener('eventname', handler, true)`
* <code>on:passive:<u>eventname</u></code> (i.e. `on:passive:scroll`, etc...): binds a _passive_ event handler
  to the DOM node. Passive event listeners cannot call `preventDefault()` or `stopPropagation()` on the event.
  Equivalent to `element.addEventListener('eventname', handler, { passive: true })`.

**Note**: these prefixes allow us to handle both native DOM events and custom DOM events.

**Note**: for convenience, a reference to the element the event was attached to is passed as the second
parameter to event handlers, and will be correctly inferred the type of the intrinsic element.

Adding to our example, here's how we could respond to clicking on that button:

```typescript
import Gooey, { mount } from '@srhazi/gooey';

function onLogInClick() {
    alert("We can respond to events!");
}

mount(
    document.body,
    <fieldset>
        <legend>Example Login</legend>
        <div>
            <label for="login-username">Username: </label>
            <input type="text" id="login-username" minlength="3" />
        </div>
        <div>
            <label for="login-password">Password: </label>
            <input type="password" id="login-password" />
        </div>
        <button on:click={onLogInClick}>
            Log in
        </button>
    </fieldset>
);
```

#### Attribute binding

Intrinsic elements may have their attributes bound to the result of a **calculation**. The recalculation is
automatic, and occurs after any of the calculation's dependencies have changed.

**Note**: this processing of recalculations is not synchronous when a dependency changes, it occurs in the
next event cycle. 

To demonstrate, here's how we would change our example to disable the "Log In" button while the fields are
invalid:

```typescript
import Gooey, { mount, calc, model } from '@srhazi/gooey';

const state = model({
    username: '',
    password: '',
});


function onLogInClick() {
    alert(`Attempt login with username=${state.username} and password=${state.password}`);
}

mount(
    document.body,
    <fieldset>
        <legend>Example Login</legend>
        <div>
            <label for="login-username">Username: </label>
            <input
                on:input={(event, inputEl) => { state.username = inputEl.value; }}
                type="text"
                id="login-username"
                minlength="3"
            />
        </div>
        <div>
            <label for="login-password">Password: </label>
            <input
                on:input={(event, inputEl) => { state.password = inputEl.value; }}
                type="password"
                id="login-password"
            />
        </div>
        <button
            disabled={calc(() => state.username.length < 3 || state.password.length === 0)}
            on:click={onLogInClick}
        >
            Log in
        </button>
    </fieldset>
);
```

### Components

Components in JSX are functions which take two parameters: Props and Lifecycle methods. More on the lifecycle
methods later.

Component functions are called exactly once throughout the lifecycle of the component, so it is perfectly safe
to define state or perform other operations that should only be performed once within the function body.

When placed as nodes in a JSX tree, components are called with props. Unlike intrinsic elements, there are no
special props. Your components may choose to have props named `ref` or `on:click` (and may choose to forward
these props to elements the component renders), but there is no special handling of them.

Components may optionally take a `children` prop, which allows it to be passed any value as the children of
the component. If there is one child in the JSX tree, the value is passed as-is, if there are multiple
children, they are passed as an array of values.

Our example is getting big and relies on global state. Let's pull our authentication field into a component,
tidy it up a bit, so it can be reusable and have isolated state:

```typescript
import { Component, model, calc, mount } from '@srhazi/gooey';

let id = 0;

const LabeledInput: Component<{
    children: JSX.Node;
    onUpdate: (value: string) => void;
    minlength?: string;
    type?: 'text' | 'password';
}> = ({ children, onUpdate, minlength, type = 'text' }) => {
    const uniqueId = `input_${id++}`;
    return (
        <div>
            <label for={uniqueId}>{children}: </label>
            <input
                id={uniqueId}
                type={type}
                minlength={minlength}
                on:input={(event, inputEl) => onUpdate(inputEl.value)}
            />
        </div>
    );
};

type OnAuthenticationSubmit = (username: string, password: string) => void;

const AuthenticationForm: Component<{ onSubmit: OnAuthenticationSubmit }> = ({ onSubmit }) => {
    const state = model({ username: '', password: '' });

    const onSubmitClick = () => {
        onSubmit(state.username, state.password)
    };

    const calcIsInvalid = calc(() => state.username.length < 3 || state.password.length === 0);

    return (
        <fieldset>
            <legend>Example Login</legend>
            <LabelInput type="text" minlength="3" onUpdate={(val) => { state.username = val; }}>Username</LabelInput>
            <LabelInput type="password"  onUpdate={(val) => { state.password = val; }}>Password</LabelInput>
            <button disabled={calcIsInvalid} on:click={onSubmitClick}>Log in</button>
        </fieldset>
    );
};

mount(
    document.body,
    <>
        <AuthenticationForm
            onSubmit={(username, password) =>
                alert(`Submit one: ${username} + ${password}`)
            }
        />
        <AuthenticationForm
            onSubmit={(username, password) =>
                alert(`Submit two: ${username} + ${password}`)
            }
        />
    </>
);
```

### Contexts

Contexts are JSX nodes that allow their descendent components to read the value associated with them. They may
be nested, which causes the value associated with the closest context to be read.

The following example renders three lines:

1. The context is red
2. The context is green
3. The context is blue


```typescript
const Color = createContext('red');

const MyComponent: Component = (props, { getContext }) => {
    return <div>The context is {getContext(Color)}</div>
};

mount(
    document.body,
    <div>
        <MyComponent />
        <Color value="green">
            <MyComponent />
        </Color>
        <Color value="blue">
            <MyComponent />
        </Color>
    </div>
);
```


### Component Lifecycles

Component functions receive a second `ComponentLifecycle` parameter, which allows components to hook into the
lifecycle events that occur:

If a component renders child components, those child lifecycle events are called _before_ the parent lifecycle
events are called.

```
interface ComponentLifecycle {
    onMount: (callback: () => void) => (() => void) | void;
    onUnmount: (callback: () => void) => void;
    onDestroy: (callback: () => void) => void;
    getContext: <TContext>(
        context: Context<TContext>,
        handler?: (val: TContext) => void
    ) => TContext;
}
```

* `onMount`: Gets called immediately after the component is attached to the DOM. It may optionally return a
  function that gets called immediately before the component is detached from the DOM.
* `onUnmount`: Gets called immediately before the component is attached to the DOM.
* `onDestroy`: Gets called after all of the retainers release the component.
* `getContext`: Gets called **before** onMount if the corresponding context has changed.


### Intrinsic Refs

Sometimes it is necessary to get a reference to the underlying intrinsic element. Similar to React, the `ref`
attribute accepts two types of refs: callback refs and object refs.

Callback refs are called with the element reference immediately after the element is attached to the DOM and
called with `undefined` immediately before the element is detached from the DOM.

Note: Callback refs are called at the same lifecycle sequence as `onMount` callbacks. A component that passes
a ref callback to an intrinsic element it renders will have that ref callback called before its `onMount`
callbacks get called.

Object refs are convenience records, which have a `current` field which is set to the element reference while
it is attached to the DOM.

An example of this would be to draw on a canvas. Here's an example component which renders some fancy text in
a canvas text:

```typescript
import Gooey, { Component, ref } from '@srhazi/gooey';

const CanvasText: Component<{ text: string }> = ({ text }, { onMount }) => {
    const canvasRef = ref<HTMLCanvasElement>();
    onMount(() => {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return
        ctx.font = "50px serif";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#FF00FF";
        ctx.fillStyle = "#FFDDFF";
        ctx.font = "50px serif";
        ctx.strokeText(text, 10, 75, 480);
        ctx.fillText(text, 10, 75, 480);
    });
    return <canvas ref={canvasRef} width="500" height="100" />;
};

mount(document.body, <CanvasText text="Hello, World!" />);
```



### Component Retaining

Unlike most JSX-based UI frameworks, JSX trees can be moved around in the DOM and can be disconnected and
reconnected without destroying and recreating the underlying DOM elements.

JSX expressions evaluate to the `RenderNode` type, which has a well-defined interface. `RenderNode` values may
be `.retain()`ed, which indicates that you are taking responsibility for the lifecycle of the JSX node and
promise to call `.release()` when the JSX node is no longer used. Only when a JSX node is unmounted and all
its retain calls are released does the RenderNode destroy its created elements / state.

This means it's possible for a component to be rendered once; mounted, unmounted, and remounted in different
locations within the DOM multiple times; and then ultimately unmounted and destroyed when it is no longer
used.

To tap into these events, component functions receive a second `ComponentLifecycle` parameter, which allows
for hooking into the specific lifecycle events that occur:

```
interface ComponentLifecycle {
    onMount: (callback: () => void) => (() => void) | void;
    onUnmount: (callback: () => void) => void;
    onDestroy: (callback: () => void) => void;
    getContext: <TContext>(
        context: Context<TContext>,
        handler?: (val: TContext) => void
    ) => TContext;
}
```

* `onMount`: Gets called immediately after the component is attached to the DOM. It may optionally return a
  function that gets called immediately before the component is detached from the DOM.
* `onUnmount`: Gets called immediately before the component is attached to the DOM.
* `onDestroy`: Gets called after all of the retainers release the component.
* `getContext`: Gets called **before** `onMount` if the corresponding context has changed.

Visually, this means that the component lifecycle looks like this:

```
                component                  onMount
    +-------+  func called  +----------+  is called   +----------+
    | inert | ------------> | detached | -----------> | attached |
    +-------+               +----------+  getContext  +----------+
        ^                      |    ^  called if changed    |
        |                      |    |                       |
        +----------------------+    +-----------------------+
               onDestroy                    onUnmount
               is called                    is called
```

The standard lifecycle sequence for a component that mounts, does not move, and unmounts is:

1. The component function is called 
2. The `getContext` callbacks are called
3. The `onMount` callbacks are called
4. The `onUnmount` callbacks are called
5. The `onDestroy` callbacks are called

The standard mount lifecycle sequence for a component that mounts is:

1. The component function is called 
2. The `getContext` callbacks are called
3. The `onMount` callbacks are called

If a mounted component is relocated, the lifecycle sequence is:

1. The `onUnmount` callbacks are called
2. The `getContext` callbacks are optionally called, if the contexts have changed
3. The `onMount` callbacks are called


### Component children

Sometimes it's desirable for a component to accept children, so it can place that children somewhere in its
area of concern.

Children aren't necessarily limited to JSX nodes, it's possible for a child to be an object or a function, or
any value at all.

Components may specify in their type signature the number and kind of children that they accept. Due to
historical reasons, these are a bit awkward, so for reference here are the recommended variations:

```typescript
import Gooey, { Component } from '@srhazi/gooey';

// JSX.Node is the type of an arbitrary node of renderable JSX (string types are assignable to JSX.Node)
// JSX.Element is the type of an node of an intrinsic element, component, or other special built-in component.

// If the `children` prop is not specified, it is a type error to pass children to this component
const AcceptsNoChildren: Component<{ name: string }> = ({ name }) => (/* ... */);

// It will be a type error to pass more than one child to this component
const AcceptsOptionallyOneChild: Component<{ children?: JSX.Node }> = ({ children }) => (/* ... */);

// It will be a type error to pass zero or 2+ children to this component
const AcceptsExactlyOneChild: Component<{ children: JSX.Node }> = ({ children }) => (/* ... */);

// It will be a type error to pass zero or 2+ children to this component
const AcceptsMoreThanOneChild: Component<{ children: JSX.Node | JSX.Node[] }> = ({ children }) => (/* ... */);
```

**Note**: the quantity of children change the type of the `children` prop:
* If a single child value is passed to a component, children will be its `children` prop.
* If multiple children are passed to a component, an array of those children will be its `children` prop.

**Note**: It is not valid for an intrinsic element to be attached to two different places at the same time.
Attempts to place `children` in multiple locations in the JSX tree will cause an exception to be thrown.


### Collections and Mapped Views

It's very common to render lists of things that change over time. Collections and Collection Views allow to
build ordered lists of data that can both act as dependencies in calculations and display these lists
efficiently.

A collection is created via `collection(initialValuesArray)`, and acts just like a plain old JavaScript array.

A collection view is created via calling `coll.mapView((item) => transform(item))`, and produces a read-only
collection that is derived from the values in the collection. When the collection changes, the view is
automatically updated on the next event cycle.

Collections and views (and static arrays) are renderable as JSX, and their items are added as if they were
right next to each other in the DOM. When a mounted collection/view is updated, the DOM is automatically
updated to reflect the new items. Unmodified items are not modified or re-rendered.

**Note**: unlike other frameworks, there is no need to provide a special "key" prop to each rendered item when
rendering an array.

This is probably best demonstrated with an example, which shows how to add items to, sort, and reverse a
collection:

```typescript
import Gooey, { ref, collection } from '@srhazi/gooey';
const items = collection<string>(['this', 'is', 'an', 'example']);
const inputRef = ref<HTMLInputElement>();

const onAddClick = () => {
    if (inputRef.current) {
        items.push(inputRef.current.value);
        inputRef.current.value = '';
    }
}

const onSortClick = () => items.sort();
const onReverseClick = () => items.reverse();

mount(
    document.body,
    <div>
        <label>
            Add Item:
            <input ref={inputRef} type="text" />
        </label>
        <div>
            <button on:click={onAddClick}>Add</button>
            <button on:click={onSortClick}>Sort items</button>
            <button on:click={onReverseClick}>Reverse items</button>
        </div>
        <div>
            The third item is:{' '}
            {calc(() => (items.length > 2 ? items[2] : '<<out of range>>'))}
        </div>
        <div>All Items:</div>
        <ol>
            {items.mapView((item) => (
                <li>{item}</li>
            ))}
        </ol>
    </div>
);
```


### A note on the examples

If you're familiar with React or other libraries, you may have a gut reaction of "that can't be good for
performance" for how we did things like pass functions as attributes or avoid using any sort of "key" prop
when rendering collections/arrays.

None of these reactions are accurate: Gooey does not use a virtual DOM, component functions are rendered
exactly once, and the overall API is designed for the simple thing to also be fast.

For more details, please read the design document.


## API

### Logging

#### `type LogLevel`

```typescript
type LogLevel = "error" | "warn" | "info" | "debug"
```

Set log levels for internal logging:
* `"error"` (default) -- only log errors
* `"warn"` -- log warnings and errors
* `"info"` -- log information messages, warnings, and errors
* `"debug"` -- log excessive debug information, informational messages, warnings, and errors


#### `getLogLevel()`

```typescript
function getLogLevel(): LogLevel
```

Retrieve the current log level.


#### `setLogLevel()`

```typescript
function setLogLevel(logLevel: LogLevel): void
```

Set the current log level.

### Data layer

#### Calculations

Calculations act like and can be called as if they were ordinary JavaScript functions.

When actively used (manually retained, present within mounted JSX, has onRecalc subscribers, or is an active
dependency), calculations are memoized which automatically track their dependencies and are recalculated when
their dependencies change.

Think of calculations as a kind of formula in a spreadsheet cell, which will get automatically updated when
the things it depends on are updated.

* When placed as a JSX node, Calculations render to their result and are re-rendered automatically.
* When placed as a JSX prop on an intrinsic element, Calculations are used to set the element's prop value and
  are re-updated automatically.
* When used outside of JSX, calculations are inert and behave like normal functions unless they are
  `retain()`ed, which causes them to become memoized and automatically updated. When all retainers have been
  `release()`d, the calculation becomes inert again.


```typescript
interface Calculation<T> {
    (): T;
    onError: (handler: (errorType: CalculationErrorType) => T) => this;
    setCmp: (eq: (a: T, b: T) => boolean) => this;
    onRecalc: (handler: CalcSubscriptionHandler<T>) => CalcUnsubscribe<T>;
}
```

##### `calc(fn)`

```typescript
function calc<T>(fn: () => T, debugName?: string | undefined): Calculation<T>
```

Create a calculation.

##### `Calculation<T>.onError(handler)`

```typescript
enum CalculationErrorType {
    CYCLE,
    EXCEPTION,
}

interface Calculation<T> {
    onError: (handler: (errorType: CalculationErrorType) => T) => this;
}
```

Set the error handler for a calculation. When an active calculation encounters an error, the error handler is
invoked and can return a value, which is used as the result of the calculation.

There are two kinds of errors that can occur:
* `CalculationErrorType.CYCLE`: The calculation is identified as being part of a cycle (it has a
  self-dependency, or depends on a value that depends on itself)
* `CalculationErrorType.EXCEPTION`: An uncaught exception has been thrown when calling the calculation's
  function

A calculation with an error will be recalculated (and its error handler called if present and an error occurs
in recalculation) if any of its dependencies have changed.


##### `Calculation<T>.setCmp(eq)`

```typescript
interface Calculation<T> {
    setCmp: (eq: (a: T, b: T) => boolean) => this;
}
```

Set the comparison function for a calculation. If a calculation is recalculated and its comparison function
returns true, things that depend on the calculation will not be notified that a dependency has changed.

By default, this comparison function is strict equality: `(a, b) => a === b`.


##### `Calculation<T>.onRecalc(handler)`

```typescript
type CalcSubscriptionHandler<T> = (val: T) => void;

interface CalcUnsubscribe<T> {
    (): void;
}

interface Calculation<T> {
    onRecalc: (handler: CalcSubscriptionHandler<T>) => CalcUnsubscribe<T>;
}
```

Add a subscription to the calculation. The `handler` will be called with the new result after the calculation
is recalculated. The returned value is a function which can be called to unsubscribe from the subscription.


##### `effect(fn)`

```typescript
function effect<T>(fn: () => void, debugName?: string | undefined): Calculation<void>
```

Create a special type of calculation which produces no value and is not considered a dependency of other
calculations. Avoid using this function, and consider using `.onRecalc()` instead.


#### Models

Models act like ordinary JavaScript objects.

When a model's string properties are accessed within the execution of a calculation, they act as dependencies
for that calculation.


##### `model(init)`

```typescript
function model<T extends {}>(target: T, debugName?: string | undefined): Model<T>
```

Create a model object, which is initialized from the provided `target`. Avoid mutating `target` after creating
a model.


##### `model.subscribe(targetModel, handler)`

```typescript
export enum ModelEventType {
    ADD = 'add',
    SET = 'set',
    DEL = 'del',
}

export type ModelEvent =
    | { type: ModelEventType.ADD; prop: string; value: any }
    | { type: ModelEventType.SET; prop: string; value: any }
    | { type: ModelEventType.DEL; prop: string; value?: undefined };

model.subscribe<T extends {}>(targetModel: Model<T>, handler: (event: ModelEvent[]) => void, debugName?: string | undefined): () => void
```

Subscribe to a stream of events when modifications are made to the target model. The `handler` is called
asynchronously after any model fields are modified with a list of modifications. The returned function can be
called to unsubscribe.

The kinds of modifications are:
* `ModelEventType.ADD` - a new field is added to the model
* `ModelEventType.SET` - an existing field is updated on the model
* `ModelEventType.DEL` - an existing field is deleted (via `delete myModel.field`) on the model


##### `model.keys(targetModel)`

```typescript
model.keys<T extends {}>(sourceModel: Model<T>, debugName?: string | undefined): View<string, ModelEvent>
```

Creates a read-only collection which contains the keys of a model. As keys are added to / removed from the
model, the collection is updated accordingly.


#### Collections &amp; Views

Collections act like ordinary JavaScript arrays, with a few helper methods. Views are read-only collections
that are derived from collections or models.

When a collection's or view's length or indexed properties are accessed within the execution of a calculation,
they act as dependencies for that calculation.


#### collection

```typescript
export interface Collection<T> {
    // Array-like methods:
    splice(start: number, deleteCount?: number | undefined): T[];
    splice(start: number, deleteCount: number, ...items: T[]): T[];
    push(...items: T[]): number;
    pop(): T | undefined;
    shift(): T | undefined;
    unshift(...items: T[]): number;
    sort(cmp?: ((a: T, b: T) => number) | undefined): this;
    reverse(): this;

    // Collection-specific methods 
    reject: (pred: (val: T) => boolean) => T[];
    moveSlice: (fromIndex: number, count: number, toIndex: number) => void;
    mapView: <V>(
        fn: (val: T) => V,
        debugName?: string | undefined
    ) => View<V, ArrayEvent<T>>;
    filterView: (
        fn: (val: T) => boolean,
        debugName?: string | undefined
    ) => View<T, ArrayEvent<T>>;
    flatMapView: <V>(
        fn: (val: T) => V[],
        debugName?: string | undefined
    ) => View<V, ArrayEvent<T>>;

    subscribe: (handler: (event: ArrayEvent<T>[]) => void) => () => void;
}

function collection<T>(items: T[], debugName?: string | undefined): Collection<T>
```

Create a collection initially populated with `items`. Avoid mutating `items` after creating a collection.


##### Arraylike collection methods

The following methods behave identically to those on Array.

    splice(start: number, deleteCount?: number | undefined): T[];
    splice(start: number, deleteCount: number, ...items: T[]): T[];
    push(...items: T[]): number;
    pop(): T | undefined;
    shift(): T | undefined;
    unshift(...items: T[]): number;
    sort(cmp?: ((a: T, b: T) => number) | undefined): this;
    reverse(): this;

    // Collection-specific methods 
    reject: (pred: (val: T) => boolean) => T[];
    moveSlice: (fromIndex: number, count: number, toIndex: number) => void;
    mapView: <V>(
        fn: (val: T) => V,
        debugName?: string | undefined
    ) => View<V, ArrayEvent<T>>;
    filterView: (
        fn: (val: T) => boolean,
        debugName?: string | undefined
    ) => View<T, ArrayEvent<T>>;
    flatMapView: <V>(
        fn: (val: T) => V[],
        debugName?: string | undefined
    ) => View<V, ArrayEvent<T>>;

    subscribe: (handler: (event: ArrayEvent<T>[]) => void) => () => void;

### View layer

#### The `JSX.Element` type

```
interface RenderNode {
    retain(): void;
    release(): void;
}

type JSX.Element = RenderNode
```

All JSX expressions evaluate to a `RenderNode` type, which is an abstract type that has two methods:

- `RenderNode#retain()` - 
This is the type that all JSX expressions evaluate to.


#### The `JSX.Node` type

#### `Gooey` / `createElement()` (default export)`

```
function createElement<TProps>(type: string | Component<TProps>, props: TProps, ...children: JSX.Node[]): IntrinsicRenderNode | ComponentRenderNode<TProps>
```

This is the JSX factory function. It should not be normally called manually.


LifecycleObserver
Fragment
mount
type Component
type LifecycleObserverNodeCallback
type LifecycleObserverElementCallback
type LifecycleObserverEventType
ArrayEventType
reset
subscribe
flush
retain
release
debug
debugSubscribe
type Context
createContext
InvariantError
type Ref
type RefObject
type RefCallback
ref
VERSION: string
