import * as log from '../../common/log';
import { wrapError } from '../../common/util';
import type { Retainable } from '../../model/engine';
import {
    registerComponentReload,
    release,
    retain,
    unregisterComponentReload,
} from '../../model/engine';
import {
    classComponentToFunctionComponent,
    isClassComponent,
} from '../createelement';
import { renderJSXNode } from '../renderjsx';
import { RenderNodeCommitPhase } from './constants';
import type { RenderNode } from './rendernode';
import { emptyRenderNode, SingleChildRenderNode } from './rendernode';

export interface ComponentLifecycle {
    onMount: (callback: () => void) => (() => void) | void;
    onUnmount: (callback: () => void) => void;
    onDestroy: (callback: () => void) => void;
    onError: (handler: (e: Error) => JSX.Element | null) => void;
}

export type Component<TProps = {}> =
    | FunctionComponent<TProps>
    | ClassComponentConstructor<TProps>;

// NOTE: UnusedSymbolForChildrenOmission is present solely for the typechecker to not allow assignment of { children?: JSXNode | JSXNode[] } to TProps if TProps is {}
// Which allows components to flag type errors when they do not specify a `children` prop, but children are given
declare const UnusedSymbolForChildrenOmission: unique symbol;
export type EmptyProps = { [UnusedSymbolForChildrenOmission]?: boolean };

export type FunctionComponent<TProps = {}> = (
    props: TProps & EmptyProps,
    lifecycle: ComponentLifecycle
) => JSX.Element | null;

export interface ClassComponentConstructor<TProps> {
    new (props: TProps): ClassComponent<TProps>;
}

export interface ClassComponentInterface {
    render?(): JSX.Element | null;
    onMount?(): (() => void) | void;
    onUnmount?(): void;
    onDestroy?(): void;
    onError?(e: Error): JSX.Element | null;
}

export class ClassComponent<TProps = EmptyProps>
    implements ClassComponentInterface
{
    declare props: TProps;
    constructor(props: TProps) {
        this.props = props;
    }

    render?(): JSX.Element | null;
    onMount?(): (() => void) | void;
    onUnmount?(): void;
    onDestroy?(): void;
    onError?(e: Error): JSX.Element | null;
}

export function ComponentRenderNode<TProps>(
    Component: Component<TProps>,
    props: TProps | null | undefined,
    children: JSX.Node[],
    debugName?: string
): RenderNode {
    let result: undefined | Error | RenderNode;
    let onMountCallbacks: undefined | (() => (() => void) | void)[];
    let onUnmountCallbacks: undefined | (() => void)[];
    let onDestroyCallbacks: undefined | (() => void)[];
    let owned: Set<Retainable> = new Set();
    let errorHandler: undefined | ((e: Error) => JSX.Element | null);
    // Note: may be replaced live as a result of Hot Module Reloading
    let ActiveComponent = isClassComponent(Component)
        ? classComponentToFunctionComponent(Component)
        : (Component as FunctionComponent<TProps>);

    function ensureResult() {
        if (!result) {
            let callbacksAllowed = true;
            const lifecycle: ComponentLifecycle = {
                onMount: (handler: () => (() => void) | void) => {
                    log.assert(
                        callbacksAllowed,
                        'onMount must be called in component body'
                    );
                    if (!onMountCallbacks) onMountCallbacks = [];
                    onMountCallbacks.push(handler);
                },
                onUnmount: (handler: () => void) => {
                    log.assert(
                        callbacksAllowed,
                        'onUnmount must be called in component body'
                    );
                    if (!onUnmountCallbacks) onUnmountCallbacks = [];
                    onUnmountCallbacks.push(handler);
                },
                onDestroy: (handler: () => void) => {
                    log.assert(
                        callbacksAllowed,
                        'onDestroy must be called in component body'
                    );
                    if (!onDestroyCallbacks) onDestroyCallbacks = [];
                    onDestroyCallbacks.push(handler);
                },
                onError: (handler: (e: Error) => JSX.Element | null) => {
                    log.assert(
                        callbacksAllowed,
                        'onError must be called in component body'
                    );
                    log.assert(!errorHandler, 'onError called multiple times');
                    errorHandler = handler;
                },
            };

            let componentProps: any;
            if (children.length === 0) {
                componentProps = props || {};
            } else if (children.length === 1) {
                componentProps = props
                    ? { ...props, children: children[0] }
                    : { children: children[0] };
            } else {
                componentProps = props ? { ...props, children } : { children };
            }
            let jsxResult: JSX.Element | Error;
            try {
                jsxResult =
                    ActiveComponent(componentProps, lifecycle) ||
                    emptyRenderNode;
            } catch (e) {
                const error = wrapError(e, 'Unknown error rendering component');
                if (errorHandler) {
                    jsxResult = errorHandler(error) ?? emptyRenderNode;
                } else {
                    jsxResult = error;
                }
            }
            callbacksAllowed = false;
            for (const item of owned) {
                retain(item);
            }
            if (!(jsxResult instanceof Error)) {
                result = renderJSXNode(jsxResult);
            } else {
                result = jsxResult;
            }
        }
        return result;
    }

    const cleanup = () => {
        if (result && !(result instanceof Error)) {
            renderNode.disown(result);
        }
        if (onDestroyCallbacks) {
            for (const callback of onDestroyCallbacks) {
                callback();
            }
        }

        for (const item of owned) {
            release(item);
        }

        owned = new Set();
        onMountCallbacks = undefined;
        onUnmountCallbacks = undefined;
        onDestroyCallbacks = undefined;
        result = undefined;
        errorHandler = undefined;
    };

    const initialize = () => {
        const componentResult = ensureResult();
        if (componentResult instanceof Error) {
            log.warn('Unhandled exception on detached component', {
                error: componentResult,
                renderNode: renderNode,
            });
        } else {
            renderNode.own(componentResult);
        }
        return componentResult;
    };

    const replaceComponent = (newComponent: Component<TProps>) => {
        if (renderNode.isMounted() && onUnmountCallbacks) {
            for (const cb of onUnmountCallbacks) {
                cb();
            }
        }
        onUnmountCallbacks = undefined;
        renderNode.setChild(emptyRenderNode);
        cleanup();
        if (isClassComponent(newComponent)) {
            ActiveComponent = classComponentToFunctionComponent(newComponent);
        } else {
            ActiveComponent = newComponent as FunctionComponent<TProps>;
        }
        const componentResult = initialize();
        if (renderNode.isAttached()) {
            if (componentResult instanceof Error) {
                renderNode.emitError(componentResult);
            } else {
                renderNode.setChild(componentResult);
            }
        }
        if (renderNode.isMounted() && onMountCallbacks) {
            // NOTE: is this needed?
            renderNode.requestCommit(RenderNodeCommitPhase.COMMIT_MOUNT);
        }
    };

    const renderNode = new SingleChildRenderNode(
        {
            onAlive: () => {
                initialize();
                registerComponentReload(Component, replaceComponent);
            },
            onDestroy: () => {
                unregisterComponentReload(Component, replaceComponent);
                cleanup();
            },
            onAttach: (parentContext) => {
                if (result instanceof Error) {
                    parentContext.errorEmitter(result);
                } else if (result) {
                    renderNode.setChild(result);
                }
            },
            onDetach: () => {
                renderNode.setChild(emptyRenderNode);
            },
            onError: (error: Error) => {
                if (errorHandler) {
                    const handledResult = errorHandler(error);
                    result = handledResult
                        ? renderJSXNode(handledResult)
                        : emptyRenderNode;
                    renderNode.setChild(result);
                    return true;
                }
            },
            onMount: () => {
                log.assert(result, 'Invariant: missing result');
                if (result instanceof Error) {
                    return;
                }
                renderNode.requestCommit(RenderNodeCommitPhase.COMMIT_MOUNT);
            },
            onUnmount: () => {
                log.assert(result, 'Invariant: missing result');
                if (result instanceof Error) {
                    return;
                }
                if (onUnmountCallbacks) {
                    for (const callback of onUnmountCallbacks) {
                        callback();
                    }
                }
            },
            onCommit: (phase) => {
                if (
                    phase === RenderNodeCommitPhase.COMMIT_MOUNT &&
                    onMountCallbacks
                ) {
                    for (const callback of onMountCallbacks) {
                        const maybeOnUnmount = callback();
                        if (typeof maybeOnUnmount === 'function') {
                            if (!onUnmountCallbacks) {
                                onUnmountCallbacks = [];
                            }
                            const onUnmount = () => {
                                maybeOnUnmount();
                                if (onUnmountCallbacks) {
                                    const index =
                                        onUnmountCallbacks.indexOf(onUnmount);
                                    if (index >= 0) {
                                        onUnmountCallbacks.splice(index, 1);
                                    }
                                }
                            };
                            onUnmountCallbacks.push(onUnmount);
                        }
                    }
                }
            },
            clone(newProps, newChildren) {
                return ComponentRenderNode(
                    Component,
                    props && newProps
                        ? { ...props, ...newProps }
                        : ((newProps || props) as TProps),
                    newChildren ?? children
                );
            },
        },
        emptyRenderNode,
        debugName ?? `component(${Component.name})`
    );
    return renderNode;
}
