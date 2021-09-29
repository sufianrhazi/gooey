import { name, computation, model, collection } from './index';
import { TrackedComputation, isTrackedComputation } from './types';

type ReviseElement = {
    node: HTMLElement;
};

function isReviseElement(t: any): t is ReviseElement {
    return !!(t && t.node instanceof HTMLElement);
}

type ReviseNode = string | number | boolean | null | undefined | ReviseElement;

function isReviseNode(t: any): t is ReviseNode {
    return (
        typeof t === 'string' ||
        typeof t === 'number' ||
        typeof t === 'boolean' ||
        t === null ||
        t === undefined ||
        isReviseElement(t)
    );
}

type ReviseChild =
    | ReviseNode
    | TrackedComputation<ReviseNode | ReviseNode[]>
    | (ReviseNode | TrackedComputation<ReviseNode | ReviseNode[]>)[];

type ReviseStaticPropValue = string | boolean | null | undefined;

type RevisePropValue =
    | ReviseStaticPropValue
    | TrackedComputation<ReviseStaticPropValue>;

function isRevisePropValue(t: any): t is RevisePropValue {
    if (
        typeof t === 'string' ||
        typeof t === 'boolean' ||
        t === null ||
        t === undefined
    ) {
        return true;
    }
    if (isTrackedComputation(t)) {
        let v = t();
        return (
            typeof v === 'string' ||
            typeof v === 'boolean' ||
            v === null ||
            v === undefined
        );
    }
    return false;
}

type PropsWithChildren<P> = P & { children?: ReviseChild[] };

type ReviseComponent<P extends {}> = (
    props: P & { children?: ReviseChild[] }
) => ReviseElement;

type RangeMap = number[][];

function bindProperty(node: Element, key: string, value: RevisePropValue) {
    if (typeof value === 'string') {
        node.setAttribute(key, value);
    } else if (typeof value === 'boolean') {
        if (value) {
            node.setAttribute(key, '');
        }
    } else if (value === null || value === undefined) {
        // ignore
    } else if (isTrackedComputation(value)) {
        name(
            computation(() => {
                let newValue = value();
                if (typeof newValue === 'string') {
                    node.setAttribute(key, newValue);
                } else if (typeof newValue === 'boolean') {
                    if (newValue) {
                        node.setAttribute(key, '');
                    } else {
                        node.removeAttribute(key);
                    }
                } else if (newValue === null || newValue === undefined) {
                    node.removeAttribute(key);
                }
            }),
            `view:bindProperty:${key}`
        )();
    }
}

function getTargetIndex(childIndex: number, rangeMap: RangeMap): number {
    let targetIndex = 0;
    // Note: we start at 1 because we need to
    // - remove via node.removeChild(node.childNodes[targetIndex])
    // - insert via node.insertBefore(newNode, node.childNodes[targetIndex])
    for (let i = 0; i < childIndex; ++i) {
        rangeMap[i].forEach((range) => {
            targetIndex += range || 0;
        });
    }
    return targetIndex;
}

function createReviseNodeElement(node: ReviseNode): Node | null {
    if (typeof node === 'string') {
        return document.createTextNode(node);
    } else if (
        typeof node === 'boolean' ||
        node === null ||
        node === undefined
    ) {
        return null;
    } else if (typeof node === 'number') {
        // TODO: maybe warn on numbers as nodes?
        return document.createTextNode(node.toString());
    } else {
        return node.node;
    }
}

function bindChildren(element: Element, children: ReviseChild[]) {
    const rangeMap: RangeMap = [];
    children.forEach((child, childIndex) => {
        rangeMap[childIndex] = [];
        (Array.isArray(child) ? child : [child]).forEach((item, subIndex) => {
            if (isReviseNode(item)) {
                const node = createReviseNodeElement(item);
                if (node) {
                    rangeMap[childIndex][subIndex] = 1;
                    element.appendChild(node);
                } else {
                    rangeMap[childIndex][subIndex] = 0;
                }
            } else {
                name(
                    computation(() => {
                        const newChild = item();
                        const replaceIndex = getTargetIndex(
                            childIndex,
                            rangeMap
                        );
                        const replaceRange = rangeMap[childIndex][subIndex];

                        let newNode: Node | null;
                        let newRange: number;
                        if (Array.isArray(newChild)) {
                            const fragment = document.createDocumentFragment();
                            let numChildren = 0;
                            newChild.forEach((grandchild) => {
                                const grandchildNode =
                                    createReviseNodeElement(grandchild);
                                if (grandchildNode) {
                                    numChildren += 1;
                                    fragment.appendChild(grandchildNode);
                                }
                            });
                            newNode = fragment;
                            newRange = numChildren;
                        } else {
                            newNode = createReviseNodeElement(newChild);
                            newRange = newNode ? 1 : 0;
                        }

                        // Remove the old children
                        for (let i = 0; i < replaceRange; ++i) {
                            element.removeChild(
                                element.childNodes[replaceIndex]
                            );
                        }
                        // Add the new children
                        if (newNode) {
                            element.insertBefore(
                                newNode,
                                element.childNodes[replaceIndex + 1] || null
                            );
                        }

                        rangeMap[childIndex][subIndex] = newRange;
                    }),
                    `view:bindChildren:${element.nodeName}:${childIndex}:${subIndex}`
                )();
            }
        });
    });
}

function createElement<Props extends {}>(
    Constructor: string | ReviseComponent<Props>,
    props?: Props,
    ...children: ReviseChild[]
): ReviseElement {
    let element: HTMLElement;
    if (typeof Constructor === 'string') {
        element = document.createElement(Constructor);
        if (props) {
            Object.entries(props).forEach(([key, value]) => {
                if (isRevisePropValue(value)) {
                    bindProperty(element, key, value);
                }
            });
        }
        if (children) {
            // Map holding true if the index exists in the DOM
            bindChildren(element, children);
        }
    } else {
        const result = Constructor(Object.assign({}, props, { children }));
        element = result.node;
    }
    return { node: element };
}

export const React = {
    createElement,
    Fragment: () => {
        throw new Error('Unsupported');
    },
};
