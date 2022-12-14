export { getLogLevel, setLogLevel } from './log';
export type { LogLevel } from './log';
import { createElement } from './view';
export { createElement, IntrinsicObserver, Fragment, mount } from './view';
export type {
    Component,
    EmptyProps,
    ComponentLifecycle,
    IntrinsicObserverNodeCallback,
    IntrinsicObserverElementCallback,
} from './rendernode';
export { ClassComponent, IntrinsicObserverEventType } from './rendernode';
export type { Model, ModelEvent } from './model';
export { model, ModelEventType } from './model';
export { field } from './field';
export type { Field } from './field';
export type { Collection, View } from './collection';
export type { ArrayEvent } from './arrayevent';
export { ArrayEventType, applyArrayEvent } from './arrayevent';
export { collection } from './collection';
export { calc, CalculationErrorType } from './calc';
export type { Calculation } from './calc';
export { reset, subscribe, flush, debug, debugSubscribe } from './engine';

export { InvariantError } from './types';
export type { RefObjectOrCallback, Ref, RefCallback } from './ref';
export { ref } from './ref';

export default createElement;

export const VERSION =
    typeof LIB_VERSION === 'string' ? LIB_VERSION : 'development';
