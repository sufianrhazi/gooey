import { createElement } from './createelement';

export { getLogLevel, setLogLevel } from './log';
export type { LogLevel } from './log';

export { createElement } from './createelement';
export { defineCustomElement } from './definecustomelement';
export { mount } from './mount';
export { ClassComponent } from './rendernode/componentrendernode';
export type {
    WebComponent,
    WebComponentLifecycle,
} from './rendernode/webcomponentrendernode';
export type {
    Component,
    EmptyProps,
    ComponentLifecycle,
} from './rendernode/componentrendernode';
export { IntrinsicObserverEventType } from './rendernode/intrinsicobserverrendernode';

export { Fragment } from './components/fragment';
export { IntrinsicObserver } from './components/intrinsicobserver';

export type {
    IntrinsicObserverNodeCallback,
    IntrinsicObserverElementCallback,
} from './rendernode/intrinsicobserverrendernode';
export type { Model, ModelEvent } from './model';
export { model, ModelEventType } from './model';
export type { DictEvent } from './dict';
export { dict, Dict, DictEventType } from './dict';
export type { Dyn } from './dyn';
export { dynGet, dynSet, dynSubscribe } from './dyn';
export { field } from './field';
export type { Field } from './field';
export type { Collection, View } from './collection';
export type { ArrayEvent } from './arrayevent';
export { ArrayEventType, applyArrayEvent } from './arrayevent';
export { collection } from './collection';
export { calc, CycleError } from './calc';
export type { Calculation } from './calc';
export {
    reset,
    subscribe,
    flush,
    debug,
    debugSubscribe,
    debugGetGraph,
} from './engine';
export type { CustomElements } from './jsx';

export { InvariantError } from './types';
export type { RefObjectOrCallback, Ref, RefCallback } from './ref';
export { ref } from './ref';

export default createElement;

export const VERSION =
    typeof LIB_VERSION === 'string' ? LIB_VERSION : 'development';
