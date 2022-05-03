import { Ref, Calculation, Collection, View, Context, IntrinsicNodeObserverNodeCallback, IntrinsicNodeObserverElementCallback } from './types';
/**
 * The core type that can be used as a child or root of a JSX expression
 */
export declare type JSXNode = string | number | boolean | null | undefined | symbol | Function | Element | RenderedElement<any, any, any> | Calculation<JSXNode> | Collection<JSXNode> | View<JSXNode> | JSXNode[];
declare global {
    namespace JSX {
        /**
         * The core type that can be used as a child or root of a JSX expression
         */
        type Element = JSXNode;
        interface IntrinsicElements extends KnownElements {
            [unknownElement: string]: any;
        }
        interface ElementChildrenAttribute {
            children: {};
        }
    }
}
declare type OnUnmountCallback = () => void;
declare type OnMountCallback = () => void;
declare type EffectCallback = () => void;
declare type ComponentListeners = {
    onUnmount: (callback: OnUnmountCallback) => void;
    onMount: (callback: OnMountCallback) => void;
    onEffect: (callback: EffectCallback) => void;
    getContext: <TVal>(context: Context<TVal>) => TVal;
};
/**
 * This is a big ol hack that allows components which don't declare any props (const MyComponent: Component<{}> = ...) to enforce that no children can be passed.
 * Why does this work? {} types as function properties accept _any_ props
 *
 * See:
 * - https://www.typescriptlang.org/play?jsx=1#code/C4TwDgpgBAShB2ATCAnCiDCB7AtmL8CwUAvFAN5QDGWWANgFxQBGtdEAhvFAL4DcAKGRU6HNNQIBnYgFd4MyegDKIHK0ZQ5ASwCOM6JNXrBoSFGx4CRADwAVAAoosYSQD5SUABRgnLpg99JKAAyCigAbTkFZSN6AF0AfiZWek5uHgBKUnc4JFR0C3xCeGBBIQgRMWh4DhwISTAOKmgAKSUADQoBKB6oU2gASRKULXhJLSoAUXY6kqCycm7e5Yg8UCZF5eWeJa2oAC9ULA3dvd6AfXOoxUQkvpR9ABpT7ZfeqxOzraoACy06RBoeBMNrtAB001WREEXx4zy+VgA8mBgJ8vr1fv9AQg7qCITNoW8ejsvjgZHRgFo0ejqH8AUCQR18VCSuE4jCznCiVAyRStMjUV0aT1MfScYzwZDZsA2Ry9lyEYRESgALLkynU9Gi7HAqB4qVEKAAHz1TINrPZ3IVZyRqvV-JRmq+2qBuLNBJKxtNko9MstsPhZ3CVAUwFw5sF0hG8AA5nEnUGQ9Jw76AILAYAjZgyYAQJhR0ZxphcEByrb8U47U6jXMoABmTWgEYwdJ16czWmzuaFZxdCA2Fdep36UAjHgLsa98jUqC9KXYXC9cmQddG6Cn5LoXtyyDQmFwRUJVYA9MeBKeoEMO2MJlAIL7JOez0-R2sQFAfM4gp49PVKQQmAAdx+d9ECweo+j+IJmAgH4OAAN2gYAoKgQCOBABIMgEaxVhRd9j1cQQcLfVxrAADygAjrGPXDQEI7DaJAUiKKoljSJokiygvAAtI5aSxIFsMOJxKPo6xhKwZjROoiSxNk8jpLYmSjnol9EUIO8yKaYhtWwqxRKI-SpKo48rDEsyFNY6TTMIVSL3U6BnH-Got106wkRRAy9KVTzjPYjzgHMnzAssvzqICuzjygNU+TAdhNO0-ixXgbDeUpLzrDSrQoDC48srE-LQqKvL7Ui6LyS0OLHJRLQCA4VzW0EzL7QFDKsta3L2pRAqWu6oqlJKvkBTKyYtKoYA6HffSsBQHkZugPsUvcpU7T5DLbRi9Lco20rDJWzatDCgadr5MqBVqlzJqgabZpweakp1LwSygacYJQLDlogZUDtagi9q+1bKQ64qTqB7r-u+3qQqU479qhyKX0KKxPXvFlgEfC8BAEGgxmISY3yYJHimAaxyB4dwyE8LISHcTxKBoegmEzfReAyQQcekKBeKcQmD2RkmyYprxqdp+m2CZh5oEydmpGIBzecsYnSYehlvWZaVeCFqnsi8MXGfuFnpex2WoAcgUFcPEplcWt0fTRzWPG1mndYkfXmaltnjdx8q+Qt-nrca-s1YjNkHcpkWXYZjR3dZmXvZ+x1zD5pX6cD+BbfVohQ-Jx2I7p13o8l2Ovc5s3AapJPFZsVOBKD-VfS9eu0ezrW871wvDc9jm5bhobE6J6uVfFYOG5NJvpRb3OdfzqOJc7riovxvCP0CLxf2kC6gJAqAwIg5CtGg2CEKQlC0Iwj6l9ADLL6Y4qb7E+-+us++F65vjFuw7msAyr-ct-ojf5PxMv-LG9kNIQDGjpVs2EHIZVgblByYlEFAPYog1+sCnIXXqg9GBwU4F4IQcFJBRCUHUTNuDUBUUDpVQSuNIeS0DoZUYblA6YlWGkOPKw1+MVKrxUwXVBqtcGFQyYSIlh8MiIJ2hopayUiRqQKujdOa4gP7WDLowv6uCAbMOKuo3aWjIanQ4Xo066CaoCMURpGayiFppyevAd8r1UAfRMWDYgmi1G9zcTlXRXiHSBSIq4-xR1rJBOGgvRGydDSo2lEEUYdZUB7hfFjbul4b6O3OJ+PwFBMjT3bnPD2cdOYDC-o7LJkgNhQEuNcdAdx5xpFZnkguBTi6pIGLAym5TKmLQlJnT0uTnYz3FgbQpJdiDtLwZTTJgRulpwzmOAZotmkjNaSbAYjCpldLCD0kezc4iNMGfklZRs2lSIyVsmuyV5m+mzm3ZZMcTlrKCecmZ2y069LHGPd0eyDlLNnscruTy-GtU2a8y5Oprn2y+XbCe+zFmR2GQ8z2L50nlLXvoDeAFULb13kEfeh84KIUggfVC6FMLYQGOkjxlKSLFRpXhMS9K6IcKZUxV+pTVElL4tSwBA0uVOEZbymRJl+WSXQeAyBODrATOgNS+BdK0EUuQTDayMqzpWPMS5KVMrfqMvIcQXKOqKHSv1SEkVpruH2hoRAxKnKNGMp0XyrhFL2EqpFc6l8PCaH8K1XakR1KzmGrkURdZ8MWXBsoaOBRU0rG3Xupy55cq-E+L5UEvVfizXsR1eXM6mr6qWMcnGlRdjPDPSce9JVwLPJJu0WIhVVaAmVtrX3aRVlzUNsIkAA
 */
declare const UnusedSymbol: unique symbol;
export declare type Component<TProps extends {}> = (props: TProps & {
    [UnusedSymbol]?: boolean;
}, listeners: ComponentListeners) => JSXNode;
/**
 * The type returned by createElement
 */
export declare type RenderedElement<TProps, TContext, TChildren extends JSXNode> = {
    type: 'intrinsic';
    element: string;
    props: TProps;
    children: TChildren[];
} | {
    type: 'context';
    context: Context<TContext>;
    props: {
        value: TContext;
    };
    children: TChildren[];
} | {
    type: 'component';
    component: Component<TProps & {
        children: TChildren;
    }>;
    props: TProps;
    children: TChildren[];
} | {
    type: 'component';
    component: Component<TProps & {
        children?: TChildren;
    }>;
    props: TProps;
    children: TChildren[];
} | {
    type: 'component';
    component: Component<TProps & {
        children: TChildren[];
    }>;
    props: TProps;
    children: TChildren[];
} | {
    type: 'component';
    component: Component<TProps & {
        children?: TChildren[];
    }>;
    props: TProps;
    children: TChildren[];
} | {
    type: 'component';
    component: Component<TProps>;
    props: TProps;
    children: TChildren[];
} | {
    type: 'observer';
    nodeCallback: IntrinsicNodeObserverNodeCallback | undefined;
    elementCallback: IntrinsicNodeObserverElementCallback | undefined;
    children: TChildren[];
};
interface MissingFromTypescriptHTMLElementProperties {
    ariaColIndexText?: string | undefined;
    ariaInvalid?: string | undefined;
    ariaRowIndexText?: string | undefined;
    role?: string | undefined;
    autofocus?: boolean | undefined;
    itemscope?: string | undefined;
}
interface MissingFromTypescriptHTMLDialogElementProperties {
    open?: boolean | undefined;
}
interface MissingFromTypescriptHTMLIframeElementProperties {
    loading?: LazyLoadingValue | undefined;
}
interface MissingFromTypescriptHTMLMetaElementProperties {
    media?: string | undefined;
}
interface MissingFromTypescriptHTMLSourceElementProperties {
    width?: number | undefined;
    height?: number | undefined;
}
declare type PropertyMapField<TJSXField, TElement, TIDLName extends keyof TElement> = {
    makeAttrValue?: ((jsxAttr: Exclude<TJSXField, undefined>) => string | undefined) | null;
} | {
    makeAttrValue?: ((jsxAttr: Exclude<TJSXField, undefined>) => string | undefined) | null;
    idlName?: TIDLName | null;
    makeIdlValue?: (jsxAttr: Exclude<TJSXField, undefined>) => TElement[TIDLName];
};
declare type PropertyMap<TJSXElementInterface, TElement> = {
    [TJSXKey in keyof Required<TJSXElementInterface>]: PropertyMapField<TJSXElementInterface[TJSXKey], TElement, keyof TElement>;
};
declare type AriaRole = 'alert' | 'alertdialog' | 'application' | 'article' | 'associationlist' | 'associationlistitemkey' | 'associationlistitemvalue' | 'banner' | 'blockquote' | 'button' | 'caption' | 'cell' | 'checkbox' | 'code' | 'columnheader' | 'combobox' | 'comment' | 'complementary' | 'contentinfo' | 'definition' | 'deletion' | 'dialog' | 'directory' | 'document' | 'emphasis' | 'feed' | 'figure' | 'form' | 'generic' | 'grid' | 'gridcell' | 'group' | 'heading' | 'img' | 'insertion' | 'link' | 'list' | 'listbox' | 'listitem' | 'log' | 'main' | 'mark' | 'marquee' | 'math' | 'menu' | 'menubar' | 'menuitem' | 'menuitemcheckbox' | 'menuitemradio' | 'meter' | 'navigation' | 'none' | 'note' | 'option' | 'paragraph' | 'presentation' | 'progressbar' | 'radio' | 'radiogroup' | 'region' | 'row' | 'rowgroup' | 'rowheader' | 'scrollbar' | 'search' | 'searchbox' | 'separator' | 'slider' | 'spinbutton' | 'status' | 'strong' | 'subscript' | 'suggestion' | 'superscript' | 'switch' | 'tab' | 'table' | 'tablist' | 'tabpanel' | 'term' | 'textbox' | 'time' | 'timer' | 'toolbar' | 'tooltip' | 'tree' | 'treegrid' | 'treeitem' | string;
declare type DirValue = 'ltr' | 'rtl' | 'auto' | string;
declare type BrowsingContextValue = '_blank' | '_self' | '_parent' | '_top' | string;
declare type ReferrerPolicyValue = '' | 'no-referrer' | 'no-referrer-when-downgrade' | 'same-origin' | 'origin' | 'strict-origin' | 'origin-when-cross-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url' | string;
declare type CrossOriginValue = 'anonymous' | '' | 'use-credentials';
declare type LazyLoadingValue = 'lazy' | 'eager' | string;
declare type ImageDecodingHintValue = 'sync' | 'async' | 'auto' | string;
declare type SandboxValue = 'allow-forms' | 'allow-modals' | 'allow-orientation-lock' | 'allow-pointer-lock' | 'allow-popups' | 'allow-popups-to-escape-sandbox' | 'allow-presentation' | 'allow-same-origin' | 'allow-scripts' | 'allow-top-navigation' | 'allow-top-navigation-by-user-activation' | 'allow-downloads' | string;
declare type EncTypeValue = 'application/x-www-form-urlencoded' | 'multipart/form-data' | 'text/plain' | string;
declare type FormMethodValue = 'get' | 'post' | 'dialog' | string;
declare type AutocompleteValue = 'on' | 'off' | string;
interface JSXElementInterface {
    /** a guide for creating a keyboard shortcut that activates or focuses the element */
    accesskey?: string | undefined;
    'aria-atomic'?: string | undefined;
    'aria-autocomplete'?: string | undefined;
    'aria-busy'?: string | undefined;
    'aria-checked'?: string | undefined;
    'aria-colcount'?: string | undefined;
    'aria-colindex'?: string | undefined;
    'aria-colindextext'?: string | undefined;
    'aria-colspan'?: string | undefined;
    'aria-current'?: string | undefined;
    'aria-disabled'?: string | undefined;
    'aria-expanded'?: string | undefined;
    'aria-haspopup'?: string | undefined;
    'aria-hidden'?: string | undefined;
    'aria-invalid'?: string | undefined;
    'aria-keyshortcuts'?: string | undefined;
    'aria-label'?: string | undefined;
    'aria-level'?: string | undefined;
    'aria-live'?: string | undefined;
    'aria-modal'?: string | undefined;
    'aria-multiline'?: string | undefined;
    'aria-multiselectable'?: string | undefined;
    'aria-orientation'?: string | undefined;
    'aria-placeholder'?: string | undefined;
    'aria-posinset'?: string | undefined;
    'aria-pressed'?: string | undefined;
    'aria-readonly'?: string | undefined;
    'aria-required'?: string | undefined;
    'aria-roledescription'?: string | undefined;
    'aria-rowcount'?: string | undefined;
    'aria-rowindex'?: string | undefined;
    'aria-rowindextext'?: string | undefined;
    'aria-rowspan'?: string | undefined;
    'aria-selected'?: string | undefined;
    'aria-setsize'?: string | undefined;
    'aria-sort'?: string | undefined;
    'aria-valuemax'?: string | undefined;
    'aria-valuemin'?: string | undefined;
    'aria-valuenow'?: string | undefined;
    'aria-valuetext'?: string | undefined;
    /** autocapitalization hint */
    autocapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters' | string | undefined;
    /** focus as soon as the page is loaded or as soon as the dialog within which it finds itself is shown */
    autofocus?: boolean | undefined;
    /** the various classes that the element belongs to */
    class?: string | undefined;
    /** indicates if the element is editable */
    contenteditable?: '' | 'true' | 'false' | string | undefined;
    /** specifies the element's text directionality */
    dir?: DirValue | undefined;
    /** specifies the element's drag behavior */
    draggable?: boolean | undefined;
    /** specifies what action label (or icon) to present for the enter key on virtual keyboards */
    enterkeyhint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send' | string | undefined;
    /** indicates that the element is not yet, or is no longer, directly relevant to the page's current state, or that it is being used to declare content to be reused by other parts of the page as opposed to being directly accessed by the user */
    hidden?: boolean | undefined;
    /** the unique id of the element */
    id?: string | undefined;
    inputmode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search' | string | undefined;
    is?: string | undefined;
    itemid?: string | undefined;
    itemprop?: string | undefined;
    itemref?: string | undefined;
    itemscope?: boolean | undefined;
    itemtype?: string | undefined;
    lang?: string | undefined;
    nonce?: string | undefined;
    role?: AriaRole | undefined;
    slot?: string | undefined;
    spellcheck?: boolean | undefined;
    style?: string | undefined;
    tabindex?: -1 | 0 | number | undefined;
    title?: string | undefined;
    translate?: '' | 'yes' | 'no' | undefined;
}
export declare const HTMLElementMap: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
interface JSXAnchorElementInterface extends JSXElementInterface {
    /** Address of the hyperlink */
    href?: string | undefined;
    /** Browsing context for hyperlink navigation */
    target?: BrowsingContextValue | undefined;
    /** Whether to download the resource instead of navigating to it, and its filename if so */
    download?: string | undefined;
    /** URLs to ping */
    ping?: string | undefined;
    /** Relationship between the location in the document containing the hyperlink and the destination resource */
    rel?: string | undefined;
    /** Language of the linked resource */
    hreflang?: string | undefined;
    /** Hint for the type of the referenced resource */
    type?: string | undefined;
    /** Referrer policy for fetches initiated by the element */
    referrerpolicy?: ReferrerPolicyValue | undefined;
}
interface JSXAreaElementInterface extends JSXElementInterface {
    alt?: string | undefined;
    coords?: string | undefined;
    shape?: 'circle' | 'circ' | 'default' | 'poly' | 'polygon' | 'rect' | 'rectangle' | string | undefined;
    href?: string | undefined;
    target?: BrowsingContextValue | undefined;
    download?: string | undefined;
    ping?: string | undefined;
    rel?: string | undefined;
    referrerpolicy?: ReferrerPolicyValue | undefined;
}
interface JSXMediaElementInterface extends JSXElementInterface {
    /** Address of the resource */
    src?: string | undefined;
    /** How the element handles crossorigin requests */
    crossorigin?: CrossOriginValue | undefined;
    /** Hints how much buffering the media resource will likely need */
    preload?: 'none' | 'metadata' | 'auto' | undefined;
    /** Hint that the media resource can be started automatically when the page is loaded */
    autoplay?: boolean | undefined;
    /** Whether to loop the media resource */
    loop?: boolean | undefined;
    /** Whether to mute the media resource by default */
    muted?: boolean | undefined;
    /** Show user agent controls */
    controls?: boolean | undefined;
}
interface JSXAudioElementInterface extends JSXMediaElementInterface {
}
interface JSXBRElementInterface extends JSXElementInterface {
}
interface JSXBaseElementInterface extends JSXElementInterface {
    href?: string | undefined;
    target?: BrowsingContextValue | undefined;
}
interface JSXBodyElementInterface extends JSXElementInterface {
}
interface JSXButtonElementInterface extends JSXElementInterface {
    disabled?: boolean | undefined;
    form?: string | undefined;
    formaction?: string | undefined;
    formenctype?: EncTypeValue | undefined;
    formmethod?: FormMethodValue | undefined;
    formnovalidate?: boolean | undefined;
    formtarget?: BrowsingContextValue | undefined;
    name?: string | undefined;
    type?: 'submit' | 'reset' | 'button' | string | undefined;
    value?: string | undefined;
}
interface JSXCanvasElementInterface extends JSXElementInterface {
    width?: number | undefined;
    height?: number | undefined;
}
interface JSXDListElementInterface extends JSXElementInterface {
}
interface JSXDataElementInterface extends JSXElementInterface {
    value?: string | undefined;
}
interface JSXDataListElementInterface extends JSXElementInterface {
}
interface JSXDetailsElementInterface extends JSXElementInterface {
    open?: boolean | undefined;
}
interface JSXDialogElementInterface extends JSXElementInterface {
    open?: boolean | undefined;
}
interface JSXDivElementInterface extends JSXElementInterface {
}
interface JSXEmbedElementInterface extends JSXElementInterface {
    src?: string | undefined;
    type?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
}
interface JSXFieldSetElementInterface extends JSXElementInterface {
    disabled?: boolean | undefined;
    form?: string | undefined;
    name?: string | undefined;
}
interface JSXFormElementInterface extends JSXElementInterface {
    'accept-charset'?: 'UTF-8' | string | undefined;
    action?: string | undefined;
    autocomplete?: AutocompleteValue | undefined;
    enctype?: EncTypeValue | undefined;
    method?: FormMethodValue | undefined;
    name?: string | undefined;
    novalidate?: boolean | undefined;
    target?: BrowsingContextValue | undefined;
    rel?: string | undefined;
}
interface JSXHeadingElementInterface extends JSXElementInterface {
}
interface JSXHeadElementInterface extends JSXElementInterface {
}
interface JSXHRElementInterface extends JSXElementInterface {
}
interface JSXHtmlElementInterface extends JSXElementInterface {
}
interface JSXIFrameElementInterface extends JSXElementInterface {
    /** Address of the resource */
    src?: string | undefined;
    /** A document to render in the iframe */
    srcdoc?: string | undefined;
    /** Name of nested browsing context */
    name?: string | undefined;
    /** Security rules for nested content */
    sandbox?: SandboxValue | undefined;
    /** Permissions policy to be applied to the iframe's contents */
    allow?: string | undefined;
    /** Whether to allow the iframe's contents to use requestFullscreen() */
    allowfullscreen?: boolean | undefined;
    /** Horizontal dimension */
    width?: number | undefined;
    /** Vertical dimension */
    height?: number | undefined;
    /** Referrer policy for fetches initiated by the element */
    referrerpolicy?: ReferrerPolicyValue | undefined;
    /** Used when determining loading deferral */
    loading?: LazyLoadingValue | undefined;
}
interface JSXImageElementInterface extends JSXElementInterface {
    /** Replacement text for use when images are not available */
    alt?: string | undefined;
    /** Address of the resource */
    src?: string | undefined;
    /** Images to use in different situations, e.g., high-resolution displays, small monitors, etc. */
    srcset?: string | undefined;
    /** Image sizes for different page layouts */
    sizes?: string | undefined;
    /** How the element handles crossorigin requests */
    crossorigin?: CrossOriginValue | undefined;
    /** Name of image map to use */
    usemap?: string | undefined;
    /** Whether the image is a server-side image map */
    ismap?: boolean | undefined;
    /** Horizontal dimension */
    width?: number | undefined;
    /** Vertical dimension */
    height?: number | undefined;
    /** Referrer policy for fetches initiated by the element */
    referrerpolicy?: ReferrerPolicyValue | undefined;
    /** Decoding hint to use when processing this image for presentation */
    decoding?: ImageDecodingHintValue | undefined;
    /** Used when determining loading deferral */
    loading?: LazyLoadingValue | undefined;
}
declare type FormInputTypeValues = 'button' | 'checkbox' | 'color' | 'date' | 'datetime-local' | 'email' | 'file' | 'hidden' | 'image' | 'month' | 'number' | 'password' | 'radio' | 'range' | 'reset' | 'search' | 'submit' | 'tel' | 'text' | 'time' | 'url' | 'week' | string;
interface JSXInputElementInterface extends JSXElementInterface {
    /** Hint for expected file type in file upload controls */
    accept?: string | undefined;
    /** Replacement text for use when images are not available */
    alt?: string | undefined;
    /** Hint for form autofill feature */
    autocomplete?: AutocompleteValue | undefined;
    /** Whether the control is checked */
    checked?: boolean | undefined;
    /** Name of form control to use for sending the element's directionality in form submission */
    dirname?: string | undefined;
    /** Whether the form control is disabled */
    disabled?: boolean | undefined;
    /** Associates the element with a form element */
    form?: string | undefined;
    /** URL to use for form submission */
    formaction?: string | undefined;
    /** Entry list encoding type to use for form submission */
    formenctype?: EncTypeValue | undefined;
    /** Variant to use for form submission */
    formmethod?: FormMethodValue | undefined;
    /** Bypass form control validation for form submission */
    formnovalidate?: boolean | undefined;
    /** Browsing context for form submission */
    formtarget?: BrowsingContextValue | undefined;
    /** Vertical dimension */
    height?: number | undefined;
    /** Third, indeterminate state for checkboxes */
    indeterminate?: boolean | undefined;
    /** List of autocomplete options */
    list?: string | undefined;
    /** Maximum value */
    max?: number | undefined;
    /** Maximum length of value */
    maxlength?: number | undefined;
    /** Minimum value */
    min?: number | undefined;
    /** Minimum length of value */
    minlength?: number | undefined;
    /** Whether to allow multiple values */
    multiple?: boolean | undefined;
    /** Name of the element to use for form submission and in the form.elements API */
    name?: string | undefined;
    /** Pattern to be matched by the form control's value */
    pattern?: string | undefined;
    /** User-visible label to be placed within the form control */
    placeholder?: string | undefined;
    /** Whether to allow the value to be edited by the user */
    readonly?: boolean | undefined;
    /** Whether the control is required for form submission */
    required?: boolean | undefined;
    /** Size of the control */
    size?: number | undefined;
    /** Address of the resource */
    src?: string | undefined;
    /** Granularity to be matched by the form control's value */
    step?: number | undefined;
    /** Type of form control */
    type?: FormInputTypeValues | undefined;
    /** Value of the form control */
    value?: string | undefined;
    /** Horizontal dimension */
    width?: number | undefined;
}
interface JSXModElementInterface extends JSXElementInterface {
    /** Link to the source of the quotation or more information about the edit */
    cite?: string | undefined;
    /** Date and (optionally) time of the change */
    datetime?: string | undefined;
}
interface JSXLabelElementInterface extends JSXElementInterface {
    /** Associate the label with form control */
    for?: string | undefined;
}
interface JSXLegendElementInterface extends JSXElementInterface {
}
interface JSXLIElementInterface extends JSXElementInterface {
    /** Ordinal value of the list item */
    value?: string | undefined;
}
interface JSXLinkElementInterface extends JSXElementInterface {
    /** Address of the hyperlink */
    href?: string | undefined;
    /** How the element handles crossorigin requests */
    crossorigin?: CrossOriginValue | undefined;
    /** Relationship between the document containing the hyperlink and the destination resource */
    rel?: string | undefined;
    /** Applicable media */
    media?: string | undefined;
    /** Integrity metadata used in Subresource Integrity checks [SRI] */
    integrity?: string | undefined;
    /** Language of the linked resource */
    hreflang?: string | undefined;
    /** Hint for the type of the referenced resource */
    type?: string | undefined;
    /** Referrer policy for fetches initiated by the element */
    referrerpolicy?: ReferrerPolicyValue | undefined;
    /** Sizes of the icons (for rel="icon") */
    sizes?: string | undefined;
    /** Images to use in different situations, e.g., high-resolution displays, small monitors, etc. (for rel="preload") */
    imagesrcset?: string | undefined;
    /** Image sizes for different page layouts (for rel="preload") */
    imagesizes?: string | undefined;
    /** Potential destination for a preload request (for rel="preload" and rel="modulepreload") */
    as?: string | undefined;
    /** Color to use when customizing a site's icon (for rel="mask-icon") */
    color?: string | undefined;
    /** Whether the link is disabled */
    disabled?: boolean | undefined;
}
interface JSXMapElementInterface extends JSXElementInterface {
    /** Name of image map to reference from the usemap attribute */
    name?: string | undefined;
}
interface JSXMenuElementInterface extends JSXElementInterface {
}
interface JSXMetaElementInterface extends JSXElementInterface {
    /** Metadata name */
    name?: 'application-name' | 'author' | 'description' | 'generator' | 'keywords' | 'referrer' | 'theme-color' | 'color-scheme' | string | undefined;
    /** Pragma directive */
    'http-equiv'?: string | undefined;
    /** Value of the element */
    content?: string | undefined;
    /** Character encoding declaration */
    charset?: string | undefined;
    /** Applicable media */
    media?: string | undefined;
}
interface JSXMeterElementInterface extends JSXElementInterface {
    /** Current value of the element */
    value?: number | undefined;
    /** Lower bound of range */
    min?: number | undefined;
    /** Upper bound of range */
    max?: number | undefined;
    /** High limit of low range */
    low?: number | undefined;
    /** Low limit of high range */
    high?: number | undefined;
    /** Optimum value in gauge */
    optimum?: number | undefined;
}
interface JSXObjectElementInterface extends JSXElementInterface {
    /** Address of the resource */
    data?: string | undefined;
    /** Type of embedded resource */
    type?: string | undefined;
    /** Name of nested browsing context */
    name?: BrowsingContextValue | undefined;
    /** Associates the element with a form element */
    form?: string | undefined;
    /** Horizontal dimension */
    width?: string | undefined;
    /** Vertical dimension */
    height?: string | undefined;
}
interface JSXOListElementInterface extends JSXElementInterface {
    /** Number the list backwards */
    reversed?: boolean | undefined;
    /** Starting value of the list */
    start?: number | undefined;
    /** Kind of list marker */
    type?: 'decimal' | 'lower-alpha' | 'upper-alpha' | 'lower-roman' | 'upper-roman' | string | undefined;
}
interface JSXOptGroupElementInterface extends JSXElementInterface {
    /** Whether the form control is disabled */
    disabled?: boolean | undefined;
    /** User-visible label */
    label?: string | undefined;
}
interface JSXOptionElementInterface extends JSXElementInterface {
    /** Whether the form control is disabled */
    disabled?: boolean | undefined;
    /** User-visible label */
    label?: string | undefined;
    /** Whether the option is selected by default */
    selected?: boolean | undefined;
    /** Value to be used for form submission */
    value?: string | undefined;
}
interface JSXOutputElementInterface extends JSXElementInterface {
    /** Specifies controls from which the output was calculated */
    for?: string | undefined;
    /** Associates the element with a form element */
    form?: string | undefined;
    /** Name of the element to use in the form.elements API. */
    name?: string | undefined;
}
interface JSXParagraphElementInterface extends JSXElementInterface {
}
interface JSXParamElementInterface extends JSXElementInterface {
    /** Name of parameter */
    name?: string | undefined;
    /** Value of parameter */
    value?: string | undefined;
}
interface JSXPictureElementInterface extends JSXElementInterface {
}
interface JSXPreElementInterface extends JSXElementInterface {
}
interface JSXProgressElementInterface extends JSXElementInterface {
    /** Current value of the element */
    value?: number | undefined;
    /** Upper bound of range */
    max?: number | undefined;
}
interface JSXQuoteElementInterface extends JSXElementInterface {
    /** Link to the source of the quotation or more information about the edit */
    cite?: string | undefined;
}
interface JSXScriptElementInterface extends JSXElementInterface {
    /** Address of the resource */
    src?: string | undefined;
    /** Type of script */
    type?: 'application/json' | 'text/json' | 'module' | string | undefined;
    /** Prevents execution in user agents that support module scripts */
    nomodule?: boolean | undefined;
    /** Execute script when available, without blocking while fetching */
    async?: boolean | undefined;
    /** Defer script execution */
    defer?: boolean | undefined;
    /** How the element handles crossorigin requests */
    crossorigin?: CrossOriginValue | undefined;
    /** Integrity metadata used in Subresource Integrity checks [SRI] */
    integrity?: string | undefined;
    /** Referrer policy for fetches initiated by the element */
    referrerpolicy?: ReferrerPolicyValue | undefined;
}
interface JSXSelectElementInterface extends JSXElementInterface {
    /** Hint for form autofill feature */
    autocomplete?: AutocompleteValue | undefined;
    /** Whether the form control is disabled */
    disabled?: boolean | undefined;
    /** Associates the element with a form element */
    form?: string | undefined;
    /** Whether to allow multiple values */
    multiple?: boolean | undefined;
    /** Name of the element to use for form submission and in the form.elements API */
    name?: string | undefined;
    /** Whether the control is required for form submission */
    required?: boolean | undefined;
    /** Size of the control */
    size?: number | undefined;
    /** Value of the element */
    value?: string | undefined;
}
interface JSXSlotElementInterface extends JSXElementInterface {
    /** Name of shadow tree slot */
    name?: string | undefined;
}
interface JSXSourceElementInterface extends JSXElementInterface {
    /** Type of embedded resource */
    type?: string | undefined;
    /** (in video or audio) — Address of the resource */
    src?: string | undefined;
    /** (in picture) — Images to use in different situations, e.g., high-resolution displays, small monitors, etc. */
    srcset?: string | undefined;
    /** (in picture) — Image sizes for different page layouts */
    sizes?: string | undefined;
    /** (in picture) — Applicable media */
    media?: string | undefined;
    /** (in picture) — Horizontal dimension */
    width?: number | undefined;
    /** (in picture) — Vertical dimension */
    height?: number | undefined;
}
interface JSXSpanElementInterface extends JSXElementInterface {
}
interface JSXStyleElementInterface extends JSXElementInterface {
    /** Applicable media */
    media?: string | undefined;
}
interface JSXTableElementInterface extends JSXElementInterface {
}
interface JSXTableCaptionElementInterface extends JSXElementInterface {
}
interface JSXTableSectionElementInterface extends JSXElementInterface {
}
interface JSXTableCellElementInterface extends JSXElementInterface {
    /** Number of columns that the cell is to span */
    colspan?: number | undefined;
    /** Number of rows that the cell is to span */
    rowspan?: number | undefined;
    /** The header cells for this cell */
    headers?: string | undefined;
}
interface JSXTableColElementInterface extends JSXElementInterface {
    /** Number of columns spanned by the element */
    span?: number | undefined;
}
interface JSXTemplateElementInterface extends JSXElementInterface {
}
interface JSXTextAreaElementInterface extends JSXElementInterface {
    /** Hint for form autofill feature */
    autocomplete?: AutocompleteValue | undefined;
    /** Maximum number of characters per line */
    cols?: number | undefined;
    /** Name of form control to use for sending the element's directionality in form submission */
    dirname?: DirValue | undefined;
    /** Whether the form control is disabled */
    disabled?: boolean | undefined;
    /** Associates the element with a form element */
    form?: string | undefined;
    /** Maximum length of value */
    maxlength?: number | undefined;
    /** Minimum length of value */
    minlength?: number | undefined;
    /** Name of the element to use for form submission and in the form.elements API */
    name?: string | undefined;
    /** User-visible label to be placed within the form control */
    placeholder?: string | undefined;
    /** Whether to allow the value to be edited by the user */
    readonly?: boolean | undefined;
    /** Whether the control is required for form submission */
    required?: boolean | undefined;
    /** Number of lines to show */
    rows?: number | undefined;
    /** How the value of the form control is to be wrapped for form submission */
    wrap?: 'soft' | 'hard' | string | undefined;
}
interface JSXTimeElementInterface extends JSXElementInterface {
    /** Machine-readable value */
    datetime?: string | undefined;
}
interface JSXTitleElementInterface extends JSXElementInterface {
}
interface JSXTableRowElementInterface extends JSXElementInterface {
}
interface JSXTrackElementInterface extends JSXElementInterface {
    /** The type of text track */
    kind?: 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata' | string | undefined;
    /** Address of the resource */
    src?: string | undefined;
    /** Language of the text track */
    srclang?: string | undefined;
    /** User-visible label */
    label?: string | undefined;
    /** Enable the track if no other text track is more suitable */
    default?: boolean | undefined;
}
interface JSXUListElementInterface extends JSXElementInterface {
}
interface JSXVideoElementInterface extends JSXMediaElementInterface {
    /** Poster frame to show prior to video playback */
    poster?: string | undefined;
    /** Encourage the user agent to display video content within the element's playback area */
    playsinline?: string | undefined;
    /** Horizontal dimension */
    width?: number | undefined;
    /** Vertical dimension */
    height?: number | undefined;
}
export declare const ElementTypeMapping: {
    readonly a: PropertyMap<JSXAnchorElementInterface, HTMLAnchorElement>;
    readonly abbr: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly address: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly area: PropertyMap<JSXAreaElementInterface, HTMLAreaElement>;
    readonly article: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly aside: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly audio: PropertyMap<JSXAudioElementInterface, HTMLAudioElement>;
    readonly b: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly base: PropertyMap<JSXBaseElementInterface, HTMLBaseElement>;
    readonly bdi: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly bdo: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly blockquote: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly body: PropertyMap<JSXBodyElementInterface, HTMLBodyElement>;
    readonly br: PropertyMap<JSXBRElementInterface, HTMLBRElement>;
    readonly button: PropertyMap<JSXButtonElementInterface, HTMLButtonElement>;
    readonly canvas: PropertyMap<JSXCanvasElementInterface, HTMLCanvasElement>;
    readonly caption: PropertyMap<JSXTableCaptionElementInterface, HTMLTableCaptionElement>;
    readonly cite: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly code: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly col: PropertyMap<JSXTableColElementInterface, HTMLTableColElement>;
    readonly colgroup: PropertyMap<JSXTableColElementInterface, HTMLTableColElement>;
    readonly data: PropertyMap<JSXDataElementInterface, HTMLDataElement>;
    readonly datalist: PropertyMap<JSXDataListElementInterface, HTMLDataListElement>;
    readonly dd: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly del: PropertyMap<JSXModElementInterface, HTMLModElement>;
    readonly details: PropertyMap<JSXDetailsElementInterface, HTMLDetailsElement>;
    readonly dfn: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly dialog: PropertyMap<JSXDialogElementInterface, HTMLDialogElement & MissingFromTypescriptHTMLDialogElementProperties>;
    readonly div: PropertyMap<JSXDivElementInterface, HTMLDivElement>;
    readonly dl: PropertyMap<JSXDListElementInterface, HTMLDListElement>;
    readonly dt: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly em: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly embed: PropertyMap<JSXEmbedElementInterface, HTMLEmbedElement>;
    readonly fieldset: PropertyMap<JSXFieldSetElementInterface, HTMLFieldSetElement>;
    readonly figcaption: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly figure: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly footer: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly form: PropertyMap<JSXFormElementInterface, HTMLFormElement>;
    readonly h1: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly h2: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly h3: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly h4: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly h5: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly h6: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly head: PropertyMap<JSXHeadElementInterface, HTMLHeadElement>;
    readonly header: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly heading: PropertyMap<JSXHeadingElementInterface, HTMLHeadingElement>;
    readonly hgroup: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly hr: PropertyMap<JSXHRElementInterface, HTMLHRElement>;
    readonly html: PropertyMap<JSXHtmlElementInterface, HTMLHtmlElement>;
    readonly i: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly iframe: PropertyMap<JSXIFrameElementInterface, HTMLIFrameElement & MissingFromTypescriptHTMLIframeElementProperties>;
    readonly image: PropertyMap<JSXImageElementInterface, HTMLImageElement>;
    readonly img: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly input: PropertyMap<JSXInputElementInterface, HTMLInputElement>;
    readonly ins: PropertyMap<JSXModElementInterface, HTMLModElement>;
    readonly kbd: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly label: PropertyMap<JSXLabelElementInterface, HTMLLabelElement>;
    readonly legend: PropertyMap<JSXLegendElementInterface, HTMLLegendElement>;
    readonly li: PropertyMap<JSXLIElementInterface, HTMLLIElement>;
    readonly link: PropertyMap<JSXLinkElementInterface, HTMLLinkElement>;
    readonly main: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly map: PropertyMap<JSXMapElementInterface, HTMLMapElement>;
    readonly mark: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly menu: PropertyMap<JSXMenuElementInterface, HTMLMenuElement>;
    readonly meta: PropertyMap<JSXMetaElementInterface, HTMLMetaElement & MissingFromTypescriptHTMLMetaElementProperties>;
    readonly meter: PropertyMap<JSXMeterElementInterface, HTMLMeterElement>;
    readonly nav: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly noscript: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly object: PropertyMap<JSXObjectElementInterface, HTMLObjectElement>;
    readonly ol: PropertyMap<JSXOListElementInterface, HTMLOListElement>;
    readonly optgroup: PropertyMap<JSXOptGroupElementInterface, HTMLOptGroupElement>;
    readonly option: PropertyMap<JSXOptionElementInterface, HTMLOptionElement>;
    readonly output: PropertyMap<JSXOutputElementInterface, HTMLOutputElement>;
    readonly p: PropertyMap<JSXParagraphElementInterface, HTMLParagraphElement>;
    readonly param: PropertyMap<JSXParamElementInterface, HTMLParamElement>;
    readonly picture: PropertyMap<JSXPictureElementInterface, HTMLPictureElement>;
    readonly pre: PropertyMap<JSXPreElementInterface, HTMLPreElement>;
    readonly progress: PropertyMap<JSXProgressElementInterface, HTMLProgressElement>;
    readonly quote: PropertyMap<JSXQuoteElementInterface, HTMLQuoteElement>;
    readonly rp: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly rt: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly ruby: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly s: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly samp: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly script: PropertyMap<JSXScriptElementInterface, HTMLScriptElement>;
    readonly section: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly select: PropertyMap<JSXSelectElementInterface, HTMLSelectElement>;
    readonly slot: PropertyMap<JSXSlotElementInterface, HTMLSlotElement>;
    readonly small: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly source: PropertyMap<JSXSourceElementInterface, HTMLSourceElement & MissingFromTypescriptHTMLSourceElementProperties>;
    readonly span: PropertyMap<JSXSpanElementInterface, HTMLSpanElement>;
    readonly strong: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly style: PropertyMap<JSXStyleElementInterface, HTMLStyleElement>;
    readonly sub: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly summary: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly sup: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly table: PropertyMap<JSXTableElementInterface, HTMLTableElement>;
    readonly tbody: PropertyMap<JSXTableSectionElementInterface, HTMLTableSectionElement>;
    readonly td: PropertyMap<JSXTableCellElementInterface, HTMLTableCellElement>;
    readonly template: PropertyMap<JSXTemplateElementInterface, HTMLTemplateElement>;
    readonly textarea: PropertyMap<JSXTextAreaElementInterface, HTMLTextAreaElement>;
    readonly tfoot: PropertyMap<JSXTableSectionElementInterface, HTMLTableSectionElement>;
    readonly th: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly thead: PropertyMap<JSXTableSectionElementInterface, HTMLTableSectionElement>;
    readonly time: PropertyMap<JSXTimeElementInterface, HTMLTimeElement>;
    readonly title: PropertyMap<JSXTitleElementInterface, HTMLTitleElement>;
    readonly tr: PropertyMap<JSXTableRowElementInterface, HTMLTableRowElement>;
    readonly track: PropertyMap<JSXTrackElementInterface, HTMLTrackElement>;
    readonly u: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly ul: PropertyMap<JSXUListElementInterface, HTMLUListElement>;
    readonly var: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
    readonly video: PropertyMap<JSXVideoElementInterface, HTMLVideoElement>;
    readonly wbr: PropertyMap<JSXElementInterface, HTMLElement & MissingFromTypescriptHTMLElementProperties>;
};
interface ElementTypeMappingField {
    makeAttrValue?: (jsxAttr: any) => string | undefined;
    idlName?: any;
    makeIdlValue?: (jsxAttr: any) => any;
}
export declare function getElementTypeMapping(elementName: string, property: string): ElementTypeMappingField;
/**
 * Good old bivarianceHack to allow assignability of specific event handlers to more generic event handlers :facepalm:
 */
declare type EventHandler<TEvent extends Event> = undefined | {
    bivarianceHack(event: TEvent): void;
}['bivarianceHack'];
interface JSXRefProps<TElement extends HTMLElement> {
    ref?: undefined | Ref<TElement> | ((current: TElement | undefined) => void);
}
interface JSXEventProps {
    'on:abort'?: EventHandler<Event>;
    'on:auxclick'?: EventHandler<PointerEvent>;
    'on:beforeinput'?: EventHandler<InputEvent>;
    'on:blur'?: EventHandler<FocusEvent>;
    'on:cancel'?: EventHandler<Event>;
    'on:change'?: EventHandler<Event>;
    'on:click'?: EventHandler<PointerEvent>;
    'on:close'?: EventHandler<Event>;
    'on:compositionend'?: EventHandler<CompositionEvent>;
    'on:compositionstart'?: EventHandler<CompositionEvent>;
    'on:compositionupdate'?: EventHandler<CompositionEvent>;
    'on:connect'?: EventHandler<MessageEvent>;
    'on:contextlost'?: EventHandler<Event>;
    'on:contextmenu'?: EventHandler<PointerEvent>;
    'on:contextrestored'?: EventHandler<Event>;
    'on:copy'?: EventHandler<Event>;
    'on:cut'?: EventHandler<Event>;
    'on:dblclick'?: EventHandler<MouseEvent>;
    'on:drag'?: EventHandler<DragEvent>;
    'on:dragend'?: EventHandler<DragEvent>;
    'on:dragenter'?: EventHandler<DragEvent>;
    'on:dragleave'?: EventHandler<DragEvent>;
    'on:dragover'?: EventHandler<DragEvent>;
    'on:dragstart'?: EventHandler<DragEvent>;
    'on:drop'?: EventHandler<DragEvent>;
    'on:emptied'?: EventHandler<Event>;
    'on:error'?: EventHandler<Event>;
    'on:focus'?: EventHandler<FocusEvent>;
    'on:focusin'?: EventHandler<FocusEvent>;
    'on:focusout'?: EventHandler<FocusEvent>;
    'on:formdata'?: EventHandler<FormDataEvent>;
    'on:hashchange'?: EventHandler<HashChangeEvent>;
    'on:input'?: EventHandler<InputEvent>;
    'on:invalid'?: EventHandler<Event>;
    'on:keydown'?: EventHandler<KeyboardEvent>;
    'on:keyup'?: EventHandler<KeyboardEvent>;
    'on:languagechange'?: EventHandler<Event>;
    'on:load'?: EventHandler<Event>;
    'on:loadstart'?: EventHandler<Event>;
    'on:message'?: EventHandler<MessageEvent>;
    'on:messageerror'?: EventHandler<MessageEvent>;
    'on:mousedown'?: EventHandler<MouseEvent>;
    'on:mouseenter'?: EventHandler<MouseEvent>;
    'on:mouseleave'?: EventHandler<MouseEvent>;
    'on:mousemove'?: EventHandler<MouseEvent>;
    'on:mouseout'?: EventHandler<MouseEvent>;
    'on:mouseover'?: EventHandler<MouseEvent>;
    'on:mouseup'?: EventHandler<MouseEvent>;
    'on:offline'?: EventHandler<Event>;
    'on:online'?: EventHandler<Event>;
    'on:open'?: EventHandler<Event>;
    'on:pagehide'?: EventHandler<PageTransitionEvent>;
    'on:pageshow'?: EventHandler<PageTransitionEvent>;
    'on:paste'?: EventHandler<Event>;
    'on:popstate'?: EventHandler<PopStateEvent>;
    'on:progress'?: EventHandler<Event>;
    'on:readystatechange'?: EventHandler<Event>;
    'on:rejectionhandled'?: EventHandler<PromiseRejectionEvent>;
    'on:reset'?: EventHandler<Event>;
    'on:securitypolicyviolation'?: EventHandler<Event>;
    'on:select'?: EventHandler<Event>;
    'on:slotchange'?: EventHandler<Event>;
    'on:stalled'?: EventHandler<Event>;
    'on:storage'?: EventHandler<StorageEvent>;
    'on:submit'?: EventHandler<SubmitEvent>;
    'on:suspend'?: EventHandler<Event>;
    'on:toggle'?: EventHandler<Event>;
    'on:unhandledrejection'?: EventHandler<PromiseRejectionEvent>;
    'on:unload'?: EventHandler<Event>;
    'on:visibilitychange'?: EventHandler<Event>;
    'on:wheel'?: EventHandler<WheelEvent>;
    [key: `on:${string}`]: EventHandler<Event>;
}
interface JSXDataProps {
    [key: `data-${string}`]: Calculation<string | undefined> | string | undefined;
}
declare type JSXElementInterfaceProps<TJSXType extends JSXElementInterface> = {
    [Key in keyof TJSXType]: (Calculation<any> & (() => TJSXType[Key])) | TJSXType[Key];
};
declare type JSXChildrenProps<HasChildren extends boolean> = HasChildren extends true ? {
    children?: JSX.Element | JSX.Element[];
} : {
    children?: never;
};
declare type WithCalculationsAndRef<TJSXType extends JSXElementInterface, TElement extends HTMLElement, HasChildren extends boolean> = JSXRefProps<TElement> & JSXEventProps & JSXDataProps & JSXElementInterfaceProps<TJSXType> & JSXChildrenProps<HasChildren>;
export interface KnownElements {
    a: WithCalculationsAndRef<JSXAnchorElementInterface, HTMLAnchorElement, true>;
    abbr: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    address: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    area: WithCalculationsAndRef<JSXAreaElementInterface, HTMLAreaElement, false>;
    article: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    aside: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    audio: WithCalculationsAndRef<JSXAudioElementInterface, HTMLAudioElement, true>;
    b: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    base: WithCalculationsAndRef<JSXBaseElementInterface, HTMLBaseElement, false>;
    bdi: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    bdo: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    blockquote: WithCalculationsAndRef<JSXQuoteElementInterface, HTMLQuoteElement, true>;
    body: WithCalculationsAndRef<JSXBodyElementInterface, HTMLBodyElement, true>;
    br: WithCalculationsAndRef<JSXBRElementInterface, HTMLBRElement, false>;
    button: WithCalculationsAndRef<JSXButtonElementInterface, HTMLButtonElement, true>;
    canvas: WithCalculationsAndRef<JSXCanvasElementInterface, HTMLCanvasElement, true>;
    caption: WithCalculationsAndRef<JSXTableCaptionElementInterface, HTMLTableCaptionElement, true>;
    cite: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    code: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    col: WithCalculationsAndRef<JSXTableColElementInterface, HTMLTableColElement, false>;
    colgroup: WithCalculationsAndRef<JSXTableColElementInterface, HTMLTableColElement, true>;
    data: WithCalculationsAndRef<JSXDataElementInterface, HTMLDataElement, true>;
    datalist: WithCalculationsAndRef<JSXDataListElementInterface, HTMLDataListElement, true>;
    dd: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    del: WithCalculationsAndRef<JSXModElementInterface, HTMLModElement, true>;
    details: WithCalculationsAndRef<JSXDetailsElementInterface, HTMLDetailsElement, true>;
    dfn: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    dialog: WithCalculationsAndRef<JSXDialogElementInterface, HTMLDialogElement, true>;
    div: WithCalculationsAndRef<JSXDivElementInterface, HTMLDivElement, true>;
    dl: WithCalculationsAndRef<JSXDListElementInterface, HTMLDListElement, true>;
    dt: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    em: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    embed: WithCalculationsAndRef<JSXEmbedElementInterface, HTMLEmbedElement, false>;
    fieldset: WithCalculationsAndRef<JSXFieldSetElementInterface, HTMLFieldSetElement, true>;
    figcaption: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    figure: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    footer: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    form: WithCalculationsAndRef<JSXFormElementInterface, HTMLFormElement, true>;
    h1: WithCalculationsAndRef<JSXHeadingElementInterface, HTMLHeadingElement, true>;
    h2: WithCalculationsAndRef<JSXHeadingElementInterface, HTMLHeadingElement, true>;
    h3: WithCalculationsAndRef<JSXHeadingElementInterface, HTMLHeadingElement, true>;
    h4: WithCalculationsAndRef<JSXHeadingElementInterface, HTMLHeadingElement, true>;
    h5: WithCalculationsAndRef<JSXHeadingElementInterface, HTMLHeadingElement, true>;
    h6: WithCalculationsAndRef<JSXHeadingElementInterface, HTMLHeadingElement, true>;
    head: WithCalculationsAndRef<JSXHeadElementInterface, HTMLHeadElement, true>;
    header: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    hgroup: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    hr: WithCalculationsAndRef<JSXHRElementInterface, HTMLHRElement, false>;
    html: WithCalculationsAndRef<JSXHtmlElementInterface, HTMLHtmlElement, true>;
    i: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    iframe: WithCalculationsAndRef<JSXIFrameElementInterface, HTMLIFrameElement, true>;
    img: WithCalculationsAndRef<JSXImageElementInterface, HTMLImageElement, false>;
    input: WithCalculationsAndRef<JSXInputElementInterface, HTMLInputElement, false>;
    ins: WithCalculationsAndRef<JSXModElementInterface, HTMLModElement, true>;
    kbd: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    label: WithCalculationsAndRef<JSXLabelElementInterface, HTMLLabelElement, true>;
    legend: WithCalculationsAndRef<JSXLegendElementInterface, HTMLLegendElement, true>;
    li: WithCalculationsAndRef<JSXLIElementInterface, HTMLLIElement, true>;
    link: WithCalculationsAndRef<JSXLinkElementInterface, HTMLLinkElement, false>;
    main: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    map: WithCalculationsAndRef<JSXMapElementInterface, HTMLMapElement, true>;
    mark: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    menu: WithCalculationsAndRef<JSXMenuElementInterface, HTMLMenuElement, true>;
    meta: WithCalculationsAndRef<JSXMetaElementInterface, HTMLMetaElement, false>;
    meter: WithCalculationsAndRef<JSXMeterElementInterface, HTMLMeterElement, true>;
    nav: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    noscript: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    object: WithCalculationsAndRef<JSXObjectElementInterface, HTMLObjectElement, true>;
    ol: WithCalculationsAndRef<JSXOListElementInterface, HTMLOListElement, true>;
    optgroup: WithCalculationsAndRef<JSXOptGroupElementInterface, HTMLOptGroupElement, true>;
    option: WithCalculationsAndRef<JSXOptionElementInterface, HTMLOptionElement, true>;
    output: WithCalculationsAndRef<JSXOutputElementInterface, HTMLOutputElement, true>;
    p: WithCalculationsAndRef<JSXParagraphElementInterface, HTMLParagraphElement, true>;
    param: WithCalculationsAndRef<JSXParamElementInterface, HTMLParamElement, false>;
    picture: WithCalculationsAndRef<JSXPictureElementInterface, HTMLPictureElement, true>;
    pre: WithCalculationsAndRef<JSXPreElementInterface, HTMLPreElement, true>;
    progress: WithCalculationsAndRef<JSXProgressElementInterface, HTMLProgressElement, true>;
    q: WithCalculationsAndRef<JSXQuoteElementInterface, HTMLQuoteElement, true>;
    rp: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    rt: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    ruby: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    s: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    samp: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    script: WithCalculationsAndRef<JSXScriptElementInterface, HTMLScriptElement, true>;
    section: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    select: WithCalculationsAndRef<JSXSelectElementInterface, HTMLSelectElement, true>;
    slot: WithCalculationsAndRef<JSXSlotElementInterface, HTMLSlotElement, true>;
    small: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    source: WithCalculationsAndRef<JSXSourceElementInterface, HTMLSourceElement, false>;
    span: WithCalculationsAndRef<JSXSpanElementInterface, HTMLSpanElement, true>;
    strong: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    style: WithCalculationsAndRef<JSXStyleElementInterface, HTMLStyleElement, true>;
    sub: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    summary: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    sup: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    table: WithCalculationsAndRef<JSXTableElementInterface, HTMLTableElement, true>;
    tbody: WithCalculationsAndRef<JSXTableSectionElementInterface, HTMLTableSectionElement, true>;
    td: WithCalculationsAndRef<JSXTableCellElementInterface, HTMLTableCellElement, true>;
    template: WithCalculationsAndRef<JSXTemplateElementInterface, HTMLTemplateElement, true>;
    textarea: WithCalculationsAndRef<JSXTextAreaElementInterface, HTMLTextAreaElement, true>;
    tfoot: WithCalculationsAndRef<JSXTableSectionElementInterface, HTMLTableSectionElement, true>;
    th: WithCalculationsAndRef<JSXTableCellElementInterface, HTMLTableCellElement, true>;
    thead: WithCalculationsAndRef<JSXTableSectionElementInterface, HTMLTableSectionElement, true>;
    time: WithCalculationsAndRef<JSXTimeElementInterface, HTMLTimeElement, true>;
    title: WithCalculationsAndRef<JSXTitleElementInterface, HTMLTitleElement, true>;
    tr: WithCalculationsAndRef<JSXTableRowElementInterface, HTMLTableRowElement, true>;
    track: WithCalculationsAndRef<JSXTrackElementInterface, HTMLTrackElement, false>;
    u: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    ul: WithCalculationsAndRef<JSXUListElementInterface, HTMLUListElement, true>;
    var: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    video: WithCalculationsAndRef<JSXVideoElementInterface, HTMLVideoElement, true>;
    wbr: WithCalculationsAndRef<JSXElementInterface, HTMLElement, false>;
}
export {};
//# sourceMappingURL=jsx.d.ts.map