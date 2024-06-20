import type { Dyn } from '../dyn';
import { dynGet, dynSubscribe } from '../dyn';
import type { Retainable } from '../engine';
import { dirtyRenderNode, release, retain, trackCreates } from '../engine';
import type { Field } from '../field';
import type { JSXNode } from '../jsx';
import * as log from '../log';
import { renderJSXNode } from '../renderjsx';
import { wrapError } from '../util';
import type {
    WebComponentInternalsKey,
    WebComponentShadowSupportedExtends,
    webComponentTagConstructors,
} from '../webcomponents';
import type { ComponentLifecycle } from './componentrendernode';
import { RenderNodeCommitPhase } from './constants';
import { emptyRenderNode, RenderNode } from './rendernode';

export type WebComponentProps<
    TKeys extends string,
    TShadowMode extends 'open' | 'closed' | undefined,
> = TShadowMode extends undefined
    ? { [Key in TKeys]?: Dyn<string | undefined> } & { children: JSXNode }
    : { [Key in TKeys]?: Dyn<string | undefined> };

export interface WebComponentLifecycle extends ComponentLifecycle {
    host: HTMLElement;
    shadowRoot: ShadowRoot | undefined;
    elementInternals: ElementInternals | undefined;
    addEventListener<K extends keyof HTMLElementEventMap>(
        type: K,
        listener: (
            this: HTMLElement,
            ev: HTMLElementEventMap[K],
            el: HTMLElement // Added for convenience
        ) => any,
        options?: boolean | AddEventListenerOptions
    ): () => void;
    addEventListener(
        type: string,
        listener: (
            this: HTMLElement,
            ev: Event,
            el: HTMLElement // Added for convenience
        ) => any,
        options?: boolean | AddEventListenerOptions
    ): void;
    bindElementInternalsAttribute: (
        param: WebComponentInternalsKey,
        value: Dyn<string | null>
    ) => () => void;
    bindFormValue: (formValue: Dyn<FormValue>) => () => void;
    bindValidity: (validity: Dyn<Validity>) => () => void;
    checkValidity: () => void;
    reportValidity: () => void;
}

export type WebFunctionComponent<
    TKeys extends string,
    TShadowMode extends 'open' | 'closed' | undefined,
> = (
    props: WebComponentProps<TKeys, TShadowMode>,
    lifecycle: WebComponentLifecycle
) => JSX.Element | null;

export type WebComponent<
    TKeys extends string,
    TShadowMode extends 'open' | 'closed' | undefined,
> = WebFunctionComponent<TKeys, TShadowMode>;

export interface WebComponentOptions<
    TKeys extends string,
    TShadowMode extends 'open' | 'closed' | undefined,
    TExtends extends keyof typeof webComponentTagConstructors | undefined,
> {
    tagName: `${string}-${string}`;
    Component: WebComponent<TKeys, TShadowMode>;
    hydrateTemplateChild?: boolean | undefined;
    observedAttributes?: TKeys[] | undefined;
    formAssociated?: boolean | undefined;
    shadowMode?: TExtends extends WebComponentShadowSupportedExtends
        ? TShadowMode
        : undefined;
    delegatesFocus?: boolean | undefined;
    extends?: TExtends;
}

export interface Validity {
    flags: {
        valueMissing?: boolean;
        typeMismatch?: boolean;
        patternMismatch?: boolean;
        tooLong?: boolean;
        tooShort?: boolean;
        rangeUnderflow?: boolean;
        rangeOverflow?: boolean;
        stepMismatch?: boolean;
        badInput?: boolean;
        customError?: boolean;
    };
    message?: string | undefined;
    anchor?: HTMLElement | undefined;
}

export type FormValue =
    | string
    | File
    | FormData
    | {
          value: string | File | FormData;
          state?: string | File | FormData | undefined;
      };

export function WebComponentRenderNode<
    TKeys extends string,
    TShadowMode extends 'open' | 'closed' | undefined,
    TExtends extends keyof typeof webComponentTagConstructors | undefined,
>(
    host: HTMLElement,
    shadowRoot: ShadowRoot | undefined,
    elementInternals: ElementInternals | undefined,
    options: WebComponentOptions<TKeys, TShadowMode, TExtends>,
    childrenField: Field<Node[] | undefined>,
    fields: Record<TKeys, Field<string | undefined>>,
    debugName?: string
): RenderNode {
    let result: RenderNode | Error | undefined;
    let onMountCallbacks: undefined | (() => (() => void) | void)[];
    let onUnmountCallbacks: undefined | (() => void)[];
    let onDestroyCallbacks: undefined | (() => void)[];
    const owned: Set<Retainable> = new Set();
    let errorHandler: ((e: Error) => RenderNode | null) | undefined;
    let needsMount: boolean | undefined;

    function ensureResult() {
        if (!result) {
            let callbacksAllowed = true;
            const lifecycle: WebComponentLifecycle = {
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
                onError: (handler: (e: Error) => RenderNode | null) => {
                    log.assert(
                        callbacksAllowed,
                        'onError must be called in component body'
                    );
                    log.assert(!errorHandler, 'onError called multiple times');
                    errorHandler = handler;
                },
                host,
                elementInternals,
                shadowRoot,
                addEventListener: (
                    name: string,
                    handler: (
                        this: HTMLElement,
                        event: Event,
                        el: HTMLElement
                    ) => void,
                    options?: boolean | AddEventListenerOptions
                ) => {
                    const listener = (event: Event) => {
                        handler.call(host, event, host);
                    };
                    host.addEventListener(name, listener, options);
                    const unsubscribe = () => {
                        host.removeEventListener(name, listener, options);
                    };
                    if (!onDestroyCallbacks) onDestroyCallbacks = [];
                    onDestroyCallbacks.push(unsubscribe);
                    return unsubscribe;
                },
                bindElementInternalsAttribute: (param, value) => {
                    // @ts-expect-error // for some reason, ariaDescription is missing from the ARIAMixin definition. Probably need to update type dependencies
                    elementInternals[param] = dynGet(value);
                    const unsubscribe = dynSubscribe(value, (newValue) => {
                        // @ts-expect-error // for some reason, ariaDescription is missing from the ARIAMixin definition. Probably need to update type dependencies
                        elementInternals[param] = value;
                    });
                    if (!onDestroyCallbacks) onDestroyCallbacks = [];
                    onDestroyCallbacks.push(unsubscribe);
                    return unsubscribe;
                },
                bindFormValue: (formValue) => {
                    if (!elementInternals) {
                        throw new Error(
                            `ElementInternals not available on custom element ${options.tagName}`
                        );
                    }
                    const update = (formValue: FormValue) => {
                        if (
                            typeof formValue === 'string' ||
                            formValue instanceof File ||
                            formValue instanceof FormData
                        ) {
                            elementInternals?.setFormValue(formValue);
                        } else {
                            const { value, state } = formValue;
                            if (state === undefined) {
                                elementInternals?.setFormValue(value);
                            } else {
                                elementInternals?.setFormValue(value, state);
                            }
                        }
                    };
                    update(dynGet(formValue));
                    const unsubscribe = dynSubscribe(formValue, (newVal) =>
                        update(newVal)
                    );
                    if (!onDestroyCallbacks) onDestroyCallbacks = [];
                    onDestroyCallbacks.push(unsubscribe);
                    return unsubscribe;
                },
                bindValidity: (validity) => {
                    if (!elementInternals) {
                        throw new Error(
                            `ElementInternals not available on custom element ${options.tagName}`
                        );
                    }
                    const update = (validity: Validity) => {
                        const { flags, message, anchor } = validity;
                        elementInternals?.setValidity(flags, message, anchor);
                    };
                    const val = dynGet(validity);
                    update(val);
                    const unsubscribe = dynSubscribe(validity, (val) =>
                        update(val)
                    );
                    if (!onDestroyCallbacks) onDestroyCallbacks = [];
                    onDestroyCallbacks.push(unsubscribe);
                    return unsubscribe;
                },
                checkValidity: () => {
                    if (!elementInternals) {
                        throw new Error(
                            `ElementInternals not available on custom element ${options.tagName}`
                        );
                    }
                    elementInternals?.checkValidity();
                },
                reportValidity: () => {
                    if (!elementInternals) {
                        throw new Error(
                            `ElementInternals not available on custom element ${options.tagName}`
                        );
                    }
                    elementInternals?.reportValidity();
                },
            };

            const componentProps: any =
                options.shadowMode === undefined
                    ? {
                          ...fields,
                          children: renderJSXNode(childrenField),
                      }
                    : {
                          ...fields,
                      };
            const Component = options.Component;
            let jsxResult: RenderNode | Error;
            try {
                jsxResult = trackCreates(
                    owned,
                    () =>
                        Component(componentProps, lifecycle) || emptyRenderNode
                );
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

    const renderNode = new RenderNode(
        {
            onAlive: () => {
                const result = ensureResult();
                if (result instanceof Error) {
                    log.warn('Unhandled exception on detached component', {
                        error: result,
                        renderNode: renderNode,
                    });
                } else {
                    renderNode.spliceChildren(0, 1, [result]);
                }
            },
            onDestroy: () => {
                if (onDestroyCallbacks) {
                    for (const callback of onDestroyCallbacks) {
                        callback();
                    }
                }

                result = undefined;
                onMountCallbacks = undefined;
                onUnmountCallbacks = undefined;
                onDestroyCallbacks = undefined;
                errorHandler = undefined;
                needsMount = false;

                for (const item of owned) {
                    release(item);
                }
                owned.clear();
            },
            onAttach: (nodeEmitter, errorEmitter) => {
                if (result instanceof Error) {
                    errorEmitter(result);
                }
            },
            onError: (error: Error) => {
                if (errorHandler) {
                    const handledResult = errorHandler(error);
                    result = handledResult
                        ? renderJSXNode(handledResult)
                        : emptyRenderNode;
                    renderNode.spliceChildren(0, 1, [result]);
                    return true;
                }
            },
            onMount() {
                log.assert(result, 'Invariant: missing result');
                if (result instanceof Error) {
                    return;
                }
                needsMount = true;
                dirtyRenderNode(renderNode);
            },
            onUnmount() {
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
            onCommit(phase: RenderNodeCommitPhase) {
                if (
                    phase === RenderNodeCommitPhase.COMMIT_MOUNT &&
                    needsMount &&
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
                    needsMount = false;
                }
            },
            clone() {
                log.assert(
                    false,
                    "Attempted to clone a WebComponentRenderNode -- this operation doesn't make sense"
                );
            },
        },
        [emptyRenderNode],
        debugName ?? `web-component(${options.tagName})`
    );
    return renderNode;
}
