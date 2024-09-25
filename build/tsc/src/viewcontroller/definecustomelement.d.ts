import type { WebComponentOptions } from './rendernode/webcomponentrendernode';
import { getWebComponentTagConstructors } from './webcomponents';
export declare function defineCustomElement<TKeys extends string, TShadowMode extends 'open' | 'closed' | undefined = undefined, TExtends extends keyof ReturnType<typeof getWebComponentTagConstructors> | undefined = undefined>(options: WebComponentOptions<TKeys, TShadowMode, TExtends>): void;
//# sourceMappingURL=definecustomelement.d.ts.map