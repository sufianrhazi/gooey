import type { Retainable } from './engine';
import { release, retain } from './engine';
import type { Field } from './field';
import { field } from './field';
import * as log from './log';
import { PortalRenderNode } from './rendernode/portalrendernode';
import type { RenderNode } from './rendernode/rendernode';
import type { WebComponentOptions } from './rendernode/webcomponentrendernode';
import { WebComponentRenderNode } from './rendernode/webcomponentrendernode';
import { webComponentTagConstructors } from './webcomponents';
import { HTML_NAMESPACE } from './xmlnamespace';

export function defineCustomElement<
    TKeys extends string,
    TShadowMode extends 'open' | 'closed' | undefined = undefined,
    TExtends extends
        | keyof typeof webComponentTagConstructors
        | undefined = undefined,
>(options: WebComponentOptions<TKeys, TShadowMode, TExtends>) {
    const Superclass = options.extends
        ? webComponentTagConstructors[options.extends]
        : HTMLElement;
    class GooeyCustomElement extends Superclass implements Retainable {
        __debugName: string;
        __refcount: number;
        _originalChildren: Node[] | null;
        _unmount: (() => void) | undefined;
        _portalRenderNode: RenderNode | null;
        _renderNode: RenderNode | null;
        _childrenField: Field<Node[] | undefined>;
        _fields: Record<TKeys, Field<string | undefined>>;
        static formAssociated = options.formAssociated || false;
        static observedAttributes = options.observedAttributes ?? [];

        constructor() {
            super();
            const shadowRoot = options.shadowMode
                ? this.attachShadow({
                      delegatesFocus: options.delegatesFocus,
                      mode: options.shadowMode,
                  })
                : undefined;

            const elementInternals = options.extends
                ? undefined
                : this.attachInternals();

            this._childrenField = field<Node[] | undefined>(undefined);
            this._fields = {} as Record<TKeys, Field<string | undefined>>;
            options.observedAttributes?.forEach((attr) => {
                this._fields[attr] = field(undefined);
            });

            this._renderNode = WebComponentRenderNode(
                this,
                shadowRoot,
                elementInternals,
                options,
                this._childrenField,
                this._fields
            );
            this._portalRenderNode = PortalRenderNode(
                shadowRoot || this,
                this._renderNode,
                undefined
            );
            this._originalChildren = null;
            this.__debugName = `custom:${options.tagName}`;
            this.__refcount = 0;
        }

        __dead() {
            this._portalRenderNode?.release();
            if (this._originalChildren) {
                this.replaceChildren(...this._originalChildren);
            }
        }

        __alive() {
            if (
                options.hydrateTemplateChild !== false &&
                this.children.length === 1 &&
                this.children[0] instanceof HTMLTemplateElement
            ) {
                this._originalChildren = Array.from(this.childNodes);
                this.replaceChildren(
                    ...this._originalChildren.map((node) =>
                        node instanceof HTMLTemplateElement
                            ? node.content
                            : node
                    )
                );
            }
            let children: Node[] = [];
            if (!options.shadowMode) {
                children = Array.from(this.childNodes);
                this.replaceChildren();
                this._childrenField.set(children);
            }
            this._portalRenderNode?.retain();
            this._portalRenderNode?.attach(
                (event) => {
                    log.assert(false, 'Unexpected event from Portal', event);
                },
                (error) => {
                    log.error('Unhandled web component mount error', error);
                },
                this.namespaceURI ?? HTML_NAMESPACE
            );
        }

        retain() {
            retain(this);
        }

        release() {
            release(this);
        }

        connectedCallback() {
            this.retain();
            this._portalRenderNode?.onMount();
        }

        disconnectedCallback() {
            this._portalRenderNode?.onUnmount();
            this.release();
        }

        adoptedCallback() {
            // TODO: what should be done here?
        }

        attributeChangedCallback(
            name: string,
            oldValue: string,
            newValue: string
        ) {
            this._fields[name as TKeys].set(newValue);
        }
    }
    if (options.extends) {
        customElements.define(options.tagName, GooeyCustomElement, {
            extends: options.extends,
        });
    } else {
        customElements.define(options.tagName, GooeyCustomElement);
    }
}
