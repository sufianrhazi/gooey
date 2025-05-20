import { createElement } from './viewcontroller/createelement';

export type { ArrayEvent } from './common/arrayevent';
export { ArrayEventType, applyArrayEvent } from './common/arrayevent';
export type {
    Dyn,
    DynMut,
    Dynamic,
    DynamicMut,
    DynamicSubscriptionHandler,
    DynamicNonErrorSubscriptionHandler,
} from './common/dyn';
export {
    dyn,
    dynGet,
    dynSet,
    dynMap,
    dynSubscribe,
    isDynamic,
    isDynamicMut,
} from './common/dyn';
export type { LogLevel } from './common/log';
export { getLogLevel, setLogLevel } from './common/log';
export { InvariantError } from './common/types';

export { Fragment } from './components/fragment';
export { IntrinsicObserver } from './components/intrinsicobserver';

export { calc, CycleError } from './model/calc';
export type { Calculation } from './model/calc';
export type { Collection, View } from './model/collection';
export { collection } from './model/collection';
export type { DictEvent } from './model/dict';
export { dict, Dict, DictEventType } from './model/dict';
export type { Field } from './model/field';
export { field } from './model/field';
export {
    reset,
    subscribe,
    flush,
    debug,
    debugSubscribe,
    debugGetGraph,
    hotSwap,
} from './model/engine';
export type { Model, ModelEvent } from './model/model';
export { model, ModelEventType } from './model/model';

export { createElement } from './viewcontroller/createelement';
export { defineCustomElement } from './viewcontroller/definecustomelement';
export type { CustomElements } from './viewcontroller/jsx';
export { mount } from './viewcontroller/mount';
export type {
    RefObjectOrCallback,
    Ref,
    RefCallback,
} from './viewcontroller/ref';
export { ref } from './viewcontroller/ref';
export type {
    Component,
    EmptyProps,
    ComponentLifecycle,
} from './viewcontroller/rendernode/componentrendernode';
export { ClassComponent } from './viewcontroller/rendernode/componentrendernode';
export type {
    WebComponent,
    WebComponentLifecycle,
} from './viewcontroller/rendernode/webcomponentrendernode';
export type {
    IntrinsicObserverNodeCallback,
    IntrinsicObserverElementCallback,
} from './viewcontroller/rendernode/intrinsicobserverrendernode';
export { IntrinsicObserverEventType } from './viewcontroller/rendernode/intrinsicobserverrendernode';

export default createElement;

export const VERSION =
    typeof LIB_VERSION === 'string' ? LIB_VERSION : 'development';
