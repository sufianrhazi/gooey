import type { Dyn } from '../../common/dyn';
import type { Field } from '../../model/field';
import type { JSXNode } from '../jsx';
import type { getWebComponentTagConstructors, WebComponentInternalsKey, WebComponentShadowSupportedExtends } from '../webcomponents';
import type { ComponentLifecycle } from './componentrendernode';
import type { RenderNode } from './rendernode';
export type WebComponentProps<TKeys extends string, TShadowMode extends 'open' | 'closed' | undefined> = TShadowMode extends undefined ? {
    [Key in TKeys]?: Dyn<string | undefined>;
} & {
    children: JSXNode;
} : {
    [Key in TKeys]?: Dyn<string | undefined>;
};
export interface WebComponentLifecycle extends ComponentLifecycle {
    host: HTMLElement;
    shadowRoot: ShadowRoot | undefined;
    elementInternals: ElementInternals | undefined;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K], el: HTMLElement) => any, options?: boolean | AddEventListenerOptions): () => void;
    addEventListener(type: string, listener: (this: HTMLElement, ev: Event, el: HTMLElement) => any, options?: boolean | AddEventListenerOptions): void;
    bindElementInternalsAttribute: (param: WebComponentInternalsKey, value: Dyn<string | null>) => () => void;
    bindFormValue: (formValue: Dyn<FormValue>) => () => void;
    bindValidity: (validity: Dyn<Validity>) => () => void;
    checkValidity: () => void;
    reportValidity: () => void;
}
export type WebFunctionComponent<TKeys extends string, TShadowMode extends 'open' | 'closed' | undefined> = (props: WebComponentProps<TKeys, TShadowMode>, lifecycle: WebComponentLifecycle) => JSX.Element | null;
export type WebComponent<TKeys extends string, TShadowMode extends 'open' | 'closed' | undefined> = WebFunctionComponent<TKeys, TShadowMode>;
export interface WebComponentOptions<TKeys extends string, TShadowMode extends 'open' | 'closed' | undefined, TExtends extends keyof ReturnType<typeof getWebComponentTagConstructors> | undefined> {
    tagName: `${string}-${string}`;
    Component: WebComponent<TKeys, TShadowMode>;
    hydrateTemplateChild?: boolean | undefined;
    observedAttributes?: TKeys[] | undefined;
    formAssociated?: boolean | undefined;
    shadowMode?: TExtends extends WebComponentShadowSupportedExtends ? TShadowMode : undefined;
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
export type FormValue = string | File | FormData | {
    value: string | File | FormData;
    state?: string | File | FormData | undefined;
};
export declare function WebComponentRenderNode<TKeys extends string, TShadowMode extends 'open' | 'closed' | undefined, TExtends extends keyof ReturnType<typeof getWebComponentTagConstructors> | undefined>(host: HTMLElement, shadowRoot: ShadowRoot | undefined, elementInternals: ElementInternals | undefined, options: WebComponentOptions<TKeys, TShadowMode, TExtends>, childrenField: Field<Node[] | undefined>, fields: Record<TKeys, Field<string | undefined>>, debugName?: string): RenderNode;
//# sourceMappingURL=webcomponentrendernode.d.ts.map