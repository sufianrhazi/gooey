# Gooey

Gooey is a focused web framework designed to be predictable, fast, and flexible.


## Overview

### Setup and Configuration

Since Gooey uses JSX and is designed for TypeScript, you'll need to configure your frontend toolchain of
choice to compile things correctly.

In TypeScript, you'll want the following compilerOptions in your `tsconfig.json`:

```json
{
    "compilerOptions": {
        "jsx": "react",
        "jsxFactory": "Gooey",
        "jsxFragmentFactory": "Gooey.Fragment"
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
* <code>oncapture:<u>eventname</u></code> (i.e. `oncapture:click`, `oncapture:focusin`, etc...): binds a
  standard event handler to the DOM node that passes `true` as the optional `useCapture` parameter. Equivalent
  to `element.addEventListener('eventname', handler, true)`
* <code>onpassive:<u>eventname</u></code> (i.e. `onpassive:scroll`, etc...): binds a _passive_ event handler
  to the DOM node. Passive event listeners cannot call `preventDefault()` or `stopPropagation()` on the event.
  Equivalent to `element.addEventListener('eventname', handler, { passive: true })`.

**Note**: these prefixes allow us to handle both native DOM events and custom DOM events.

**Note**: for convenience, a reference to the element the event was attached to is passed as the second
parameter to event handlers, and will be correctly inferred the type of the intrinsic element.

Adding to our example, here's how we could respond to clicking on that button:

```typescript
import Gooey, { mount } from '@srhazi/gooey';

function onLogInClick() {
    alert('We can respond to events!');
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
        <button on:click={onLogInClick}>Log in</button>
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
    alert(
        `Attempt login with username=${state.username} and password=${state.password}`
    );
}

mount(
    document.body,
    <fieldset>
        <legend>Example Login</legend>
        <div>
            <label for="login-username">Username: </label>
            <input
                on:input={(event, inputEl) => {
                    state.username = inputEl.value;
                }}
                type="text"
                id="login-username"
                minlength="3"
            />
        </div>
        <div>
            <label for="login-password">Password: </label>
            <input
                on:input={(event, inputEl) => {
                    state.password = inputEl.value;
                }}
                type="password"
                id="login-password"
            />
        </div>
        <button
            disabled={calc(
                () => state.username.length < 3 || state.password.length === 0
            )}
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
import Gooey, { Component, model, calc, mount } from '@srhazi/gooey';

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

const AuthenticationForm: Component<{ onSubmit: OnAuthenticationSubmit }> = ({
    onSubmit,
}) => {
    const state = model({ username: '', password: '' });

    const onSubmitClick = () => {
        onSubmit(state.username, state.password);
    };

    const calcIsInvalid = calc(
        () => state.username.length < 3 || state.password.length === 0
    );

    return (
        <fieldset>
            <legend>Example Login</legend>
            <LabeledInput
                type="text"
                minlength="3"
                onUpdate={(val) => {
                    state.username = val;
                }}
            >
                Username
            </LabeledInput>
            <LabeledInput
                type="password"
                onUpdate={(val) => {
                    state.password = val;
                }}
            >
                Password
            </LabeledInput>
            <button disabled={calcIsInvalid} on:click={onSubmitClick}>
                Log in
            </button>
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

### Class Components

Sometimes a component grows large enough to have many functions defined in its body alongside lifecycle methods, and it
would be a bit clearer to collect these into a single class with methods.

That being said, this is entirely a matter of taste. Function components and class components have the exact same
capabilities.

Here's the above example ported to use class components.

```typescript
import Gooey, {
    Model,
    ClassComponent,
    ClassComponentContext,
    model,
    calc,
    mount,
} from '@srhazi/gooey';
let id = 0;

interface LabeledInputProps {
    children: JSX.Node;
    onUpdate: (value: string) => void;
    minlength?: string;
    type?: 'text' | 'password';
}

class LabeledInput extends ClassComponent<LabeledInputProps> {
    uniqueId: string;

    constructor(props: LabeledInputProps, context: ClassComponentContext) {
        super(props, context);
        this.uniqueId = `input_${id++}`;
    }

    render() {
        return (
            <div>
                <label for={this.uniqueId}>{this.props.children}: </label>
                <input
                    id={this.uniqueId}
                    type={this.props.type ?? 'text'}
                    minlength={this.props.minlength}
                    on:input={(event, inputEl) =>
                        this.props.onUpdate(inputEl.value)
                    }
                />
            </div>
        );
    }
}

interface AuthenticationFormProps {
    onSubmit: (username: string, password: string) => void;
}
class AuthenticationForm extends ClassComponent<AuthenticationFormProps> {
    state: Model<{ username: string; password: string }>;

    constructor(
        props: AuthenticationFormProps,
        context: ClassComponentContext
    ) {
        super(props, context);
        this.state = model({ username: '', password: '' });
    }

    onSubmitClick = () => {
        this.props.onSubmit(this.state.username, this.state.password);
    };

    onUpdateUsername = (val: string) => {
        this.state.username = val;
    };

    onUpdatePassword = (val: string) => {
        this.state.password = val;
    };

    calcIsInvalid = calc(
        () => this.state.username.length < 3 || this.state.password.length === 0
    );

    render() {
        return (
            <fieldset>
                <legend>Example Login</legend>
                <LabeledInput
                    type="text"
                    minlength="3"
                    onUpdate={this.onUpdateUsername}
                >
                    Username
                </LabeledInput>
                <LabeledInput type="password" onUpdate={this.onUpdatePassword}>
                    Password
                </LabeledInput>
                <button
                    disabled={this.calcIsInvalid}
                    on:click={this.onSubmitClick}
                >
                    Log in
                </button>
            </fieldset>
        );
    }
}

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
import Gooey, { Component, createContext, mount } from '@srhazi/gooey';

const Color = createContext('red');

const MyComponent: Component = (props, { getContext }) => {
    return <div>The context is {getContext(Color)}</div>;
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

```typescript
interface ComponentLifecycle {
    onMount: (callback: () => void) => (() => void) | void;
    onUnmount: (callback: () => void) => void;
    onDestroy: (callback: () => void) => void;
    onError: (handler: (e: Error) => JSX.Element | null) => void;
    getContext: <TContext>(
        context: Context<TContext>,
        handler?: ((val: TContext) => void) | undefined
    ) => TContext;
}
```

* `onMount`: Gets called immediately after the component is attached to the DOM. It may optionally return a
  function that gets called immediately before the component is detached from the DOM.
* `onUnmount`: Gets called immediately before the component is attached to the DOM.
* `onDestroy`: Gets called after all of the retainers release the component.
* `onError`: Gets called if any unhandled exception is thrown while rendering / rerendering children. The returned JSX
  will be rendered as the components contents.
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
import Gooey, { Component, mount, ref } from '@srhazi/gooey';

const CanvasText: Component<{ text: string }> = ({ text }, { onMount }) => {
    const canvasRef = ref<HTMLCanvasElement>();
    onMount(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.font = '50px serif';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#FF00FF';
        ctx.fillStyle = '#FFDDFF';
        ctx.font = '50px serif';
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

```typescript
interface ComponentLifecycle {
    onMount: (callback: () => void) => (() => void) | void;
    onUnmount: (callback: () => void) => void;
    onDestroy: (callback: () => void) => void;
    onError: (handler: (e: Error) => JSX.Element | null) => void;
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
* `onError`: Gets called if any unhandled exception is thrown while rendering / rerendering children. The returned JSX
  will be rendered as the components contents.
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
import Gooey, { calc, collection, mount, ref } from '@srhazi/gooey';
const items = collection<string>(['this', 'is', 'an', 'example']);
const inputRef = ref<HTMLInputElement>();

const onAddClick = () => {
    if (inputRef.current) {
        items.push(inputRef.current.value);
        inputRef.current.value = '';
    }
};

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


#### `setLogLevel(newLogLevel)`

```typescript
function setLogLevel(logLevel: LogLevel): void
```

Set the current log level.

### Data layer

#### Calculations

Calculations act like and can be called as if they were ordinary JavaScript functions.

When actively used (manually retained, present within mounted JSX, has `onRecalc()` subscribers, or is an active
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
    onError: (handler: (errorType: CalculationErrorType, error: Error) => T) => this;
    setCmp: (eq: (a: T, b: T) => boolean) => this;
    onRecalc: (handler: CalcSubscriptionHandler<T>) => CalcUnsubscribe<T>;
}
```

##### `calc(fn)`

```typescript
function calc<T>(fn: () => T, debugName?: string | undefined): Calculation<T>
```

Create a calculation. The optional `debugName` is only used for diagnostic purposes.


##### `Calculation<T>.onError(handler)`

```typescript
enum CalculationErrorType {
    CYCLE,
    EXCEPTION,
}

interface Calculation<T> {
    onError: (handler: (errorType: CalculationErrorType, error: Error) => T) => this;
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
enum CalculationErrorType {
    CYCLE,
    EXCEPTION,
}

interface CalcSubscriptionHandler<T> {
    (errorType: undefined, val: T): void;
    (errorType: CalculationErrorType, val: Error): void;
}

interface CalcUnsubscribe<T> {
    (): void;
}

interface Calculation<T> {
    onRecalc: (handler: CalcSubscriptionHandler<T>) => CalcUnsubscribe<T>;
}
```

Add a subscription to the calculation. The `handler` will be called with the new result after the calculation
is recalculated. The returned value is a function which can be called to unsubscribe from the subscription.

If the result of the recalculation is not an error, the `errorType` parameter will be undefined and `val` will be the
result of the calculation.

If the result of the recalculation is an uncaught error, the `errorType` will be set, and `val` will be the `Error`
instance.


#### Fields

Fields are values whose accesses are tracked over time.

When a field is accessed within the execution of a calculation, they act as dependencies for that calculation. When a
field is modified, it will cause any dependencies to be recalculated on the next flush.


##### `field(value)`

```typescript
type FieldSubscriber<T> = (val: T) => void;

interface Field<T> {
    get: () => T;
    set: (val: T) => void;
    subscribe: (observer: FieldSubscriber<T>) => () => void;
}

function field<T>(value: T, debugName?: string): Field<T>
```

Create a field that has an initial value. The optional `debugName` is only used for diagnostic purposes.


##### `.get()`

Read the value associated with the field.


##### `.set(newVal)`

Write to the value associated with the field.


##### `.subscribe((newVal) => {/* ... *})`

Subscribe to changes to the value associated with the field. The callback will be called during flush, so if a field is
written to multiple times prior to a flush, it will only be called once with the last value.

Returns a function which unsubscribes to changes.

Note: The callback will not be called with any field values written _before_ subscription starts, even if they occur in
the same flush.


#### Models

Models act like ordinary JavaScript objects.

When a model's string properties are accessed within the execution of a calculation, they act as dependencies
for that calculation.


##### `model(obj)`

```typescript
function model<T extends {}>(obj: T, debugName?: string | undefined): Model<T>
```

Create a model object, which is initialized from the provided `target`. Avoid mutating `target` after creating
a model. The optional `debugName` is only used for diagnostic purposes.


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
model, the collection is updated accordingly. The optional `debugName` is only used for diagnostic purposes.


#### Collections &amp; Views

Collections act like ordinary JavaScript arrays, with a few helper methods added. Views are read-only collections that
are derived from collections (via `.mapView(fn)`, `.filterView(fn)`, and `.flatMapView(fn)`) or models (via
`model.keys(modelObj)`)

When a collection's or view's length or indexed properties are accessed within the execution of a calculation, they act
as dependencies for that calculation.

Note: Collections are designed to be _mutated_ over time. Unlike other frameworks, Gooey embraces mutation. Call
`push()`, `pop()`, `splice()` or any other mutation methods as you wish!


##### Arraylike collection methods

Collections _are_ plain JavaScript arrays, with a few additional methods. This means methods that you'd normally use to
mutate an `Array` are present on a `Collection`. These include:

* `push`
* `pop`
* `shift`
* `unshift`
* `splice`
* `sort`
* `reverse`


##### `collection(items)`

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

Create a collection initially populated with `items`. Avoid mutating `items` after creating a collection. The optional
`debugName` is only used for diagnostic purposes.

Note: `mapView`, `filterView`, and `flatMapView` return `View` types, which are like read-only collections.

Note: Additional methods that live on `Array.prototype` that may not be listed in the above are present on `Collection`
objects, and will behave correctly.


##### `Collection<T>.reject(callbackFn)`

```typescript
interface Collection<T> {
    reject: (callbackFn: (val: T) => boolean) => T[];
}
```

Efficiently remove items from the collection which the passed `callbackFn` predicate function return `true`. An array of
the removed items is returned.


##### `Collection<T>.moveSlice(fromIndex, count, toIndex)`

```typescript
interface Collection<T> {
    moveSlice: (fromIndex: number, count: number, toIndex: number) => void;
}
```

Efficiently _move_ sequences of items from a starting `fromIndex` to a ending `toIndex`. `toIndex` is the destination
offset _after_ removing `count` items from `fromIndex`. Consider this function to be equivalent to:
`collection.splice(toIndex, 0, ...collection.splice(fromIndex, count))`

Note: the difference between two splice operations is that `moveSlice` does not cause mapped/filtered views to be
re-mapped/re-filtered. This means that if a collection's `mapView()` is a JSX node, `moveSlice` will cause the
underlying DOM nodes to be _relocated_ to the target location in the destination array, as opposed to being removed and
rendered anew.


##### `Collection<T>.subscribe(handler)`

```typescript
enum ArrayEventType {
    SPLICE = 'splice',
    MOVE = 'move',
    SORT = 'sort',
}

type ArrayEvent<T> =
    | {
          type: ArrayEventType.SPLICE;
          index: number;
          count: number;
          items?: T[] | undefined;
      }
    | {
          type: ArrayEventType.MOVE;
          from: number;
          count: number;
          to: number;
      }
    | {
          type: ArrayEventType.SORT;
          from: number;
          indexes: number[];
      };


interface Collection<T> {
    subscribe: (handler: (event: ArrayEvent<T>[]) => void) => () => void;
}
```

Subscribe to a stream of events when modifications are made to the target collection. The `handler` is called
asynchronously after any collection items are modified with a list of modifications. The returned function can be called
to unsubscribe.

The kinds of events are:
* `ArrayEventType.SPLICE` - a splice operation has been performed: 0 or more items are replaced by 0 or more items
* `ArrayEventType.MOVE` - a run of items is moved from an index to another index
* `ArrayEventType.SORT` - a subset of the collection was reordered with a new set of indexes; Note: even when `from` is
  greater than zero, `indexes` is zero-indexed.

For convenience, a function `applyArrayEvent` is exported, which allows you to apply an array event to a target array:

```typescript
function applyArrayEvent<T>(target: T[], event: ArrayEvent<T>): void;
```


##### `Collection<T>.mapView(mapFn)`

```typescript
interface Collection<T> {
    mapView: <V>(
        mapFn: (val: T) => V,
        debugName?: string | undefined
    ) => View<V, ArrayEvent<T>>;
}
```

Produce a read-only `View` from a collection that holds transformed items. As items are added to, removed from,
resorted, and reassigned within the target collection, the derived `View` will hold mapped versions of those items by
calling the provided `mapFn`. The optional `debugName` is only used for diagnostic purposes.

Note: Unlike `map`, `mapView`'s callback function **does not** take an index or a reference to the original array as
parameters.


##### `Collection<T>.filterView(filterFn)`

```typescript
interface Collection<T> {
    filterView: (
        filterFn: (val: T) => boolean,
        debugName?: string | undefined
    ) => View<T, ArrayEvent<T>>;
}
```

Produce a read-only `View` from a collection that holds filtered items. As items are added to, removed from, resorted,
and reassigned within the target collection, the derived `View` will hold items that pass the provided filter
`filterFn`. The optional `debugName` is only used for diagnostic purposes.


##### `Collection<T>.flatMapView(flatMapFn)`

```typescript
interface Collection<T> {
    flatMapView: <V>(
        flatMapFn: (val: T) => V[],
        debugName?: string | undefined
    ) => View<V, ArrayEvent<T>>;
}
```

Produce a read-only View from a collection that holds transformed sequences of items. As items are added to, removed
from, resorted, and reassigned within the target collection, the derived View will hold the set of items returned from
the mapping `flatMapFn`, in order. The optional `debugName` is only used for diagnostic purposes.

Fun fact: `.filterView` and `.mapView` internally do nothing but call `.flatMapView`, which is generalized.


### Rendering HTML with JSX

Gooey is a tool to create UI applications, and it is recommended (but not required) to use
[JSX](https://facebook.github.io/jsx/).

If you are unfamiliar with JSX, please read [React's documentation: Introducing
JSX](https://reactjs.org/docs/introducing-jsx.html), but do note:
* Unlike React (where you must write `className`, `htmlFor`, and other odd intrinsic element prop names), Gooey aims for
  to be written like html. `<label class="fancy-container" for="target-id"></label>` is perfectly valid in Gooey.
* **Do not** follow any of the advice in the
  [DOM Elements React documentation](https://reactjs.org/docs/dom-elements.html), as that is meant to solve problems
  only React has created.


#### Default export: `createElement(type, props, ...children)`

```typescript
interface IntrinsicRenderNode extends RenderNode { /* private internals */ }

interface ComponentRenderNode<TProps> extends RenderNode { /* private internals */ }

function createElement<TProps>(
    type: string | Component<TProps>,
    props: TProps,
    ...children: JSX.Node[]
): IntrinsicRenderNode | ComponentRenderNode<TProps>
```

This function is the factory for writing JSX. Normally, you don't need to ever call this function by name, calls are
created when JSX is compiled to JavaScript.

If a string is passed as `type`, you'll be rendering an intrinsic element: some native HTML, SVG, or MathML (where supported)
element. The provided props map to the HTML/SVG/MathML attributes, plus some special props to allow you to bind event
handlers and perform other actions.

If a function is passed as `type`, you'll be rendering component: either some special built-in component (like a
`Context` or a `IntrinsicObserver`), or a user-created component.

The type of evaluating a JSX expression (the return type of `createElement`) is `JSX.Element`, which in Gooey is called
`RenderNode`.


#### Intrinsic elements

Intrinsic element props correspond to HTML/SVG/MathML attributes.

Intrinsic elements have a set of special props that allow for more custom behavior: 

* `ref` - pass a `Ref` type, which allows code to get a reference to the underlying DOM `Element`
* `attr:*` - set an attribute; i.e. `<button attr:disabled={true} />`; equivalent to
  `el.setAttribute('disabled', true)`; this is rarely if at all needed unless you are using Web Components
* `prop:*` - set a property on the element instance; i.e. `<button attr:indeterminate={true} />`; equivalent to
  `el.indeterminate = true`; this is rarely needed unless you are using Web Components
* `on:*` - add a standard event handler; i.e. `<button on:click={handler} />`; equivalent to 
  `el.addEventListener('click', handler)`
* `oncapture:*` - add an event handlers on the capture phase; i.e. `<button oncapture:click={handler} />`; equivalent
  to `el.addEventListener('click', handler, true)`
* `onpassive:*` - add a passive event handlers, which cannot have default prevented or stop propagation; i.e.
  `<button onpassive:click={handler} />`; equivalent to `el.addEventListener('click', handler, { passive: true })

Note: In rare cases, intrinsic element props correspond to DOM Interface attributes. The only instances of this are:
* The `input` element's `indeterminate` prop, which sets the `indeterminate` property on the `HTMLInputElement` instance.
* The `select` element's `value` prop, which sets the `value` property on the `HTMLSelectElement` instance.


#### Refs

```typescript
interface Ref<T> {
    current: T | undefined;
}

function ref<T>(val?: T): Ref<T>

type RefCallback<T> = (val: T | undefined) => void;

type RefObjectOrCallback<T> = Ref<T> | RefCallback<T>;
```

Refs are values that can be passed as the special `ref` prop on intrinsic elements. Components do not have default
behavior with respect to the `ref` prop.

Ref callbacks and object values are called:
* Immediately after mounting (equivalent to the component `onMount` lifecycle) and after children are mounted
* Immediately before unmounting (equivalent to the component `onUnmount` lifecycle) and after children are unmounted


#### The `JSX.Node` type

```typescript
type JSXNode =
    | string
    | number
    | boolean
    | null
    | undefined
    | bigint
    | symbol
    | Function
    | Element
    | RenderNode
    | JSXNodeArray
    | JSXNodeCalculation
    | JSXNodeCollection
    | JSXNodeView;

interface JSXNodeCalculation extends Calculation<JSXNode> {}

interface JSXNodeCollection extends Collection<JSXNode> {}

interface JSXNodeView extends View<JSXNode, any> {}

interface JSXNodeArray extends Array<JSXNode> {}
```

The non-standard `JSX.Node` type represents the type that is valid as children of JSX.

* Static values:
  * `string` values are rendered as `Text`.
  * `number` and `bigint` values are converted to strings via `.toString()` and rendered as `Text`.
  * `boolean`, `null`, and `undefined` values do not render to anything.
  * `Function` and `symbol` types do not render to anything, but log a warning. These may only be useful as `children`
    passed to components.
  * `Element` (as in DOM `Element`) values are rendered as-is. That is to say, if a native Element is passed as a child in
    a JSX expression, that element will be rendered in the correct position.
  * `RenderNode` values are rendered as-is.
  * `Array<JSXNode>` values are rendered in place, concatenated together.
* Dynamic, bound values:
  * `Calculation<JSXNode>` values are rendered as the result of the calculation. When the calculation's dependencies have
    changed, it is re-rendered and replaces the prior result. This is how dynamic JSX subtrees are created.
  * `Collection<JSXNode>` and `View<JSXNode>` values are rendered as the contents of the collection. When items are added
    to, removed from, replaced within, or reordered within the collection, the ordering is reflected in the DOM.


#### `mount(target, jsx)`

```typescript
function mount(target: Element, jsx: RenderNode): () => void
```

Mount and render a JSX `node` to a `target` DOM element. Returns a function that unmounts the `node`.

Note: It is recommended, but not necessary for the `target` DOM element to be empty. Rendering will be performed at the
end of the existing children. Behavior is undefined if the set of `target`'s child nodes are changed outside of Gooey's
knowledge while JSX is mounted.

Note: Mounting is cheap. Do not hesitate to mount to multiple areas of the DOM (i.e. it's perfectly safe to mount to
document.head to add additional nodes in the document head, or mount to the title element to provide a dynamic title.).


#### Components: `Component<Props>`

```typescript
interface ComponentLifecycle {
    onMount: (callback: () => void) => (() => void) | void;
    onUnmount: (callback: () => void) => void;
    onDestroy: (callback: () => void) => void;
    onError: (handler: (e: Error) => JSX.Element | null) => void;
    getContext: <TContext>(
        context: Context<TContext>,
        handler?: (val: TContext) => void
    ) => TContext;
}

type Component<TProps = {}> = (props: TProps, lifecycle: ComponentLifecycle) => JSX.Element | null;
```

Components are functions which start with a capital letter and are given two parameters:
* `props`, an object holding the JSX props passed to the component, including optionally a `children` prop, which
  represents child JSX nodes
* `lifecycle`, an object which holds the lifecycle methods able to be used by a component

Note: the type of the `children` prop depends on how the JSX is passed. If there is one child in the JSX tree, the value
is passed as-is, if there are multiple children, they are passed as an array of values.

The lifecycle methods are:
* `onMount`: Gets called immediately after the component is attached to the DOM. It may optionally return a function
  that gets called immediately before the component is detached from the DOM.
* `onUnmount`: Gets called immediately before the component is attached to the DOM.
* `onDestroy`: Gets called after all of the retainers release the component.
* `onError`: Gets called if an uncaught exception is thrown while rendering this component or any of its children
  (unless caught). If provided, the `handler` "catches" the exception and returns JSX which will replace the component's
  JSX.
* `getContext`: Reads a value from the provided context. The optional callback is called **before** `onMount` and can be
  used to observe context changes when a component is relocated.


#### `Fragment` (`<>...</>`)

```typescript
const Fragment: Component<{ children?: JSX.Node | JSX.Node[] }>
```

The `Fragment` component (also found on the `createElement` property of the default export) is a built-in component
which allows you to express multiple pieces of JSX side-by-side.

It can be used to express grouped JSX, often using the `<>{contents}</>` syntax:

```typescript
const Definition: Component<{ term: JSX.Node; children: JSX.Node }> = ({ term, children }) => (
    <>
        <dt>{term}</dt>
        <dd>{children}</dd>
    </>
);

mount(
    document.body,
    <dl>
        <Definition term="Gooey">a focused web framework designed to be predictable, fast, and flexible</Definition>
        <Definition term="React">A JavaScript library for building user interfaces</Definition>
        <Definition term="SolidJS">Simple and performant reactivity for building user interfaces</Definition>
        <Definition term="Vue.js">An approachable, performant and versatile framework for building web user interfaces</Definition>
        <Definition term="Svelte">a radical new approach to building user interfaces</Definition>
    </dl>
);
```


#### `RenderNode.retain()` and `RenderNode.release()`

```typescript
interface RenderNode {
    retain(): void;
    release(): void;
}
```

Normally when JSX is rendered, the underlying DOM elements and values allocated by component functions are created from
scratch when mounted, and destroyed when unmounted.

If you wish to allow a piece of JSX to survive after being unmounted, so it may be remounted again without recreating
the underlying DOM elements or re-executing the component function, you may call `.retain()` to increment the reference
count. Calling `.release()` will decrement the reference count. When an unmounted component no longer has any
references, it is destroyed.

It is an error to attempt to mount a piece of JSX multiple times simultaneously.


#### Contexts: `createContext`

```typescript
interface Context<T> extends Component<{ value: T; children?: JSX.Node | JSX.Node[] }> { /* private internals */ }

function createContext<T>(val: T): Context<T>
```

A `Context` is a JSX node that allows child JSX to access a corresponding value. `Component` functions can read contexts
with the `getContext()` lifecycle handler.

The closest ancestor context is the one which provides the value. If there is no ancestor, the default value (provided
upon creation) is used.

The optional callback provided to `getContext()` gets called _prior_ to mounting (prior to the `onMount` component
lifecycle event event).


#### `IntrinsicObserver`

```typescript
export enum IntrinsicObserverEventType {
    MOUNT = 'mount',
    UNMOUNT = 'unmount',
}

export type IntrinsicObserverNodeCallback = (
    node: Node,
    event: IntrinsicObserverEventType
) => void;

export type IntrinsicObserverElementCallback = (
    element: Element,
    event: IntrinsicObserverEventType
) => void;

const IntrinsicObserver: Component<{
    nodeCallback?: IntrinsicObserverNodeCallback | undefined;
    elementCallback?: IntrinsicObserverElementCallback | undefined;
    children?: JSX.Node | JSX.Node[];
}>
```

`IntrinsicObserver` is a special built-in component which allows callers to observe the child DOM elements as they are
added and removed as a result of rendering child JSX.

This in particular allows components to observe child DOM elements without knowing any information about the
component/JSX that is passed as the `children` prop.

There are two `event` values passed to each callback:
* `IntrinsicObserverEventType.MOUNT` - called immediately after a child Element/Node has been mounted to the DOM
* `IntrinsicObserverEventType.UNMOUNT` - called immediately before a child Element/Node has been unmounted from the DOM

The two different callbacks allow for different levels of specificity:
* `nodeCallback` is called with all `Node` subtypes (`Text`, `Element`, `CData`, etc...)
* `elementCallback` is called with only `Element` subtypes

Note: If `IntrinsicObserver` is used on a detached/attached RenderNode, it may be mounted / unmounted with children. In
this case, the `nodeCallback` / `elementCallback` callbacks will be called at the corresponding mount / unmount
lifecycle.


### Recalculation Engine

Internally, Gooey contains a global dependency graph. When vertices in the graph are dirtied (by, for example, writing
to a Model's property), the global dependency graph can be processed. In processing the global dependency graph,
calculations are recalculated and subscriptions are triggered in topological order.

That is to say: if a calculation A depends on a calculation B, calculation B will be recalculated _before_ calculation
A.


#### `reset()`

```typescript
function reset(): void
```

Completely reset the internal state of Gooey. Nothing that would have occurred upon `flush()` is occurred after this is
called. This is only provided to reset state in a test context.


#### `subscribe(scheduler)`

```typescript
function subscribe(scheduler?: ((performFlush: () => void) => () => void) | undefined): void
```

Provide a custom scheduler to perform a flush of the system.

The `scheduler` function is called when Gooey determines that the global dependency graph needs to be processed. It is
provided a `performFlush` callback that processes the global dependency graph when called. The `scheduler` function
should return a function that prevents it from calling `performFlush` in the future.

By passing `undefined` as the scheduler, automatic processing is disabled and the global dependency graph is not
automatically processed.

The default scheduler schedules processing at the end of the event loop via
[queueMicrotask](https://developer.mozilla.org/en-US/docs/Web/API/queueMicrotask) (if possible, if not via
`setTimeout(performFlush, 0)`.


#### `flush()`

```typescript
function flush(): void
```

Manually trigger processing of the global dependency graph.

An example of how this is useful is in an event handler to synchronously update UI prior to leaving the event handler
(so that you may transition focus to an element that is revealed via state change).

Note: if called while processing the global dependency graph (i.e. within a calculation body while recalculating), the
function call does nothing and is a no-op.


#### `debug()` and `debugSubscribe()`

```typescript
function debug(activeVertex?: Processable | undefined, label?: string | undefined): string
```

Return a [graphviz](https://graphviz.org/) representation of the global dependency graph.


```typescript
function debugSubscribe(fn: (label: string, graphviz: string) => void): () => void
```

Subscribe to a stream of [graphviz](https://graphviz.org/) representations of the global dependency graph. Returns a
function to unsubscribe from the stream.

Note: this function can produce a tremendous amount of information. It is meant to be used while diagnosing small,
isolated reproducible cases.
