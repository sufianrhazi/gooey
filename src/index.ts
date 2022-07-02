export { getLogLevel, setLogLevel } from './log';
export type { LogLevel } from './log';
import { createElement } from './view';
export { createElement, LifecycleObserver, Fragment, mount } from './view';
export type { Component } from './view';
export { model } from './model';
export { collection } from './collection';
export { calc, effect } from './calc';
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

export type { Ref, Collection, View, Model, Context } from './types';
export { ref, createContext, InvariantError } from './types';

export default createElement;

export const VERSION =
    typeof LIB_VERSION === 'string' ? LIB_VERSION : 'development';
