import * as log from '../common/log';
import { flush, registerMountPoint, takeMountPoint } from '../model/engine';
import { renderJSXNode } from './renderjsx';
import { PortalRenderNode } from './rendernode/portalrendernode';
import { HTML_NAMESPACE } from './xmlnamespace';

export function mount(
    target: Element | ShadowRoot,
    node: JSX.Node
): () => void {
    const priorMount = takeMountPoint(target);
    if (priorMount) {
        log.warn(
            'Multiple mount() calls to the same target, resetting the old mount'
        );
        priorMount();
    }
    log.assert(
        target.childNodes.length === 0,
        'mount() called on non-empty target',
        { target }
    );
    const root = PortalRenderNode(target, renderJSXNode(node), null, 'root');
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

    let unsubscribed = false;
    const unsubscribe = () => {
        if (unsubscribed) {
            log.warn('mount() unmount function called multiple times');
            return;
        }
        takeMountPoint(target);
        unsubscribed = true;
        root.onUnmount();
        flush();
        target.replaceChildren(); // TODO: Woah nellie, this is weird
        root.detach();
        root.release();
    };
    registerMountPoint(target, unsubscribe);

    flush();

    return unsubscribe;
}
