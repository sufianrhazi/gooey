import * as log from '../common/log';
import { flush } from '../model/engine';
import { ArrayRenderNode } from './rendernode/arrayrendernode';
import { ForeignRenderNode } from './rendernode/foreignrendernode';
import { PortalRenderNode } from './rendernode/portalrendernode';
import type { RenderNode } from './rendernode/rendernode';
import { HTML_NAMESPACE } from './xmlnamespace';

export function mount(
    target: Element | ShadowRoot,
    node: RenderNode
): () => void {
    const skipNodes = target.childNodes.length;
    const children: RenderNode[] = [];
    for (let i = 0; i < target.childNodes.length; ++i) {
        children.push(ForeignRenderNode(target.childNodes[i]));
    }
    children.push(node);
    const root = PortalRenderNode(
        target,
        ArrayRenderNode(children),
        null,
        'root'
    );
    root.retain();
    let syncError: undefined | Error;
    root.attach({
        nodeEmitter: (event) => {
            log.assert(false, 'Unexpected event emitted by Portal', event);
        },
        errorEmitter: (error) => {
            syncError = error;
            log.error('Unhandled mount error', error);
        },
        xmlNamespace:
            (target instanceof Element
                ? target.namespaceURI
                : target.host.namespaceURI) ?? HTML_NAMESPACE,
    });
    if (syncError) {
        root.release();
        throw syncError;
    }
    // WE HAVE A CONUNDRUM!
    // - When onMount() is called _before_ flushing, IntrinsicObserver callbacks work as expected; but component onMount notifications fail
    // - When onMount() is called _after_ flushing, IntrinsicObserver callbacks fail; but component onMount notifications work as expected
    // This is probably because the interaction between mounting and commit is very awkward when dealing with DOM nodes
    // - For onMount lifecycles to be able to observe nodes in the DOM, onMount needs to happen __after__ commit
    // - ref={} callbacks should be equivalent to onMount
    // - refRaw={} callbacks should be equivalent to retain() (NEEDS BETTER NAME)
    // Overall, it really sucks that we have to flush at all here.
    root.onMount();
    flush();
    return () => {
        const nodesToKeep = Array.from(target.childNodes).slice(0, skipNodes);
        root.onUnmount();
        flush();
        target.replaceChildren(...nodesToKeep);
        root.detach();
        root.release();
    };
}
