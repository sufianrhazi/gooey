export { getLogLevel, setLogLevel } from './log';
export type { LogLevel } from './log';
import { createElement } from './view';
export { createElement, AttachmentObserver, Fragment, mount } from './view';
export type {
    Component,
    AttachmentObserverNodeCallback,
    AttachmentObserverElementCallback,
    AttachmentObserverEventType,
} from './rendernode';
export type { Model, ModelEvent } from './model';
export { model, ModelEventType } from './model';
export type { Collection, View } from './collection';
export type { ArrayEvent } from './arrayevent';
export { ArrayEventType } from './arrayevent';
export { collection } from './collection';
export { calc, effect, CalculationErrorType } from './calc';
export type { Calculation } from './calc';
export {
    reset,
    subscribe,
    flush,
    retain,
    release,
    debug,
    debugSubscribe,
} from './engine';

export type { Context } from './rendernode';
export { createContext } from './rendernode';
export { InvariantError } from './types';
export type { Ref, RefObject, RefCallback } from './ref';
export { ref } from './ref';

export default createElement;

export const VERSION =
    typeof LIB_VERSION === 'string' ? LIB_VERSION : 'development';
