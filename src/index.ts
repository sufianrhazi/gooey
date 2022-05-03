export { getLogLevel, setLogLevel } from './log';
export type { LogLevel } from './log';
import { createElement } from './view';
export { LifecycleObserver, Fragment, mount } from './view';
export type { Component } from './jsx';
export { model } from './model';
export { collection } from './collection';
export {
    calc,
    effect,
    reset,
    subscribe,
    flush,
    nextFlush,
    retain,
    release,
    debug,
    debugState,
    debugSubscribe,
} from './calc';

export type {
    Ref,
    Calculation,
    Collection,
    View,
    Model,
    Context,
} from './types';
export { ref, createContext, InvariantError } from './types';

export default createElement;

export const VERSION =
    typeof LIB_VERSION === 'string' ? LIB_VERSION : 'development';
