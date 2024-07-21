import type { Dyn } from '../index';
declare module '../index' {
    interface CustomElements {
        'my-interface-merged-custom-element': {
            name: Dyn<string>;
            children: JSX.Element;
        };
    }
}
//# sourceMappingURL=view.test.d.ts.map