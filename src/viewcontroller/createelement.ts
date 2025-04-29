import { replaceComponent } from '../model/engine';
import { renderJSXChildren } from './renderjsx';
import { ArrayRenderNode } from './rendernode/arrayrendernode';
import type {
    Component,
    FunctionComponent,
} from './rendernode/componentrendernode';
import {
    ClassComponent,
    ComponentRenderNode,
} from './rendernode/componentrendernode';
import { IntrinsicRenderNode } from './rendernode/intrinsicrendernode';
import type { RenderNode } from './rendernode/rendernode';

export const Fragment: Component<{ children?: JSX.Node | JSX.Node[] }> = ({
    children,
}) => ArrayRenderNode(renderJSXChildren(children));

export interface ClassComponentConstructor<TProps> {
    new (props: TProps): ClassComponent<TProps>;
}

export function isClassComponent(
    val: any
): val is ClassComponentConstructor<unknown> {
    return val && val.prototype instanceof ClassComponent;
}

export function classComponentToFunctionComponent<TProps>(
    Component: ClassComponentConstructor<TProps>
): FunctionComponent<TProps> {
    return (props: TProps, lifecycle) => {
        const instance = new Component(props);
        if (instance.onDestroy)
            lifecycle.onDestroy(instance.onDestroy.bind(instance));
        if (instance.onMount)
            lifecycle.onMount(instance.onMount.bind(instance));
        if (instance.onError)
            lifecycle.onError(instance.onError.bind(instance));
        if (instance.onUnmount)
            lifecycle.onUnmount(instance.onUnmount.bind(instance));
        if (!instance.render) return null;
        return instance.render();
    };
}

export function createElement<TProps extends {} | undefined>(
    type: string | Component<TProps>,
    props: TProps,
    ...children: JSX.Node[]
): RenderNode {
    if (typeof type === 'string') {
        return IntrinsicRenderNode(
            type,
            props,
            ArrayRenderNode(renderJSXChildren(children))
        );
    }
    return ComponentRenderNode<TProps>(type, props, children);
}
createElement.Fragment = Fragment;
createElement.replaceComponent = replaceComponent;
