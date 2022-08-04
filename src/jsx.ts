import { Calculation } from './calc';
import { Collection, View } from './collection';
import { RenderNode } from './rendernode';
import type { Ref } from './ref';

/**
 * The core type that can be used as a child or root of a JSX expression
 */
export type JSXNode =
    | string
    | number
    | boolean
    | null
    | undefined
    | bigint
    | symbol
    | Function
    | Element
    | RenderNode
    | JSXNodeCalculation
    | JSXNodeCollection
    | JSXNodeView
    | JSXNodeArray;

// The following interfaces are to allow for a recursive type alias: JSXNode

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JSXNodeCalculation extends Calculation<JSXNode> {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JSXNodeCollection extends Collection<JSXNode> {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JSXNodeView extends View<JSXNode, any> {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JSXNodeArray extends Array<JSXNode> {}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
        /**
         * The core type produced by a JSX expression
         */
        type Element = RenderNode;

        /**
         * The core type allowable as a child node in a JSX expression
         *
         * Note: this is not used by TypeScript internally and exported for convenience so you may type a component like:
         *
         *   const TakesExactlyOneChild: Component<{ children: JSX.Node }> = ({ children }) => (<div>{children}</div>);
         *
         */
        type Node = JSXNode;

        /**
         * The mapping of element name to intrinsic element path
         */
        interface IntrinsicElements extends KnownElements {
            [unknownElement: string]: any;
        }

        /**
         * The object property of children
         */
        interface ElementChildrenAttribute {
            children: {}; // specify children name to use
        }

        /**
         * Gooey does not support class components
         */
        type ElementClass = never;
    }
}

/*
 * Interfaces adopted from HTML Living Standard Last Updated 30 November 2021: https://html.spec.whatwg.org/
 */
function attrBooleanToEmptyString(
    val: boolean | undefined
): string | undefined {
    if (!val) return undefined;
    return '';
}
function attrStringOrNumberToNumber(
    val: string | number | undefined
): number | undefined {
    if (val === undefined) return undefined;
    return typeof val === 'number' ? val : parseInt(val);
}
function attrYesNo(val: '' | 'yes' | 'no' | undefined): boolean | undefined {
    if (val === undefined) return undefined;
    return val === 'no' ? false : true;
}

// Note: TypeScript has some notably missing IDL properties from its HTMLElement interface, this adds them in lieu of those properties:
interface MissingFromTypescriptHTMLElementProperties {
    // https://w3c.github.io/aria/#idl-reflection-attribute-values
    ariaColIndexText?: string | undefined;
    ariaInvalid?: string | undefined;
    ariaRowIndexText?: string | undefined;
    role?: string | undefined;

    // https://html.spec.whatwg.org/multipage/dom.html#htmlorsvgelement
    autofocus?: boolean | undefined;

    itemscope?: string | undefined;
}

// Note: TypeScript has some notably missing IDL properties from its HTMLDialog interface, this adds them in lieu of those properties:
interface MissingFromTypescriptHTMLDialogElementProperties {
    // https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element
    open?: boolean | undefined;
}

interface MissingFromTypescriptHTMLIframeElementProperties {
    // https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element
    loading?: LazyLoadingValue | undefined;
}

interface MissingFromTypescriptHTMLMetaElementProperties {
    // https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-media
    media?: string | undefined;
}

interface MissingFromTypescriptHTMLSourceElementProperties {
    // https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element
    width?: string | number | undefined;
    height?: string | number | undefined;
}

type PropertyMapField<TJSXField, TElement, TIDLName extends keyof TElement> =
    | {
          makeAttrValue?:
              | ((jsxAttr: Exclude<TJSXField, undefined>) => string | undefined)
              | null;
      }
    | {
          makeAttrValue?:
              | ((jsxAttr: Exclude<TJSXField, undefined>) => string | undefined)
              | null;
          idlName?: TIDLName | null;
          makeIdlValue?: (
              jsxAttr: Exclude<TJSXField, undefined>
          ) => TElement[TIDLName];
      };

type PropertyMap<TJSXElementInterface, TElement> = {
    [TJSXKey in keyof Required<TJSXElementInterface>]: PropertyMapField<
        TJSXElementInterface[TJSXKey],
        TElement,
        keyof TElement
    >;
};

// Note: abstract roles are **not** in this list, as "Authors MUST NOT use abstract roles in content"
type AriaRole =
    | 'alert'
    | 'alertdialog'
    | 'application'
    | 'article'
    | 'associationlist'
    | 'associationlistitemkey'
    | 'associationlistitemvalue'
    | 'banner'
    | 'blockquote'
    | 'button'
    | 'caption'
    | 'cell'
    | 'checkbox'
    | 'code'
    | 'columnheader'
    | 'combobox'
    | 'comment'
    | 'complementary'
    | 'contentinfo'
    | 'definition'
    | 'deletion'
    | 'dialog'
    | 'directory'
    | 'document'
    | 'emphasis'
    | 'feed'
    | 'figure'
    | 'form'
    | 'generic'
    | 'grid'
    | 'gridcell'
    | 'group'
    | 'heading'
    | 'img'
    | 'insertion'
    | 'link'
    | 'list'
    | 'listbox'
    | 'listitem'
    | 'log'
    | 'main'
    | 'mark'
    | 'marquee'
    | 'math'
    | 'menu'
    | 'menubar'
    | 'menuitem'
    | 'menuitemcheckbox'
    | 'menuitemradio'
    | 'meter'
    | 'navigation'
    | 'none'
    | 'note'
    | 'option'
    | 'paragraph'
    | 'presentation'
    | 'progressbar'
    | 'radio'
    | 'radiogroup'
    | 'region'
    | 'row'
    | 'rowgroup'
    | 'rowheader'
    | 'scrollbar'
    | 'search'
    | 'searchbox'
    | 'separator'
    | 'slider'
    | 'spinbutton'
    | 'status'
    | 'strong'
    | 'subscript'
    | 'suggestion'
    | 'superscript'
    | 'switch'
    | 'tab'
    | 'table'
    | 'tablist'
    | 'tabpanel'
    | 'term'
    | 'textbox'
    | 'time'
    | 'timer'
    | 'toolbar'
    | 'tooltip'
    | 'tree'
    | 'treegrid'
    | 'treeitem'
    | string;

type DirValue = 'ltr' | 'rtl' | 'auto' | string;

type BrowsingContextValue = '_blank' | '_self' | '_parent' | '_top' | string;

type ReferrerPolicyValue =
    | ''
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'same-origin'
    | 'origin'
    | 'strict-origin'
    | 'origin-when-cross-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url'
    | string;

type CrossOriginValue = 'anonymous' | '' | 'use-credentials';

type LazyLoadingValue = 'lazy' | 'eager' | string;

type ImageDecodingHintValue = 'sync' | 'async' | 'auto' | string;

type SandboxValue =
    | 'allow-forms'
    | 'allow-modals'
    | 'allow-orientation-lock'
    | 'allow-pointer-lock'
    | 'allow-popups'
    | 'allow-popups-to-escape-sandbox'
    | 'allow-presentation'
    | 'allow-same-origin'
    | 'allow-scripts'
    | 'allow-top-navigation'
    | 'allow-top-navigation-by-user-activation'
    | 'allow-downloads'
    | string;

type EncTypeValue =
    | 'application/x-www-form-urlencoded'
    | 'multipart/form-data'
    | 'text/plain'
    | string;

type FormMethodValue = 'get' | 'post' | 'dialog' | string;

type AutocompleteValue = 'on' | 'off' | string;

interface JSXElementInterface {
    /** a guide for creating a keyboard shortcut that activates or focuses the element */
    accesskey?: string | undefined;
    'aria-atomic'?: string | undefined; //  ariaAtomic
    'aria-autocomplete'?: string | undefined; //  ariaAutoComplete
    'aria-busy'?: string | undefined; //  ariaBusy
    'aria-checked'?: string | undefined; //  ariaChecked
    'aria-colcount'?: string | undefined; //  ariaColCount
    'aria-colindex'?: string | undefined; //  ariaColIndex
    'aria-colindextext'?: string | undefined; //  ariaColIndexText
    'aria-colspan'?: string | undefined; //  ariaColSpan
    'aria-current'?: string | undefined; //  ariaCurrent
    /*
     * Note: omitting aria-description, as it is still in consideration for ARIA 2.0: https://www.w3.org/WAI/ARIA/track/issues/411
    'aria-description'?: string | undefined; //  ariaDescription
    */
    'aria-disabled'?: string | undefined; //  ariaDisabled
    'aria-expanded'?: string | undefined; //  ariaExpanded
    'aria-haspopup'?: string | undefined; //  ariaHasPopup
    'aria-hidden'?: string | undefined; //  ariaHidden
    'aria-invalid'?: string | undefined; //  ariaInvalid
    'aria-keyshortcuts'?: string | undefined; //  ariaKeyShortcuts
    'aria-label'?: string | undefined; //  ariaLabel
    'aria-level'?: string | undefined; //  ariaLevel
    'aria-live'?: string | undefined; //  ariaLive
    'aria-modal'?: string | undefined; //  ariaModal
    'aria-multiline'?: string | undefined; //  ariaMultiLine
    'aria-multiselectable'?: string | undefined; //  ariaMultiSelectable
    'aria-orientation'?: string | undefined; //  ariaOrientation
    'aria-placeholder'?: string | undefined; //  ariaPlaceholder
    'aria-posinset'?: string | undefined; //  ariaPosInSet
    'aria-pressed'?: string | undefined; //  ariaPressed
    'aria-readonly'?: string | undefined; //  ariaReadOnly
    'aria-required'?: string | undefined; //  ariaRequired
    'aria-roledescription'?: string | undefined; //  ariaRoleDescription
    'aria-rowcount'?: string | undefined; //  ariaRowCount
    'aria-rowindex'?: string | undefined; //  ariaRowIndex
    'aria-rowindextext'?: string | undefined; //  ariaRowIndexText
    'aria-rowspan'?: string | undefined; //  ariaRowSpan
    'aria-selected'?: string | undefined; //  ariaSelected
    'aria-setsize'?: string | undefined; //  ariaSetSize
    'aria-sort'?: string | undefined; //  ariaSort
    'aria-valuemax'?: string | undefined; //  ariaValueMax
    'aria-valuemin'?: string | undefined; //  ariaValueMin
    'aria-valuenow'?: string | undefined; //  ariaValueNow
    'aria-valuetext'?: string | undefined; //  ariaValueText
    /** autocapitalization hint */
    autocapitalize?:
        | 'off'
        | 'none'
        | 'on'
        | 'sentences'
        | 'words'
        | 'characters'
        | string
        | undefined;
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
    enterkeyhint?:
        | 'enter'
        | 'done'
        | 'go'
        | 'next'
        | 'previous'
        | 'search'
        | 'send'
        | string
        | undefined;
    /** indicates that the element is not yet, or is no longer, directly relevant to the page's current state, or that it is being used to declare content to be reused by other parts of the page as opposed to being directly accessed by the user */
    hidden?: boolean | undefined;
    /** the unique id of the element */
    id?: string | undefined;
    inputmode?:
        | 'none'
        | 'text'
        | 'tel'
        | 'url'
        | 'email'
        | 'numeric'
        | 'decimal'
        | 'search'
        | string
        | undefined;
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
    tabindex?: -1 | 0 | '-1' | '0' | string | number | undefined; // "-1" and "0" used as convenience
    title?: string | undefined;
    translate?: '' | 'yes' | 'no' | undefined;
}

export const HTMLElementMap: PropertyMap<
    JSXElementInterface,
    HTMLElement & MissingFromTypescriptHTMLElementProperties
> = {
    accesskey: {
        idlName: 'accessKey',
    },
    'aria-atomic': {
        idlName: 'ariaAtomic',
    },
    'aria-autocomplete': {
        idlName: 'ariaAutoComplete',
    },
    'aria-busy': {
        idlName: 'ariaBusy',
    },
    'aria-checked': {
        idlName: 'ariaChecked',
    },
    'aria-colcount': {
        idlName: 'ariaColCount',
    },
    'aria-colindex': {
        idlName: 'ariaColIndex',
    },
    'aria-colindextext': {
        // Note: ariaColIndexText is not present on TypeScript's Element AriaMixin IDL, despite being present in https://www.w3.org/TR/wai-aria-1.2/
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Type '"ariaColIndexText"' is not assignable to type 'keyof HTMLElement'.
        idlName: 'ariaColIndexText',
    },
    'aria-colspan': {
        idlName: 'ariaColSpan',
    },
    'aria-current': {
        idlName: 'ariaCurrent',
    },
    /*
     * Note: omitting aria-description, as it is still in consideration for ARIA 2.0: https://www.w3.org/WAI/ARIA/track/issues/411
    'aria-description': {
        idlName: 'ariaDescription',
    },
    */
    'aria-disabled': {
        idlName: 'ariaDisabled',
    },
    'aria-expanded': {
        idlName: 'ariaExpanded',
    },
    'aria-haspopup': {
        idlName: 'ariaHasPopup',
    },
    'aria-hidden': {
        idlName: 'ariaHidden',
    },
    'aria-invalid': {
        // Note: ariaColIndexText is not present on TypeScript's Element AriaMixin IDL, despite being present in https://www.w3.org/TR/wai-aria-1.2/
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Type '"ariaInvalid"' is not assignable to type 'keyof HTMLElement'.
        idlName: 'ariaInvalid',
    },
    'aria-keyshortcuts': {
        idlName: 'ariaKeyShortcuts',
    },
    'aria-label': {
        idlName: 'ariaLabel',
    },
    'aria-level': {
        idlName: 'ariaLevel',
    },
    'aria-live': {
        idlName: 'ariaLive',
    },
    'aria-modal': {
        idlName: 'ariaModal',
    },
    'aria-multiline': {
        idlName: 'ariaMultiLine',
    },
    'aria-multiselectable': {
        idlName: 'ariaMultiSelectable',
    },
    'aria-orientation': {
        idlName: 'ariaOrientation',
    },
    'aria-placeholder': {
        idlName: 'ariaPlaceholder',
    },
    'aria-posinset': {
        idlName: 'ariaPosInSet',
    },
    'aria-pressed': {
        idlName: 'ariaPressed',
    },
    'aria-readonly': {
        idlName: 'ariaReadOnly',
    },
    'aria-required': {
        idlName: 'ariaRequired',
    },
    'aria-roledescription': {
        idlName: 'ariaRoleDescription',
    },
    'aria-rowcount': {
        idlName: 'ariaRowCount',
    },
    'aria-rowindex': {
        idlName: 'ariaRowIndex',
    },
    'aria-rowindextext': {
        // Note: ariaColIndexText is not present on TypeScript's Element AriaMixin IDL, despite being present in https://www.w3.org/TR/wai-aria-1.2/
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Type '"ariaColIndexText"' is not assignable to type 'keyof HTMLElement'.
        idlName: 'ariaRowIndexText',
    },
    'aria-rowspan': {
        idlName: 'ariaRowSpan',
    },
    'aria-selected': {
        idlName: 'ariaSelected',
    },
    'aria-setsize': {
        idlName: 'ariaSetSize',
    },
    'aria-sort': {
        idlName: 'ariaSort',
    },
    'aria-valuemax': {
        idlName: 'ariaValueMax',
    },
    'aria-valuemin': {
        idlName: 'ariaValueMin',
    },
    'aria-valuenow': {
        idlName: 'ariaValueNow',
    },
    'aria-valuetext': {
        idlName: 'ariaValueText',
    },
    autocapitalize: {},
    autofocus: {
        // Note: The "autofocus" property exists in HTMLElement interface: https://html.spec.whatwg.org/multipage/dom.html#htmlorsvgelement
    },
    class: {
        idlName: 'className',
    },
    contenteditable: {
        idlName: 'contentEditable',
    },
    dir: {},
    draggable: {},
    enterkeyhint: {
        idlName: 'enterKeyHint',
    },
    hidden: {},
    id: {},
    inputmode: {
        idlName: 'inputMode',
    },
    is: { idlName: null },
    itemid: { idlName: null },
    itemprop: { idlName: null },
    itemref: { idlName: null },
    itemscope: { idlName: null },
    itemtype: { idlName: null },
    lang: {},
    nonce: {},
    role: {},
    slot: {},
    spellcheck: {},
    style: {},
    tabindex: {
        idlName: 'tabIndex',
        makeIdlValue: attrStringOrNumberToNumber,
    },
    title: {},
    translate: {
        makeIdlValue: attrYesNo,
    },
};

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

const HTMLAnchorElementMap: PropertyMap<
    JSXAnchorElementInterface,
    HTMLAnchorElement
> = {
    ...HTMLElementMap,
    href: {},
    target: {},
    download: {},
    ping: {},
    rel: {},
    hreflang: {},
    type: {},
    referrerpolicy: {
        idlName: 'referrerPolicy',
    },
};

interface JSXAreaElementInterface extends JSXElementInterface {
    alt?: string | undefined;
    coords?: string | undefined;
    shape?:
        | 'circle'
        | 'circ'
        | 'default'
        | 'poly'
        | 'polygon'
        | 'rect'
        | 'rectangle'
        | string
        | undefined;
    href?: string | undefined;
    target?: BrowsingContextValue | undefined;
    download?: string | undefined;
    ping?: string | undefined;
    rel?: string | undefined;
    referrerpolicy?: ReferrerPolicyValue | undefined;
}

const HTMLAreaElementMap: PropertyMap<
    JSXAreaElementInterface,
    HTMLAreaElement
> = {
    ...HTMLElementMap,
    alt: {},
    coords: {},
    shape: {},
    href: {},
    target: {},
    download: {},
    ping: {},
    rel: {},
    referrerpolicy: {
        idlName: 'referrerPolicy',
    },
};

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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXAudioElementInterface extends JSXMediaElementInterface {}

const HTMLAudioElementMap: PropertyMap<
    JSXAudioElementInterface,
    HTMLAudioElement
> = {
    ...HTMLElementMap,
    src: {},
    crossorigin: {
        idlName: 'crossOrigin',
    },
    preload: {},
    autoplay: {},
    loop: {
        makeIdlValue: attrBooleanToEmptyString,
    },
    muted: {},
    controls: {},
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXBRElementInterface extends JSXElementInterface {}

const HTMLBRElementMap: PropertyMap<JSXBRElementInterface, HTMLBRElement> = {
    ...HTMLElementMap,
};

interface JSXBaseElementInterface extends JSXElementInterface {
    href?: string | undefined;
    target?: BrowsingContextValue | undefined;
}

const HTMLBaseElementMap: PropertyMap<
    JSXBaseElementInterface,
    HTMLBaseElement
> = {
    ...HTMLElementMap,
    href: {},
    target: {},
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXBodyElementInterface extends JSXElementInterface {}

const HTMLBodyElementMap: PropertyMap<
    JSXBodyElementInterface,
    HTMLBodyElement
> = {
    ...HTMLElementMap,
};

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

const HTMLButtonElementMap: PropertyMap<
    JSXButtonElementInterface,
    HTMLButtonElement
> = {
    ...HTMLElementMap,
    disabled: {},
    form: { idlName: null }, // Note: form IDL not ever written
    formaction: {
        idlName: 'formAction',
    },
    formenctype: {
        idlName: 'formEnctype',
    },
    formmethod: {
        idlName: 'formMethod',
    },
    formnovalidate: {
        idlName: 'formNoValidate',
    },
    formtarget: {
        idlName: 'formTarget',
    },
    name: {},
    type: {},
    value: {},
};

interface JSXCanvasElementInterface extends JSXElementInterface {
    width?: string | number | undefined;
    height?: string | number | undefined;
}

const HTMLCanvasElementMap: PropertyMap<
    JSXCanvasElementInterface,
    HTMLCanvasElement
> = {
    ...HTMLElementMap,
    width: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    height: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXDListElementInterface extends JSXElementInterface {}

const HTMLDListElementMap: PropertyMap<
    JSXDListElementInterface,
    HTMLDListElement
> = {
    ...HTMLElementMap,
};

interface JSXDataElementInterface extends JSXElementInterface {
    value?: string | undefined;
}

const HTMLDataElementMap: PropertyMap<
    JSXDataElementInterface,
    HTMLDataElement
> = {
    ...HTMLElementMap,
    value: {},
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXDataListElementInterface extends JSXElementInterface {}

const HTMLDataListElementMap: PropertyMap<
    JSXDataListElementInterface,
    HTMLDataListElement
> = {
    ...HTMLElementMap,
};

interface JSXDetailsElementInterface extends JSXElementInterface {
    open?: boolean | undefined;
}

const HTMLDetailsElementMap: PropertyMap<
    JSXDetailsElementInterface,
    HTMLDetailsElement
> = {
    ...HTMLElementMap,
    open: {},
};

interface JSXDialogElementInterface extends JSXElementInterface {
    open?: boolean | undefined;
}

const HTMLDialogElementMap: PropertyMap<
    JSXDialogElementInterface,
    HTMLDialogElement & MissingFromTypescriptHTMLDialogElementProperties
> = {
    ...HTMLElementMap,
    open: {},
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXDivElementInterface extends JSXElementInterface {}

const HTMLDivElementMap: PropertyMap<JSXDivElementInterface, HTMLDivElement> = {
    ...HTMLElementMap,
};

interface JSXEmbedElementInterface extends JSXElementInterface {
    src?: string | undefined;
    type?: string | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
}

const HTMLEmbedElementMap: PropertyMap<
    JSXEmbedElementInterface,
    HTMLEmbedElement
> = {
    ...HTMLElementMap,
    src: {},
    type: {},
    width: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    height: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
};

interface JSXFieldSetElementInterface extends JSXElementInterface {
    disabled?: boolean | undefined;
    form?: string | undefined;
    name?: string | undefined;
}

const HTMLFieldSetElementMap: PropertyMap<
    JSXFieldSetElementInterface,
    HTMLFieldSetElement
> = {
    ...HTMLElementMap,
    disabled: {},
    form: { idlName: null }, // form IDL not ever written
    name: {},
};

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

const HTMLFormElementMap: PropertyMap<
    JSXFormElementInterface,
    HTMLFormElement
> = {
    ...HTMLElementMap,
    'accept-charset': {
        idlName: 'acceptCharset',
    },
    action: {},
    autocomplete: {},
    enctype: {},
    method: {},
    name: {},
    novalidate: {
        idlName: 'noValidate',
    },
    target: {},
    rel: {},
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXHeadingElementInterface extends JSXElementInterface {}

const HTMLHeadingElementMap: PropertyMap<
    JSXHeadingElementInterface,
    HTMLHeadingElement
> = {
    ...HTMLElementMap,
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXHeadElementInterface extends JSXElementInterface {}

const HTMLHeadElementMap: PropertyMap<
    JSXHeadElementInterface,
    HTMLHeadElement
> = {
    ...HTMLElementMap,
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXHRElementInterface extends JSXElementInterface {}

const HTMLHRElementMap: PropertyMap<JSXHRElementInterface, HTMLHRElement> = {
    ...HTMLElementMap,
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXHtmlElementInterface extends JSXElementInterface {}

const HTMLHtmlElementMap: PropertyMap<
    JSXHtmlElementInterface,
    HTMLHtmlElement
> = {
    ...HTMLElementMap,
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXIFrameElementInterface extends JSXElementInterface {
    /** Address of the resource */
    src?: string | undefined;
    /** A document to render in the iframe */
    srcdoc?: string | undefined;
    /** Name of nested browsing context */
    name?: string | undefined;
    /** Security rules for nested content */
    sandbox?: SandboxValue | undefined; // TODO: This _could_ be a SandboxValue[], but feels awkward
    /** Permissions policy to be applied to the iframe's contents */
    allow?: string | undefined;
    /** Whether to allow the iframe's contents to use requestFullscreen() */
    allowfullscreen?: boolean | undefined;
    /** Horizontal dimension */
    width?: string | number | undefined;
    /** Vertical dimension */
    height?: string | number | undefined;
    /** Referrer policy for fetches initiated by the element */
    referrerpolicy?: ReferrerPolicyValue | undefined;
    /** Used when determining loading deferral */
    loading?: LazyLoadingValue | undefined;
}

const HTMLIFrameElementMap: PropertyMap<
    JSXIFrameElementInterface,
    HTMLIFrameElement & MissingFromTypescriptHTMLIframeElementProperties
> = {
    ...HTMLElementMap,
    src: {},
    srcdoc: {},
    name: {},
    sandbox: {},
    allow: {},
    allowfullscreen: {
        idlName: 'allowFullscreen',
    },
    width: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    height: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    referrerpolicy: {
        idlName: 'referrerPolicy',
    },
    loading: {},
};

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
    width?: string | number | undefined;
    /** Vertical dimension */
    height?: string | number | undefined;
    /** Referrer policy for fetches initiated by the element */
    referrerpolicy?: ReferrerPolicyValue | undefined;
    /** Decoding hint to use when processing this image for presentation */
    decoding?: ImageDecodingHintValue | undefined;
    /** Used when determining loading deferral */
    loading?: LazyLoadingValue | undefined;
}

const HTMLImageElementMap: PropertyMap<
    JSXImageElementInterface,
    HTMLImageElement
> = {
    ...HTMLElementMap,
    alt: {},
    src: {},
    srcset: {},
    sizes: {},
    crossorigin: {
        idlName: 'crossOrigin',
    },
    usemap: {
        idlName: 'useMap',
    },
    ismap: {
        idlName: 'isMap',
    },
    width: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    height: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    referrerpolicy: {
        idlName: 'referrerPolicy',
    },
    decoding: {},
    loading: {},
};

type FormInputTypeValues =
    | 'button'
    | 'checkbox'
    | 'color'
    | 'date'
    | 'datetime-local'
    | 'email'
    | 'file'
    | 'hidden'
    | 'image'
    | 'month'
    | 'number'
    | 'password'
    | 'radio'
    | 'range'
    | 'reset'
    | 'search'
    | 'submit'
    | 'tel'
    | 'text'
    | 'time'
    | 'url'
    | 'week'
    | string;

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
    height?: string | number | undefined;
    /** Third, indeterminate state for checkboxes */
    indeterminate?: boolean | undefined;
    /** List of autocomplete options */
    list?: string | undefined;
    /** Maximum value */
    max?: string | number | undefined;
    /** Maximum length of value */
    maxlength?: string | number | undefined;
    /** Minimum value */
    min?: string | number | undefined;
    /** Minimum length of value */
    minlength?: string | number | undefined;
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
    size?: string | number | undefined;
    /** Address of the resource */
    src?: string | undefined;
    /** Granularity to be matched by the form control's value */
    step?: string | number | undefined;
    /** Type of form control */
    type?: FormInputTypeValues | undefined;
    /** Value of the form control */
    value?: string | undefined;
    /** Horizontal dimension */
    width?: string | number | undefined;
}
const HTMLInputElementMap: PropertyMap<
    JSXInputElementInterface,
    HTMLInputElement
> = {
    ...HTMLElementMap,
    accept: {},
    alt: {},
    autocomplete: {},
    checked: {},
    dirname: {
        idlName: 'dirName',
    },
    disabled: {},
    form: {},
    formaction: {
        idlName: 'formAction',
    },
    formenctype: {
        idlName: 'formEnctype',
    },
    formmethod: {
        idlName: 'formMethod',
    },
    formnovalidate: {
        idlName: 'formNoValidate',
    },
    formtarget: {
        idlName: 'formTarget',
    },
    height: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    indeterminate: {
        makeAttrValue: null, // TODO: what other IDL attributes don't set html attributes?
    },
    list: {},
    max: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    maxlength: {
        idlName: 'maxLength',
        makeIdlValue: attrStringOrNumberToNumber,
    },
    min: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    minlength: {
        idlName: 'minLength',
        makeIdlValue: attrStringOrNumberToNumber,
    },
    multiple: {},
    name: {},
    pattern: {},
    placeholder: {},
    readonly: {
        idlName: 'readOnly',
    },
    required: {},
    size: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    src: {},
    step: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    type: {},
    value: {},
    width: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
};

interface JSXModElementInterface extends JSXElementInterface {
    /** Link to the source of the quotation or more information about the edit */
    cite?: string | undefined;
    /** Date and (optionally) time of the change */
    datetime?: string | undefined;
}

const HTMLModElementMap: PropertyMap<JSXModElementInterface, HTMLModElement> = {
    ...HTMLElementMap,
    cite: {},
    datetime: {
        idlName: 'dateTime',
    },
};

interface JSXLabelElementInterface extends JSXElementInterface {
    /** Associate the label with form control */
    for?: string | undefined;
}

const HTMLLabelElementMap: PropertyMap<
    JSXLabelElementInterface,
    HTMLLabelElement
> = {
    ...HTMLElementMap,
    for: {
        idlName: 'htmlFor',
    },
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXLegendElementInterface extends JSXElementInterface {}

const HTMLLegendElementMap: PropertyMap<
    JSXLegendElementInterface,
    HTMLLegendElement
> = {
    ...HTMLElementMap,
};

interface JSXLIElementInterface extends JSXElementInterface {
    /** Ordinal value of the list item */
    value?: string | undefined;
}

const HTMLLIElementMap: PropertyMap<JSXLIElementInterface, HTMLLIElement> = {
    ...HTMLElementMap,
    value: {},
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
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

const HTMLLinkElementMap: PropertyMap<
    JSXLinkElementInterface,
    HTMLLinkElement
> = {
    ...HTMLElementMap,
    href: {},
    crossorigin: {
        idlName: 'crossOrigin',
    },
    rel: {},
    media: {},
    integrity: {},
    hreflang: {},
    type: {},
    referrerpolicy: {
        idlName: 'referrerPolicy',
    },
    sizes: {},
    imagesrcset: {
        idlName: 'imageSrcset',
    },
    imagesizes: {
        idlName: 'imageSizes',
    },
    as: {},
    color: {
        idlName: null, // TODO: confirm
    },
    disabled: {},
};

interface JSXMapElementInterface extends JSXElementInterface {
    /** Name of image map to reference from the usemap attribute */
    name?: string | undefined;
}

const HTMLMapElementMap: PropertyMap<JSXMapElementInterface, HTMLMapElement> = {
    ...HTMLElementMap,
    name: {},
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXMenuElementInterface extends JSXElementInterface {}

const HTMLMenuElementMap: PropertyMap<
    JSXMenuElementInterface,
    HTMLMenuElement
> = {
    ...HTMLElementMap,
};

interface JSXMetaElementInterface extends JSXElementInterface {
    /** Metadata name */
    name?:
        | 'application-name'
        | 'author'
        | 'description'
        | 'generator'
        | 'keywords'
        | 'referrer'
        | 'theme-color'
        | 'color-scheme'
        | string
        | undefined;
    /** Pragma directive */
    'http-equiv'?: string | undefined;
    /** Value of the element */
    content?: string | undefined;
    /** Character encoding declaration */
    charset?: string | undefined;
    /** Applicable media */
    media?: string | undefined;
}

const HTMLMetaElementMap: PropertyMap<
    JSXMetaElementInterface,
    HTMLMetaElement & MissingFromTypescriptHTMLMetaElementProperties
> = {
    ...HTMLElementMap,
    name: {},
    'http-equiv': {
        idlName: 'httpEquiv',
    },
    content: {},
    charset: {
        idlName: null, // TODO: confirm
    },
    media: {},
};

interface JSXMeterElementInterface extends JSXElementInterface {
    /** Current value of the element */
    value?: string | number | undefined;
    /** Lower bound of range */
    min?: string | number | undefined;
    /** Upper bound of range */
    max?: string | number | undefined;
    /** High limit of low range */
    low?: string | number | undefined;
    /** Low limit of high range */
    high?: string | number | undefined;
    /** Optimum value in gauge */
    optimum?: string | number | undefined;
}

const HTMLMeterElementMap: PropertyMap<
    JSXMeterElementInterface,
    HTMLMeterElement
> = {
    ...HTMLElementMap,
    value: {
        // <meter> is special and has a numeric value
        makeIdlValue: attrStringOrNumberToNumber,
    },
    min: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    max: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    low: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    high: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    optimum: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
};

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

const HTMLObjectElementMap: PropertyMap<
    JSXObjectElementInterface,
    HTMLObjectElement
> = {
    ...HTMLElementMap,
    data: {},
    type: {},
    name: {},
    form: {
        idlName: null,
    },
    width: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    height: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
};

interface JSXOListElementInterface extends JSXElementInterface {
    /** Number the list backwards */
    reversed?: boolean | undefined;
    /** Starting value of the list */
    start?: string | number | undefined;
    /** Kind of list marker */
    type?:
        | 'decimal'
        | 'lower-alpha'
        | 'upper-alpha'
        | 'lower-roman'
        | 'upper-roman'
        | string
        | undefined;
}

const HTMLOListElementMap: PropertyMap<
    JSXOListElementInterface,
    HTMLOListElement
> = {
    ...HTMLElementMap,
    reversed: {},
    start: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    type: {},
};

interface JSXOptGroupElementInterface extends JSXElementInterface {
    /** Whether the form control is disabled */
    disabled?: boolean | undefined;
    /** User-visible label */
    label?: string | undefined;
}

const HTMLOptGroupElementMap: PropertyMap<
    JSXOptGroupElementInterface,
    HTMLOptGroupElement
> = {
    ...HTMLElementMap,
    disabled: {},
    label: {},
};

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

const HTMLOptionElementMap: PropertyMap<
    JSXOptionElementInterface,
    HTMLOptionElement
> = {
    ...HTMLElementMap,
    disabled: {},
    label: {},
    selected: {},
    value: {},
};

interface JSXOutputElementInterface extends JSXElementInterface {
    /** Specifies controls from which the output was calculated */
    for?: string | undefined;
    /** Associates the element with a form element */
    form?: string | undefined;
    /** Name of the element to use in the form.elements API. */
    name?: string | undefined;
}

const HTMLOutputElementMap: PropertyMap<
    JSXOutputElementInterface,
    HTMLOutputElement
> = {
    ...HTMLElementMap,
    for: {
        idlName: 'htmlFor',
    },
    form: { idlName: null },
    name: {},
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXParagraphElementInterface extends JSXElementInterface {}

const HTMLParagraphElementMap: PropertyMap<
    JSXParagraphElementInterface,
    HTMLParagraphElement
> = {
    ...HTMLElementMap,
};

interface JSXParamElementInterface extends JSXElementInterface {
    /** Name of parameter */
    name?: string | undefined;
    /** Value of parameter */
    value?: string | undefined;
}

const HTMLParamElementMap: PropertyMap<
    JSXParamElementInterface,
    HTMLParamElement
> = {
    ...HTMLElementMap,
    name: {},
    value: {},
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXPictureElementInterface extends JSXElementInterface {}

const HTMLPictureElementMap: PropertyMap<
    JSXPictureElementInterface,
    HTMLPictureElement
> = {
    ...HTMLElementMap,
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXPreElementInterface extends JSXElementInterface {}

const HTMLPreElementMap: PropertyMap<JSXPreElementInterface, HTMLPreElement> = {
    ...HTMLElementMap,
};

interface JSXProgressElementInterface extends JSXElementInterface {
    /** Current value of the element */
    value?: string | number | undefined;
    /** Upper bound of range */
    max?: string | number | undefined;
}

const HTMLProgressElementMap: PropertyMap<
    JSXProgressElementInterface,
    HTMLProgressElement
> = {
    ...HTMLElementMap,
    value: {
        // <progress> is special and has a numeric value
        makeIdlValue: attrStringOrNumberToNumber,
    },
    max: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
};

interface JSXQuoteElementInterface extends JSXElementInterface {
    /** Link to the source of the quotation or more information about the edit */
    cite?: string | undefined;
}

const HTMLQuoteElementMap: PropertyMap<
    JSXQuoteElementInterface,
    HTMLQuoteElement
> = {
    ...HTMLElementMap,
    cite: {},
};

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

const HTMLScriptElementMap: PropertyMap<
    JSXScriptElementInterface,
    HTMLScriptElement
> = {
    ...HTMLElementMap,
    src: {},
    type: {},
    nomodule: {
        idlName: 'noModule',
    },
    async: {},
    defer: {},
    crossorigin: {
        idlName: 'crossOrigin',
    },
    integrity: {},
    referrerpolicy: {
        idlName: 'referrerPolicy',
    },
};

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
    size?: string | number | undefined;
    /** Value of the element */
    value?: string | undefined;
}

const HTMLSelectElementMap: PropertyMap<
    JSXSelectElementInterface,
    HTMLSelectElement
> = {
    ...HTMLElementMap,
    autocomplete: {},
    disabled: {},
    form: { idlName: null },
    multiple: {},
    name: {},
    required: {},
    size: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    value: { makeAttrValue: null },
};

interface JSXSlotElementInterface extends JSXElementInterface {
    /** Name of shadow tree slot */
    name?: string | undefined;
}

const HTMLSlotElementMap: PropertyMap<
    JSXSlotElementInterface,
    HTMLSlotElement
> = {
    ...HTMLElementMap,
    name: {},
};

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
    width?: string | number | undefined;
    /** (in picture) — Vertical dimension */
    height?: string | number | undefined;
}

const HTMLSourceElementMap: PropertyMap<
    JSXSourceElementInterface,
    HTMLSourceElement & MissingFromTypescriptHTMLSourceElementProperties
> = {
    ...HTMLElementMap,
    type: {},
    src: {},
    srcset: {},
    sizes: {},
    media: {},
    width: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    height: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXSpanElementInterface extends JSXElementInterface {}

const HTMLSpanElementMap: PropertyMap<
    JSXSpanElementInterface,
    HTMLSpanElement
> = {
    ...HTMLElementMap,
};

interface JSXStyleElementInterface extends JSXElementInterface {
    /** Applicable media */
    media?: string | undefined;
}

const HTMLStyleElementMap: PropertyMap<
    JSXStyleElementInterface,
    HTMLStyleElement
> = {
    ...HTMLElementMap,
    media: {},
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXTableElementInterface extends JSXElementInterface {}

const HTMLTableElementMap: PropertyMap<
    JSXTableElementInterface,
    HTMLTableElement
> = {
    ...HTMLElementMap,
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXTableCaptionElementInterface extends JSXElementInterface {}

const HTMLTableCaptionElementMap: PropertyMap<
    JSXTableCaptionElementInterface,
    HTMLTableCaptionElement
> = {
    ...HTMLElementMap,
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXTableSectionElementInterface extends JSXElementInterface {}

const HTMLTableSectionElementMap: PropertyMap<
    JSXTableSectionElementInterface,
    HTMLTableSectionElement
> = {
    ...HTMLElementMap,
};

interface JSXTableCellElementInterface extends JSXElementInterface {
    /** Number of columns that the cell is to span */
    colspan?: string | number | undefined;
    /** Number of rows that the cell is to span */
    rowspan?: string | number | undefined;
    /** The header cells for this cell */
    headers?: string | undefined;
}

const HTMLTableCellElementMap: PropertyMap<
    JSXTableCellElementInterface,
    HTMLTableCellElement
> = {
    ...HTMLElementMap,
    colspan: {
        idlName: 'colSpan',
        makeIdlValue: attrStringOrNumberToNumber,
    },
    rowspan: {
        idlName: 'rowSpan',
        makeIdlValue: attrStringOrNumberToNumber,
    },
    headers: {},
};

interface JSXTableHeaderElementInterface extends JSXTableCellElementInterface {
    /** Specifies which cells the header cell applies to */
    scope?: string | undefined;

    /** Alternative label to use for the header cell when referencing the cell in other contexts */
    abbr?: string | undefined;
}

const HTMLTableHeaderElementMap: PropertyMap<
    JSXTableHeaderElementInterface,
    HTMLTableCellElement
> = {
    ...HTMLTableCellElementMap,
    scope: {},
    abbr: {},
};

interface JSXTableColElementInterface extends JSXElementInterface {
    /** Number of columns spanned by the element */
    span?: string | number | undefined;
}

const HTMLTableColElementMap: PropertyMap<
    JSXTableColElementInterface,
    HTMLTableColElement
> = {
    ...HTMLElementMap,
    span: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXTemplateElementInterface extends JSXElementInterface {}

const HTMLTemplateElementMap: PropertyMap<
    JSXTemplateElementInterface,
    HTMLTemplateElement
> = {
    ...HTMLElementMap,
};

interface JSXTextAreaElementInterface extends JSXElementInterface {
    /** Hint for form autofill feature */
    autocomplete?: AutocompleteValue | undefined;
    /** Maximum number of characters per line */
    cols?: string | number | undefined;
    /** Name of form control to use for sending the element's directionality in form submission */
    dirname?: DirValue | undefined;
    /** Whether the form control is disabled */
    disabled?: boolean | undefined;
    /** Associates the element with a form element */
    form?: string | undefined;
    /** Maximum length of value */
    maxlength?: string | number | undefined;
    /** Minimum length of value */
    minlength?: string | number | undefined;
    /** Name of the element to use for form submission and in the form.elements API */
    name?: string | undefined;
    /** User-visible label to be placed within the form control */
    placeholder?: string | undefined;
    /** Whether to allow the value to be edited by the user */
    readonly?: boolean | undefined;
    /** Whether the control is required for form submission */
    required?: boolean | undefined;
    /** Number of lines to show */
    rows?: string | number | undefined;
    /** How the value of the form control is to be wrapped for form submission */
    wrap?: 'soft' | 'hard' | string | undefined;
}

const HTMLTextAreaElementMap: PropertyMap<
    JSXTextAreaElementInterface,
    HTMLTextAreaElement
> = {
    ...HTMLElementMap,
    autocomplete: {},
    cols: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    dirname: {
        idlName: 'dirName',
    },
    disabled: {},
    form: { idlName: null },
    maxlength: {
        idlName: 'maxLength',
        makeIdlValue: attrStringOrNumberToNumber,
    },
    minlength: {
        idlName: 'minLength',
        makeIdlValue: attrStringOrNumberToNumber,
    },
    name: {},
    placeholder: {},
    readonly: {
        idlName: 'readOnly',
    },
    required: {},
    rows: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    wrap: {},
};

interface JSXTimeElementInterface extends JSXElementInterface {
    /** Machine-readable value */
    datetime?: string | undefined;
}

const HTMLTimeElementMap: PropertyMap<
    JSXTimeElementInterface,
    HTMLTimeElement
> = {
    ...HTMLElementMap,
    datetime: {
        idlName: 'dateTime',
    },
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXTitleElementInterface extends JSXElementInterface {}

const HTMLTitleElementMap: PropertyMap<
    JSXTitleElementInterface,
    HTMLTitleElement
> = {
    ...HTMLElementMap,
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXTableRowElementInterface extends JSXElementInterface {}

const HTMLTableRowElementMap: PropertyMap<
    JSXTableRowElementInterface,
    HTMLTableRowElement
> = {
    ...HTMLElementMap,
};

interface JSXTrackElementInterface extends JSXElementInterface {
    /** The type of text track */
    kind?:
        | 'subtitles'
        | 'captions'
        | 'descriptions'
        | 'chapters'
        | 'metadata'
        | string
        | undefined;
    /** Address of the resource */
    src?: string | undefined;
    /** Language of the text track */
    srclang?: string | undefined;
    /** User-visible label */
    label?: string | undefined;
    /** Enable the track if no other text track is more suitable */
    default?: boolean | undefined;
}

const HTMLTrackElementMap: PropertyMap<
    JSXTrackElementInterface,
    HTMLTrackElement
> = {
    ...HTMLElementMap,
    kind: {},
    src: {},
    srclang: {},
    label: {},
    default: {},
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXUListElementInterface extends JSXElementInterface {}

const HTMLUListElementMap: PropertyMap<
    JSXUListElementInterface,
    HTMLUListElement
> = {
    ...HTMLElementMap,
};

interface JSXVideoElementInterface extends JSXMediaElementInterface {
    /** Poster frame to show prior to video playback */
    poster?: string | undefined;
    /** Encourage the user agent to display video content within the element's playback area */
    playsinline?: string | undefined;
    /** Horizontal dimension */
    width?: string | number | undefined;
    /** Vertical dimension */
    height?: string | number | undefined;
}

const HTMLVideoElementMap: PropertyMap<
    JSXVideoElementInterface,
    HTMLVideoElement
> = {
    ...HTMLElementMap,
    src: {},
    crossorigin: {
        idlName: 'crossOrigin',
    },
    preload: {},
    autoplay: {},
    loop: {
        makeIdlValue: attrBooleanToEmptyString,
    },
    muted: {},
    controls: {},
    poster: {},
    playsinline: {
        idlName: 'playsInline',
    },
    width: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
    height: {
        makeIdlValue: attrStringOrNumberToNumber,
    },
};

export const ElementTypeMapping = {
    a: HTMLAnchorElementMap,
    abbr: HTMLElementMap,
    address: HTMLElementMap,
    area: HTMLAreaElementMap,
    article: HTMLElementMap,
    aside: HTMLElementMap,
    audio: HTMLAudioElementMap,
    b: HTMLElementMap,
    base: HTMLBaseElementMap,
    bdi: HTMLElementMap,
    bdo: HTMLElementMap,
    blockquote: HTMLElementMap,
    body: HTMLBodyElementMap,
    br: HTMLBRElementMap,
    button: HTMLButtonElementMap,
    canvas: HTMLCanvasElementMap,
    caption: HTMLTableCaptionElementMap,
    cite: HTMLElementMap,
    code: HTMLElementMap,
    col: HTMLTableColElementMap,
    colgroup: HTMLTableColElementMap,
    data: HTMLDataElementMap,
    datalist: HTMLDataListElementMap,
    dd: HTMLElementMap,
    del: HTMLModElementMap,
    details: HTMLDetailsElementMap,
    dfn: HTMLElementMap,
    dialog: HTMLDialogElementMap,
    div: HTMLDivElementMap,
    dl: HTMLDListElementMap,
    dt: HTMLElementMap,
    em: HTMLElementMap,
    embed: HTMLEmbedElementMap,
    fieldset: HTMLFieldSetElementMap,
    figcaption: HTMLElementMap,
    figure: HTMLElementMap,
    footer: HTMLElementMap,
    form: HTMLFormElementMap,
    h1: HTMLElementMap,
    h2: HTMLElementMap,
    h3: HTMLElementMap,
    h4: HTMLElementMap,
    h5: HTMLElementMap,
    h6: HTMLElementMap,
    head: HTMLHeadElementMap,
    header: HTMLElementMap,
    heading: HTMLHeadingElementMap,
    hgroup: HTMLElementMap,
    hr: HTMLHRElementMap,
    html: HTMLHtmlElementMap,
    i: HTMLElementMap,
    iframe: HTMLIFrameElementMap,
    img: HTMLImageElementMap,
    input: HTMLInputElementMap,
    ins: HTMLModElementMap,
    kbd: HTMLElementMap,
    label: HTMLLabelElementMap,
    legend: HTMLLegendElementMap,
    li: HTMLLIElementMap,
    link: HTMLLinkElementMap,
    main: HTMLElementMap,
    map: HTMLMapElementMap,
    mark: HTMLElementMap,
    menu: HTMLMenuElementMap,
    meta: HTMLMetaElementMap,
    meter: HTMLMeterElementMap,
    nav: HTMLElementMap,
    noscript: HTMLElementMap,
    object: HTMLObjectElementMap,
    ol: HTMLOListElementMap,
    optgroup: HTMLOptGroupElementMap,
    option: HTMLOptionElementMap,
    output: HTMLOutputElementMap,
    p: HTMLParagraphElementMap,
    param: HTMLParamElementMap,
    picture: HTMLPictureElementMap,
    pre: HTMLPreElementMap,
    progress: HTMLProgressElementMap,
    quote: HTMLQuoteElementMap,
    rp: HTMLElementMap,
    rt: HTMLElementMap,
    ruby: HTMLElementMap,
    s: HTMLElementMap,
    samp: HTMLElementMap,
    script: HTMLScriptElementMap,
    section: HTMLElementMap,
    select: HTMLSelectElementMap,
    slot: HTMLSlotElementMap,
    small: HTMLElementMap,
    source: HTMLSourceElementMap,
    span: HTMLSpanElementMap,
    strong: HTMLElementMap,
    style: HTMLStyleElementMap,
    sub: HTMLElementMap,
    summary: HTMLElementMap,
    sup: HTMLElementMap,
    table: HTMLTableElementMap,
    tbody: HTMLTableSectionElementMap,
    td: HTMLTableCellElementMap,
    template: HTMLTemplateElementMap,
    textarea: HTMLTextAreaElementMap,
    tfoot: HTMLTableSectionElementMap,
    th: HTMLTableHeaderElementMap,
    thead: HTMLTableSectionElementMap,
    time: HTMLTimeElementMap,
    title: HTMLTitleElementMap,
    tr: HTMLTableRowElementMap,
    track: HTMLTrackElementMap,
    u: HTMLElementMap,
    ul: HTMLUListElementMap,
    var: HTMLElementMap,
    video: HTMLVideoElementMap,
    wbr: HTMLElementMap,
} as const;

// TODO: maybe typecheck this?
interface ElementTypeMappingField {
    makeAttrValue?: (jsxAttr: any) => string | undefined;
    idlName?: any;
    makeIdlValue?: (jsxAttr: any) => any;
}

// TODO: maybe typecheck this?
export function getElementTypeMapping(
    elementName: string,
    property: string
): ElementTypeMappingField {
    return (ElementTypeMapping as any)[elementName]?.[property];
}

/**
 * Good old bivarianceHack to allow assignability of specific event handlers to more generic event handlers :facepalm:
 */
type EventHandler<TEvent extends Event, TElement extends Element> =
    | undefined
    | {
          bivarianceHack(event: TEvent, target: TElement): void;
      }['bivarianceHack'];

interface JSXRefProps<TElement extends Element> {
    ref?: undefined | Ref<TElement>;
}

interface JSXAttrProps {
    [key: `attr:${string}`]: Calculation<any> | any;
    [key: `prop:${string}`]: Calculation<any> | any;
}

interface JSXEventProps<TElement extends Element> {
    'on:abort'?: EventHandler<Event, TElement>;
    'on:passive:abort'?: EventHandler<Event, TElement>;
    'on:capture:abort'?: EventHandler<Event, TElement>;
    'on:auxclick'?: EventHandler<PointerEvent, TElement>;
    'on:passive:auxclick'?: EventHandler<PointerEvent, TElement>;
    'on:capture:auxclick'?: EventHandler<PointerEvent, TElement>;
    'on:beforeinput'?: EventHandler<InputEvent, TElement>;
    'on:passive:beforeinput'?: EventHandler<InputEvent, TElement>;
    'on:capture:beforeinput'?: EventHandler<InputEvent, TElement>;
    'on:blur'?: EventHandler<FocusEvent, TElement>;
    'on:passive:blur'?: EventHandler<FocusEvent, TElement>;
    'on:capture:blur'?: EventHandler<FocusEvent, TElement>;
    'on:cancel'?: EventHandler<Event, TElement>;
    'on:passive:cancel'?: EventHandler<Event, TElement>;
    'on:capture:cancel'?: EventHandler<Event, TElement>;
    'on:change'?: EventHandler<Event, TElement>;
    'on:passive:change'?: EventHandler<Event, TElement>;
    'on:capture:change'?: EventHandler<Event, TElement>;
    'on:click'?: EventHandler<PointerEvent, TElement>;
    'on:passive:click'?: EventHandler<PointerEvent, TElement>;
    'on:capture:click'?: EventHandler<PointerEvent, TElement>;
    'on:close'?: EventHandler<Event, TElement>;
    'on:passive:close'?: EventHandler<Event, TElement>;
    'on:capture:close'?: EventHandler<Event, TElement>;
    'on:compositionend'?: EventHandler<CompositionEvent, TElement>;
    'on:passive:compositionend'?: EventHandler<CompositionEvent, TElement>;
    'on:capture:compositionend'?: EventHandler<CompositionEvent, TElement>;
    'on:compositionstart'?: EventHandler<CompositionEvent, TElement>;
    'on:passive:compositionstart'?: EventHandler<CompositionEvent, TElement>;
    'on:capture:compositionstart'?: EventHandler<CompositionEvent, TElement>;
    'on:compositionupdate'?: EventHandler<CompositionEvent, TElement>;
    'on:passive:compositionupdate'?: EventHandler<CompositionEvent, TElement>;
    'on:capture:compositionupdate'?: EventHandler<CompositionEvent, TElement>;
    'on:connect'?: EventHandler<MessageEvent, TElement>;
    'on:passive:connect'?: EventHandler<MessageEvent, TElement>;
    'on:capture:connect'?: EventHandler<MessageEvent, TElement>;
    'on:contextlost'?: EventHandler<Event, TElement>;
    'on:passive:contextlost'?: EventHandler<Event, TElement>;
    'on:capture:contextlost'?: EventHandler<Event, TElement>;
    'on:contextmenu'?: EventHandler<PointerEvent, TElement>;
    'on:passive:contextmenu'?: EventHandler<PointerEvent, TElement>;
    'on:capture:contextmenu'?: EventHandler<PointerEvent, TElement>;
    'on:contextrestored'?: EventHandler<Event, TElement>;
    'on:passive:contextrestored'?: EventHandler<Event, TElement>;
    'on:capture:contextrestored'?: EventHandler<Event, TElement>;
    'on:copy'?: EventHandler<Event, TElement>;
    'on:passive:copy'?: EventHandler<Event, TElement>;
    'on:capture:copy'?: EventHandler<Event, TElement>;
    'on:cut'?: EventHandler<Event, TElement>;
    'on:passive:cut'?: EventHandler<Event, TElement>;
    'on:capture:cut'?: EventHandler<Event, TElement>;
    'on:dblclick'?: EventHandler<MouseEvent, TElement>;
    'on:passive:dblclick'?: EventHandler<MouseEvent, TElement>;
    'on:capture:dblclick'?: EventHandler<MouseEvent, TElement>;
    'on:drag'?: EventHandler<DragEvent, TElement>;
    'on:passive:drag'?: EventHandler<DragEvent, TElement>;
    'on:capture:drag'?: EventHandler<DragEvent, TElement>;
    'on:dragend'?: EventHandler<DragEvent, TElement>;
    'on:passive:dragend'?: EventHandler<DragEvent, TElement>;
    'on:capture:dragend'?: EventHandler<DragEvent, TElement>;
    'on:dragenter'?: EventHandler<DragEvent, TElement>;
    'on:passive:dragenter'?: EventHandler<DragEvent, TElement>;
    'on:capture:dragenter'?: EventHandler<DragEvent, TElement>;
    'on:dragleave'?: EventHandler<DragEvent, TElement>;
    'on:passive:dragleave'?: EventHandler<DragEvent, TElement>;
    'on:capture:dragleave'?: EventHandler<DragEvent, TElement>;
    'on:dragover'?: EventHandler<DragEvent, TElement>;
    'on:passive:dragover'?: EventHandler<DragEvent, TElement>;
    'on:capture:dragover'?: EventHandler<DragEvent, TElement>;
    'on:dragstart'?: EventHandler<DragEvent, TElement>;
    'on:passive:dragstart'?: EventHandler<DragEvent, TElement>;
    'on:capture:dragstart'?: EventHandler<DragEvent, TElement>;
    'on:drop'?: EventHandler<DragEvent, TElement>;
    'on:passive:drop'?: EventHandler<DragEvent, TElement>;
    'on:capture:drop'?: EventHandler<DragEvent, TElement>;
    'on:emptied'?: EventHandler<Event, TElement>;
    'on:passive:emptied'?: EventHandler<Event, TElement>;
    'on:capture:emptied'?: EventHandler<Event, TElement>;
    'on:error'?: EventHandler<Event, TElement>;
    'on:passive:error'?: EventHandler<Event, TElement>;
    'on:capture:error'?: EventHandler<Event, TElement>;
    'on:focus'?: EventHandler<FocusEvent, TElement>;
    'on:passive:focus'?: EventHandler<FocusEvent, TElement>;
    'on:capture:focus'?: EventHandler<FocusEvent, TElement>;
    'on:focusin'?: EventHandler<FocusEvent, TElement>;
    'on:passive:focusin'?: EventHandler<FocusEvent, TElement>;
    'on:capture:focusin'?: EventHandler<FocusEvent, TElement>;
    'on:focusout'?: EventHandler<FocusEvent, TElement>;
    'on:passive:focusout'?: EventHandler<FocusEvent, TElement>;
    'on:capture:focusout'?: EventHandler<FocusEvent, TElement>;
    'on:formdata'?: EventHandler<FormDataEvent, TElement>;
    'on:passive:formdata'?: EventHandler<FormDataEvent, TElement>;
    'on:capture:formdata'?: EventHandler<FormDataEvent, TElement>;
    'on:hashchange'?: EventHandler<HashChangeEvent, TElement>;
    'on:passive:hashchange'?: EventHandler<HashChangeEvent, TElement>;
    'on:capture:hashchange'?: EventHandler<HashChangeEvent, TElement>;
    'on:input'?: EventHandler<InputEvent, TElement>;
    'on:passive:input'?: EventHandler<InputEvent, TElement>;
    'on:capture:input'?: EventHandler<InputEvent, TElement>;
    'on:invalid'?: EventHandler<Event, TElement>;
    'on:passive:invalid'?: EventHandler<Event, TElement>;
    'on:capture:invalid'?: EventHandler<Event, TElement>;
    'on:keydown'?: EventHandler<KeyboardEvent, TElement>;
    'on:passive:keydown'?: EventHandler<KeyboardEvent, TElement>;
    'on:capture:keydown'?: EventHandler<KeyboardEvent, TElement>;
    'on:keyup'?: EventHandler<KeyboardEvent, TElement>;
    'on:passive:keyup'?: EventHandler<KeyboardEvent, TElement>;
    'on:capture:keyup'?: EventHandler<KeyboardEvent, TElement>;
    'on:languagechange'?: EventHandler<Event, TElement>;
    'on:passive:languagechange'?: EventHandler<Event, TElement>;
    'on:capture:languagechange'?: EventHandler<Event, TElement>;
    'on:load'?: EventHandler<Event, TElement>;
    'on:passive:load'?: EventHandler<Event, TElement>;
    'on:capture:load'?: EventHandler<Event, TElement>;
    'on:loadstart'?: EventHandler<Event, TElement>;
    'on:passive:loadstart'?: EventHandler<Event, TElement>;
    'on:capture:loadstart'?: EventHandler<Event, TElement>;
    'on:message'?: EventHandler<MessageEvent, TElement>;
    'on:passive:message'?: EventHandler<MessageEvent, TElement>;
    'on:capture:message'?: EventHandler<MessageEvent, TElement>;
    'on:messageerror'?: EventHandler<MessageEvent, TElement>;
    'on:passive:messageerror'?: EventHandler<MessageEvent, TElement>;
    'on:capture:messageerror'?: EventHandler<MessageEvent, TElement>;
    'on:mousedown'?: EventHandler<MouseEvent, TElement>;
    'on:passive:mousedown'?: EventHandler<MouseEvent, TElement>;
    'on:capture:mousedown'?: EventHandler<MouseEvent, TElement>;
    'on:mouseenter'?: EventHandler<MouseEvent, TElement>;
    'on:passive:mouseenter'?: EventHandler<MouseEvent, TElement>;
    'on:capture:mouseenter'?: EventHandler<MouseEvent, TElement>;
    'on:mouseleave'?: EventHandler<MouseEvent, TElement>;
    'on:passive:mouseleave'?: EventHandler<MouseEvent, TElement>;
    'on:capture:mouseleave'?: EventHandler<MouseEvent, TElement>;
    'on:mousemove'?: EventHandler<MouseEvent, TElement>;
    'on:passive:mousemove'?: EventHandler<MouseEvent, TElement>;
    'on:capture:mousemove'?: EventHandler<MouseEvent, TElement>;
    'on:mouseout'?: EventHandler<MouseEvent, TElement>;
    'on:passive:mouseout'?: EventHandler<MouseEvent, TElement>;
    'on:capture:mouseout'?: EventHandler<MouseEvent, TElement>;
    'on:mouseover'?: EventHandler<MouseEvent, TElement>;
    'on:passive:mouseover'?: EventHandler<MouseEvent, TElement>;
    'on:capture:mouseover'?: EventHandler<MouseEvent, TElement>;
    'on:mouseup'?: EventHandler<MouseEvent, TElement>;
    'on:passive:mouseup'?: EventHandler<MouseEvent, TElement>;
    'on:capture:mouseup'?: EventHandler<MouseEvent, TElement>;
    'on:offline'?: EventHandler<Event, TElement>;
    'on:passive:offline'?: EventHandler<Event, TElement>;
    'on:capture:offline'?: EventHandler<Event, TElement>;
    'on:online'?: EventHandler<Event, TElement>;
    'on:passive:online'?: EventHandler<Event, TElement>;
    'on:capture:online'?: EventHandler<Event, TElement>;
    'on:open'?: EventHandler<Event, TElement>;
    'on:passive:open'?: EventHandler<Event, TElement>;
    'on:capture:open'?: EventHandler<Event, TElement>;
    'on:pagehide'?: EventHandler<PageTransitionEvent, TElement>;
    'on:passive:pagehide'?: EventHandler<PageTransitionEvent, TElement>;
    'on:capture:pagehide'?: EventHandler<PageTransitionEvent, TElement>;
    'on:pageshow'?: EventHandler<PageTransitionEvent, TElement>;
    'on:passive:pageshow'?: EventHandler<PageTransitionEvent, TElement>;
    'on:capture:pageshow'?: EventHandler<PageTransitionEvent, TElement>;
    'on:paste'?: EventHandler<Event, TElement>;
    'on:passive:paste'?: EventHandler<Event, TElement>;
    'on:capture:paste'?: EventHandler<Event, TElement>;
    'on:popstate'?: EventHandler<PopStateEvent, TElement>;
    'on:passive:popstate'?: EventHandler<PopStateEvent, TElement>;
    'on:capture:popstate'?: EventHandler<PopStateEvent, TElement>;
    'on:progress'?: EventHandler<Event, TElement>;
    'on:passive:progress'?: EventHandler<Event, TElement>;
    'on:capture:progress'?: EventHandler<Event, TElement>;
    'on:readystatechange'?: EventHandler<Event, TElement>;
    'on:passive:readystatechange'?: EventHandler<Event, TElement>;
    'on:capture:readystatechange'?: EventHandler<Event, TElement>;
    'on:rejectionhandled'?: EventHandler<PromiseRejectionEvent, TElement>;
    'on:passive:rejectionhandled'?: EventHandler<
        PromiseRejectionEvent,
        TElement
    >;
    'on:capture:rejectionhandled'?: EventHandler<
        PromiseRejectionEvent,
        TElement
    >;
    'on:reset'?: EventHandler<Event, TElement>;
    'on:passive:reset'?: EventHandler<Event, TElement>;
    'on:capture:reset'?: EventHandler<Event, TElement>;
    'on:securitypolicyviolation'?: EventHandler<Event, TElement>;
    'on:passive:securitypolicyviolation'?: EventHandler<Event, TElement>;
    'on:capture:securitypolicyviolation'?: EventHandler<Event, TElement>;
    'on:select'?: EventHandler<Event, TElement>;
    'on:passive:select'?: EventHandler<Event, TElement>;
    'on:capture:select'?: EventHandler<Event, TElement>;
    'on:slotchange'?: EventHandler<Event, TElement>;
    'on:passive:slotchange'?: EventHandler<Event, TElement>;
    'on:capture:slotchange'?: EventHandler<Event, TElement>;
    'on:stalled'?: EventHandler<Event, TElement>;
    'on:passive:stalled'?: EventHandler<Event, TElement>;
    'on:capture:stalled'?: EventHandler<Event, TElement>;
    'on:storage'?: EventHandler<StorageEvent, TElement>;
    'on:passive:storage'?: EventHandler<StorageEvent, TElement>;
    'on:capture:storage'?: EventHandler<StorageEvent, TElement>;
    'on:submit'?: EventHandler<SubmitEvent, TElement>;
    'on:passive:submit'?: EventHandler<SubmitEvent, TElement>;
    'on:capture:submit'?: EventHandler<SubmitEvent, TElement>;
    'on:suspend'?: EventHandler<Event, TElement>;
    'on:passive:suspend'?: EventHandler<Event, TElement>;
    'on:capture:suspend'?: EventHandler<Event, TElement>;
    'on:toggle'?: EventHandler<Event, TElement>;
    'on:passive:toggle'?: EventHandler<Event, TElement>;
    'on:capture:toggle'?: EventHandler<Event, TElement>;
    'on:unhandledrejection'?: EventHandler<PromiseRejectionEvent, TElement>;
    'on:passive:unhandledrejection'?: EventHandler<
        PromiseRejectionEvent,
        TElement
    >;
    'on:capture:unhandledrejection'?: EventHandler<
        PromiseRejectionEvent,
        TElement
    >;
    'on:unload'?: EventHandler<Event, TElement>;
    'on:passive:unload'?: EventHandler<Event, TElement>;
    'on:capture:unload'?: EventHandler<Event, TElement>;
    'on:visibilitychange'?: EventHandler<Event, TElement>;
    'on:passive:visibilitychange'?: EventHandler<Event, TElement>;
    'on:capture:visibilitychange'?: EventHandler<Event, TElement>;
    'on:wheel'?: EventHandler<WheelEvent, TElement>;
    'on:passive:wheel'?: EventHandler<WheelEvent, TElement>;
    'on:capture:wheel'?: EventHandler<WheelEvent, TElement>;
    [key: `on:${string}`]: EventHandler<Event, TElement>;
    [key: `on:passive:${string}`]: EventHandler<Event, TElement>;
    [key: `on:capture:${string}`]: EventHandler<Event, TElement>;
}

interface JSXDataProps {
    [key: `data-${string}`]:
        | Calculation<string | undefined>
        | string
        | undefined;
}

type JSXElementInterfaceProps<TJSXType extends JSXElementInterface> = {
    [Key in keyof TJSXType]:
        | (Calculation<any> & (() => TJSXType[Key]))
        | TJSXType[Key];
};

type JSXChildrenProps<HasChildren extends boolean> = HasChildren extends true
    ? { children?: JSX.Node | JSX.Node[] }
    : { children?: never };

type WithCalculationsAndRef<
    TJSXType extends JSXElementInterface,
    TElement extends Element,
    HasChildren extends boolean
> = JSXRefProps<TElement> &
    JSXAttrProps &
    JSXEventProps<TElement> &
    JSXDataProps &
    JSXElementInterfaceProps<TJSXType> &
    JSXChildrenProps<HasChildren>;

export interface KnownElements {
    a: WithCalculationsAndRef<
        JSXAnchorElementInterface,
        HTMLAnchorElement,
        true
    >;
    abbr: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    address: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    area: WithCalculationsAndRef<
        JSXAreaElementInterface,
        HTMLAreaElement,
        false
    >;
    article: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    aside: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    audio: WithCalculationsAndRef<
        JSXAudioElementInterface,
        HTMLAudioElement,
        true
    >;
    b: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    base: WithCalculationsAndRef<
        JSXBaseElementInterface,
        HTMLBaseElement,
        false
    >;
    bdi: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    bdo: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    blockquote: WithCalculationsAndRef<
        JSXQuoteElementInterface,
        HTMLQuoteElement,
        true
    >;
    body: WithCalculationsAndRef<
        JSXBodyElementInterface,
        HTMLBodyElement,
        true
    >;
    br: WithCalculationsAndRef<JSXBRElementInterface, HTMLBRElement, false>;
    button: WithCalculationsAndRef<
        JSXButtonElementInterface,
        HTMLButtonElement,
        true
    >;
    canvas: WithCalculationsAndRef<
        JSXCanvasElementInterface,
        HTMLCanvasElement,
        true
    >;
    caption: WithCalculationsAndRef<
        JSXTableCaptionElementInterface,
        HTMLTableCaptionElement,
        true
    >;
    cite: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    code: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    col: WithCalculationsAndRef<
        JSXTableColElementInterface,
        HTMLTableColElement,
        false
    >;
    colgroup: WithCalculationsAndRef<
        JSXTableColElementInterface,
        HTMLTableColElement,
        true
    >;
    data: WithCalculationsAndRef<
        JSXDataElementInterface,
        HTMLDataElement,
        true
    >;
    datalist: WithCalculationsAndRef<
        JSXDataListElementInterface,
        HTMLDataListElement,
        true
    >;
    dd: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    del: WithCalculationsAndRef<JSXModElementInterface, HTMLModElement, true>;
    details: WithCalculationsAndRef<
        JSXDetailsElementInterface,
        HTMLDetailsElement,
        true
    >;
    dfn: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    dialog: WithCalculationsAndRef<
        JSXDialogElementInterface,
        HTMLDialogElement,
        true
    >;
    div: WithCalculationsAndRef<JSXDivElementInterface, HTMLDivElement, true>;
    dl: WithCalculationsAndRef<
        JSXDListElementInterface,
        HTMLDListElement,
        true
    >;
    dt: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    em: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    embed: WithCalculationsAndRef<
        JSXEmbedElementInterface,
        HTMLEmbedElement,
        false
    >;
    fieldset: WithCalculationsAndRef<
        JSXFieldSetElementInterface,
        HTMLFieldSetElement,
        true
    >;
    figcaption: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    figure: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    footer: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    form: WithCalculationsAndRef<
        JSXFormElementInterface,
        HTMLFormElement,
        true
    >;
    h1: WithCalculationsAndRef<
        JSXHeadingElementInterface,
        HTMLHeadingElement,
        true
    >;
    h2: WithCalculationsAndRef<
        JSXHeadingElementInterface,
        HTMLHeadingElement,
        true
    >;
    h3: WithCalculationsAndRef<
        JSXHeadingElementInterface,
        HTMLHeadingElement,
        true
    >;
    h4: WithCalculationsAndRef<
        JSXHeadingElementInterface,
        HTMLHeadingElement,
        true
    >;
    h5: WithCalculationsAndRef<
        JSXHeadingElementInterface,
        HTMLHeadingElement,
        true
    >;
    h6: WithCalculationsAndRef<
        JSXHeadingElementInterface,
        HTMLHeadingElement,
        true
    >;
    head: WithCalculationsAndRef<
        JSXHeadElementInterface,
        HTMLHeadElement,
        true
    >;
    header: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    hgroup: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    hr: WithCalculationsAndRef<JSXHRElementInterface, HTMLHRElement, false>;
    html: WithCalculationsAndRef<
        JSXHtmlElementInterface,
        HTMLHtmlElement,
        true
    >;
    i: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    iframe: WithCalculationsAndRef<
        JSXIFrameElementInterface,
        HTMLIFrameElement,
        true
    >;
    img: WithCalculationsAndRef<
        JSXImageElementInterface,
        HTMLImageElement,
        false
    >;
    input: WithCalculationsAndRef<
        JSXInputElementInterface,
        HTMLInputElement,
        false
    >;
    ins: WithCalculationsAndRef<JSXModElementInterface, HTMLModElement, true>;
    kbd: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    label: WithCalculationsAndRef<
        JSXLabelElementInterface,
        HTMLLabelElement,
        true
    >;
    legend: WithCalculationsAndRef<
        JSXLegendElementInterface,
        HTMLLegendElement,
        true
    >;
    li: WithCalculationsAndRef<JSXLIElementInterface, HTMLLIElement, true>;
    link: WithCalculationsAndRef<
        JSXLinkElementInterface,
        HTMLLinkElement,
        false
    >;
    main: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    map: WithCalculationsAndRef<JSXMapElementInterface, HTMLMapElement, true>;
    mark: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    menu: WithCalculationsAndRef<
        JSXMenuElementInterface,
        HTMLMenuElement,
        true
    >;
    meta: WithCalculationsAndRef<
        JSXMetaElementInterface,
        HTMLMetaElement,
        false
    >;
    meter: WithCalculationsAndRef<
        JSXMeterElementInterface,
        HTMLMeterElement,
        true
    >;
    nav: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    noscript: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    object: WithCalculationsAndRef<
        JSXObjectElementInterface,
        HTMLObjectElement,
        true
    >;
    ol: WithCalculationsAndRef<
        JSXOListElementInterface,
        HTMLOListElement,
        true
    >;
    optgroup: WithCalculationsAndRef<
        JSXOptGroupElementInterface,
        HTMLOptGroupElement,
        true
    >;
    option: WithCalculationsAndRef<
        JSXOptionElementInterface,
        HTMLOptionElement,
        true
    >;
    output: WithCalculationsAndRef<
        JSXOutputElementInterface,
        HTMLOutputElement,
        true
    >;
    p: WithCalculationsAndRef<
        JSXParagraphElementInterface,
        HTMLParagraphElement,
        true
    >;
    param: WithCalculationsAndRef<
        JSXParamElementInterface,
        HTMLParamElement,
        false
    >;
    picture: WithCalculationsAndRef<
        JSXPictureElementInterface,
        HTMLPictureElement,
        true
    >;
    pre: WithCalculationsAndRef<JSXPreElementInterface, HTMLPreElement, true>;
    progress: WithCalculationsAndRef<
        JSXProgressElementInterface,
        HTMLProgressElement,
        true
    >;
    q: WithCalculationsAndRef<JSXQuoteElementInterface, HTMLQuoteElement, true>;
    rp: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    rt: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    ruby: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    s: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    samp: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    script: WithCalculationsAndRef<
        JSXScriptElementInterface,
        HTMLScriptElement,
        true
    >;
    section: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    select: WithCalculationsAndRef<
        JSXSelectElementInterface,
        HTMLSelectElement,
        true
    >;
    slot: WithCalculationsAndRef<
        JSXSlotElementInterface,
        HTMLSlotElement,
        true
    >;
    small: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    source: WithCalculationsAndRef<
        JSXSourceElementInterface,
        HTMLSourceElement,
        false
    >;
    span: WithCalculationsAndRef<
        JSXSpanElementInterface,
        HTMLSpanElement,
        true
    >;
    strong: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    style: WithCalculationsAndRef<
        JSXStyleElementInterface,
        HTMLStyleElement,
        true
    >;
    sub: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    summary: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    sup: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    table: WithCalculationsAndRef<
        JSXTableElementInterface,
        HTMLTableElement,
        true
    >;
    tbody: WithCalculationsAndRef<
        JSXTableSectionElementInterface,
        HTMLTableSectionElement,
        true
    >;
    td: WithCalculationsAndRef<
        JSXTableCellElementInterface,
        HTMLTableCellElement,
        true
    >;
    template: WithCalculationsAndRef<
        JSXTemplateElementInterface,
        HTMLTemplateElement,
        true
    >;
    textarea: WithCalculationsAndRef<
        JSXTextAreaElementInterface,
        HTMLTextAreaElement,
        true
    >;
    tfoot: WithCalculationsAndRef<
        JSXTableSectionElementInterface,
        HTMLTableSectionElement,
        true
    >;
    th: WithCalculationsAndRef<
        JSXTableHeaderElementInterface,
        HTMLTableCellElement,
        true
    >;
    thead: WithCalculationsAndRef<
        JSXTableSectionElementInterface,
        HTMLTableSectionElement,
        true
    >;
    time: WithCalculationsAndRef<
        JSXTimeElementInterface,
        HTMLTimeElement,
        true
    >;
    title: WithCalculationsAndRef<
        JSXTitleElementInterface,
        HTMLTitleElement,
        true
    >;
    tr: WithCalculationsAndRef<
        JSXTableRowElementInterface,
        HTMLTableRowElement,
        true
    >;
    track: WithCalculationsAndRef<
        JSXTrackElementInterface,
        HTMLTrackElement,
        false
    >;
    u: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    ul: WithCalculationsAndRef<
        JSXUListElementInterface,
        HTMLUListElement,
        true
    >;
    var: WithCalculationsAndRef<JSXElementInterface, HTMLElement, true>;
    video: WithCalculationsAndRef<
        JSXVideoElementInterface,
        HTMLVideoElement,
        true
    >;
    wbr: WithCalculationsAndRef<JSXElementInterface, HTMLElement, false>;
}
