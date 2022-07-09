export { getLogLevel, setLogLevel } from './log';
export type { LogLevel } from './log';
import { createElement } from './view';
export { createElement, LifecycleObserver, Fragment, mount } from './view';
export type { Component } from './rendernode';
export type { Model } from './model';
export { model } from './model';
export type { Collection, View } from './collection';
export { collection } from './collection';
export { calc, effect, CalculationErrorType } from './calc';
export type { Calculation } from './calc';
export {
    reset,
    subscribe,
    flush,
    retain,
    release,
    markRoot,
    unmarkRoot,
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
