import { TypeTag, Ref, Calculation, Collection } from './types';

// General component props
type PropsWithChildren<P> = P & { children?: JSXNode[] };

type OnUnmountCallback = () => void;
type OnMountCallback = () => void;
type EffectCallback = () => void;

type ComponentListeners = {
    onUnmount: (callback: OnUnmountCallback) => void;
    onMount: (callback: OnMountCallback) => void;
    onEffect: (callback: EffectCallback) => void;
};
export type Component<P extends {}> = (
    props: PropsWithChildren<P>,
    listeners: ComponentListeners
) => JSXNode;

type JsxRawNode = string | number | boolean | null | undefined | Function;

/**
 * The type returnable by JSX (raw nodes)
 */
type JSXNodeSingle =
    | JsxRawNode
    | Calculation<JsxRawNode>
    | Calculation<JsxRawNode[]>
    | RenderElement<any>
    | RenderComponent<any>;
export type JSXNode =
    | JSXNodeSingle
    | JSXNodeSingle[]
    | Collection<JSXNodeSingle>;

export type RenderElement<ElementName extends keyof JSX.IntrinsicElements> = {
    [TypeTag]: 'element';
    element: ElementName;
    props?: JSX.IntrinsicElements[ElementName];
    children: JSXNode[];
};
export function isRenderElement(
    jsxNode: JSXNode
): jsxNode is RenderElement<any> {
    return !!(
        jsxNode &&
        typeof jsxNode === 'object' &&
        !Array.isArray(jsxNode) &&
        jsxNode[TypeTag] === 'element'
    );
}

export type RenderComponent<Props extends {}> = {
    [TypeTag]: 'component';
    component: Component<Props>;
    props?: Props;
    children: JSXNode[];
};
export function isRenderComponent(
    jsxNode: JSXNode
): jsxNode is RenderComponent<any> {
    return !!(
        jsxNode &&
        typeof jsxNode === 'object' &&
        !Array.isArray(jsxNode) &&
        jsxNode[TypeTag] === 'component'
    );
}

/*
 * Interfaces adopted from HTML Living Standard Last Updated 30 November 2021: https://html.spec.whatwg.org/
 */
function attrIdentity<T>(val: T): T {
    return val;
}
function attrBooleanToEmptyString(val: boolean): string | undefined {
    return val ? '' : undefined;
}
function attrNumberToString(val: number): string {
    return val.toString();
}
function attrStringOrNumberToString(val: string | number): string {
    return val.toString();
}
function attrStringOrNumberToNumber(val: string | number): number {
    return typeof val === 'number' ? val : parseInt(val);
}
function attrYesNo(val: '' | 'yes' | 'no'): boolean {
    return val === 'no' ? false : true;
}
function attrStringArrayToWsString(val: string[]): string | undefined {
    if (val.length === 0) return undefined;
    return val.join(' ');
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
    width?: number | undefined;
    height?: number | undefined;
}

type PropertyMapField<TJSXField, TElement, TIDLName extends keyof TElement> =
    | {
          makeAttrValue?: (
              jsxAttr: Exclude<TJSXField, undefined>
          ) => string | undefined;
      }
    | {
          makeAttrValue?: (
              jsxAttr: Exclude<TJSXField, undefined>
          ) => string | undefined;
          idlName: TIDLName;
          makeIdlValue: (
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
    tabindex?: -1 | 0 | number | undefined; // "-1" and "0" used as convenience
    title?: string | undefined;
    translate?: '' | 'yes' | 'no' | undefined;
}

export const HTMLElementMap: PropertyMap<
    JSXElementInterface,
    HTMLElement & MissingFromTypescriptHTMLElementProperties
> = {
    accesskey: {
        makeAttrValue: attrIdentity,
        idlName: 'accessKey',
        makeIdlValue: attrIdentity,
    },
    'aria-atomic': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaAtomic',
        makeIdlValue: attrIdentity,
    },
    'aria-autocomplete': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaAutoComplete',
        makeIdlValue: attrIdentity,
    },
    'aria-busy': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaBusy',
        makeIdlValue: attrIdentity,
    },
    'aria-checked': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaChecked',
        makeIdlValue: attrIdentity,
    },
    'aria-colcount': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaColCount',
        makeIdlValue: attrIdentity,
    },
    'aria-colindex': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaColIndex',
        makeIdlValue: attrIdentity,
    },
    'aria-colindextext': {
        makeAttrValue: attrIdentity,
        // Note: ariaColIndexText is not present on TypeScript's Element AriaMixin IDL, despite being present in https://www.w3.org/TR/wai-aria-1.2/
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Type '"ariaColIndexText"' is not assignable to type 'keyof HTMLElement'.
        idlName: 'ariaColIndexText',
        makeIdlValue: attrIdentity,
    },
    'aria-colspan': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaColSpan',
        makeIdlValue: attrIdentity,
    },
    'aria-current': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaCurrent',
        makeIdlValue: attrIdentity,
    },
    /*
     * Note: omitting aria-description, as it is still in consideration for ARIA 2.0: https://www.w3.org/WAI/ARIA/track/issues/411
    'aria-description': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaDescription',
        makeIdlValue: attrIdentity,
    },
    */
    'aria-disabled': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaDisabled',
        makeIdlValue: attrIdentity,
    },
    'aria-expanded': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaExpanded',
        makeIdlValue: attrIdentity,
    },
    'aria-haspopup': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaHasPopup',
        makeIdlValue: attrIdentity,
    },
    'aria-hidden': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaHidden',
        makeIdlValue: attrIdentity,
    },
    'aria-invalid': {
        makeAttrValue: attrIdentity,
        // Note: ariaColIndexText is not present on TypeScript's Element AriaMixin IDL, despite being present in https://www.w3.org/TR/wai-aria-1.2/
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Type '"ariaInvalid"' is not assignable to type 'keyof HTMLElement'.
        idlName: 'ariaInvalid',
        makeIdlValue: attrIdentity,
    },
    'aria-keyshortcuts': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaKeyShortcuts',
        makeIdlValue: attrIdentity,
    },
    'aria-label': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaLabel',
        makeIdlValue: attrIdentity,
    },
    'aria-level': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaLevel',
        makeIdlValue: attrIdentity,
    },
    'aria-live': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaLive',
        makeIdlValue: attrIdentity,
    },
    'aria-modal': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaModal',
        makeIdlValue: attrIdentity,
    },
    'aria-multiline': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaMultiLine',
        makeIdlValue: attrIdentity,
    },
    'aria-multiselectable': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaMultiSelectable',
        makeIdlValue: attrIdentity,
    },
    'aria-orientation': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaOrientation',
        makeIdlValue: attrIdentity,
    },
    'aria-placeholder': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaPlaceholder',
        makeIdlValue: attrIdentity,
    },
    'aria-posinset': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaPosInSet',
        makeIdlValue: attrIdentity,
    },
    'aria-pressed': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaPressed',
        makeIdlValue: attrIdentity,
    },
    'aria-readonly': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaReadOnly',
        makeIdlValue: attrIdentity,
    },
    'aria-required': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaRequired',
        makeIdlValue: attrIdentity,
    },
    'aria-roledescription': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaRoleDescription',
        makeIdlValue: attrIdentity,
    },
    'aria-rowcount': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaRowCount',
        makeIdlValue: attrIdentity,
    },
    'aria-rowindex': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaRowIndex',
        makeIdlValue: attrIdentity,
    },
    'aria-rowindextext': {
        makeAttrValue: attrIdentity,
        // Note: ariaColIndexText is not present on TypeScript's Element AriaMixin IDL, despite being present in https://www.w3.org/TR/wai-aria-1.2/
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Type '"ariaColIndexText"' is not assignable to type 'keyof HTMLElement'.
        idlName: 'ariaRowIndexText',
        makeIdlValue: attrIdentity,
    },
    'aria-rowspan': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaRowSpan',
        makeIdlValue: attrIdentity,
    },
    'aria-selected': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaSelected',
        makeIdlValue: attrIdentity,
    },
    'aria-setsize': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaSetSize',
        makeIdlValue: attrIdentity,
    },
    'aria-sort': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaSort',
        makeIdlValue: attrIdentity,
    },
    'aria-valuemax': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaValueMax',
        makeIdlValue: attrIdentity,
    },
    'aria-valuemin': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaValueMin',
        makeIdlValue: attrIdentity,
    },
    'aria-valuenow': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaValueNow',
        makeIdlValue: attrIdentity,
    },
    'aria-valuetext': {
        makeAttrValue: attrIdentity,
        idlName: 'ariaValueText',
        makeIdlValue: attrIdentity,
    },
    autocapitalize: {
        makeAttrValue: attrIdentity,
        idlName: 'autocapitalize',
        makeIdlValue: attrIdentity,
    },
    autofocus: {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Type '<T>(val: T) => T' is not assignable to type '((jsxAttr: boolean) => string | undefined) | ((jsxAttr: boolean) => string | undefined)'. Type '<T>(val: T) => T' is not assignable to type '(jsxAttr: boolean) => string | undefined'. Type 'boolean' is not assignable to type 'string | undefined'.
        makeAttrValue: attrIdentity,
        // Note: The "autofocus" property exists in HTMLElement interface: https://html.spec.whatwg.org/multipage/dom.html#htmlorsvgelement
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Type '"autofocus"' is not assignable to type 'keyof HTMLElement'.
        idlName: 'autofocus',
        makeIdlValue: attrIdentity,
    },
    class: {
        makeAttrValue: attrIdentity,
        idlName: 'className',
        makeIdlValue: attrIdentity,
    },
    contenteditable: {
        makeAttrValue: attrIdentity,
        idlName: 'contentEditable',
        makeIdlValue: attrIdentity,
    },
    dir: {
        makeAttrValue: attrIdentity,
        idlName: 'dir',
        makeIdlValue: attrIdentity,
    },
    draggable: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'draggable',
        makeIdlValue: attrIdentity,
    },
    enterkeyhint: {
        makeAttrValue: attrIdentity,
        idlName: 'enterKeyHint',
        makeIdlValue: attrIdentity,
    },
    hidden: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'hidden',
        makeIdlValue: attrIdentity,
    },
    id: {
        makeAttrValue: attrIdentity,
        idlName: 'id',
        makeIdlValue: attrIdentity,
    },
    inputmode: {
        makeAttrValue: attrIdentity,
        idlName: 'inputMode',
        makeIdlValue: attrIdentity,
    },
    is: { makeAttrValue: attrIdentity },
    itemid: { makeAttrValue: attrIdentity },
    itemprop: { makeAttrValue: attrIdentity },
    itemref: { makeAttrValue: attrIdentity },
    itemscope: { makeAttrValue: attrBooleanToEmptyString },
    itemtype: { makeAttrValue: attrIdentity },
    lang: {
        makeAttrValue: attrIdentity,
        idlName: 'lang',
        makeIdlValue: attrIdentity,
    },
    nonce: {
        makeAttrValue: attrIdentity,
        idlName: 'nonce',
        makeIdlValue: attrIdentity,
    },
    role: {
        makeAttrValue: attrIdentity,
        // Note: role exists on all HTMLElements: https://w3c.github.io/aria/#idl-reflection-attribute-values
        idlName: 'role',
        makeIdlValue: attrIdentity,
    },
    slot: {
        makeAttrValue: attrIdentity,
        idlName: 'slot',
        makeIdlValue: attrIdentity,
    },
    spellcheck: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'spellcheck',
        makeIdlValue: attrIdentity,
    },
    style: {
        makeAttrValue: attrIdentity,
        idlName: 'style',
        makeIdlValue: attrIdentity,
    },
    tabindex: {
        makeAttrValue: attrStringOrNumberToString,
        idlName: 'tabIndex',
        makeIdlValue: attrStringOrNumberToNumber,
    },
    title: {
        makeAttrValue: attrIdentity,
        idlName: 'title',
        makeIdlValue: attrIdentity,
    },
    translate: {
        makeAttrValue: attrIdentity,
        idlName: 'translate',
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
    href: {
        makeAttrValue: attrIdentity,
        idlName: 'href',
        makeIdlValue: attrIdentity,
    },
    target: {
        makeAttrValue: attrIdentity,
        idlName: 'target',
        makeIdlValue: attrIdentity,
    },
    download: {
        makeAttrValue: attrIdentity,
        idlName: 'download',
        makeIdlValue: attrIdentity,
    },
    ping: {
        makeAttrValue: attrIdentity,
        idlName: 'ping',
        makeIdlValue: attrIdentity,
    },
    rel: {
        makeAttrValue: attrIdentity,
        idlName: 'rel',
        makeIdlValue: attrIdentity,
    },
    hreflang: {
        makeAttrValue: attrIdentity,
        idlName: 'hreflang',
        makeIdlValue: attrIdentity,
    },
    type: {
        makeAttrValue: attrIdentity,
        idlName: 'type',
        makeIdlValue: attrIdentity,
    },
    referrerpolicy: {
        makeAttrValue: attrIdentity,
        idlName: 'referrerPolicy',
        makeIdlValue: attrIdentity,
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
    alt: {
        makeAttrValue: attrIdentity,
        idlName: 'alt',
        makeIdlValue: attrIdentity,
    },
    coords: {
        makeAttrValue: attrIdentity,
        idlName: 'coords',
        makeIdlValue: attrIdentity,
    },
    shape: {
        makeAttrValue: attrIdentity,
        idlName: 'shape',
        makeIdlValue: attrIdentity,
    },
    href: {
        makeAttrValue: attrIdentity,
        idlName: 'href',
        makeIdlValue: attrIdentity,
    },
    target: {
        makeAttrValue: attrIdentity,
        idlName: 'target',
        makeIdlValue: attrIdentity,
    },
    download: {
        makeAttrValue: attrIdentity,
        idlName: 'download',
        makeIdlValue: attrIdentity,
    },
    ping: {
        makeAttrValue: attrIdentity,
        idlName: 'ping',
        makeIdlValue: attrIdentity,
    },
    rel: {
        makeAttrValue: attrIdentity,
        idlName: 'rel',
        makeIdlValue: attrIdentity,
    },
    referrerpolicy: {
        makeAttrValue: attrIdentity,
        idlName: 'referrerPolicy',
        makeIdlValue: attrIdentity,
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
    src: {
        makeAttrValue: attrIdentity,
        idlName: 'src',
        makeIdlValue: attrIdentity,
    },
    crossorigin: {
        makeAttrValue: attrIdentity,
        idlName: 'crossOrigin',
        makeIdlValue: attrIdentity,
    },
    preload: {
        makeAttrValue: attrIdentity,
        idlName: 'preload',
        makeIdlValue: attrIdentity,
    },
    autoplay: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'autoplay',
        makeIdlValue: attrIdentity,
    },
    loop: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'loop',
        makeIdlValue: attrBooleanToEmptyString,
    },
    muted: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'muted',
        makeIdlValue: attrIdentity,
    },
    controls: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'controls',
        makeIdlValue: attrIdentity,
    },
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
    href: {
        makeAttrValue: attrIdentity,
        idlName: 'href',
        makeIdlValue: attrIdentity,
    },
    target: {
        makeAttrValue: attrIdentity,
        idlName: 'target',
        makeIdlValue: attrIdentity,
    },
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
    disabled: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'disabled',
        makeIdlValue: attrIdentity,
    },
    form: { makeAttrValue: attrIdentity }, // Note: form IDL not ever written
    formaction: {
        makeAttrValue: attrIdentity,
        idlName: 'formAction',
        makeIdlValue: attrIdentity,
    },
    formenctype: {
        makeAttrValue: attrIdentity,
        idlName: 'formEnctype',
        makeIdlValue: attrIdentity,
    },
    formmethod: {
        makeAttrValue: attrIdentity,
        idlName: 'formMethod',
        makeIdlValue: attrIdentity,
    },
    formnovalidate: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'formNoValidate',
        makeIdlValue: attrIdentity,
    },
    formtarget: {
        makeAttrValue: attrIdentity,
        idlName: 'formTarget',
        makeIdlValue: attrIdentity,
    },
    name: {
        makeAttrValue: attrIdentity,
        idlName: 'name',
        makeIdlValue: attrIdentity,
    },
    type: {
        makeAttrValue: attrIdentity,
        idlName: 'type',
        makeIdlValue: attrIdentity,
    },
    value: {
        makeAttrValue: attrIdentity,
        idlName: 'value',
        makeIdlValue: attrIdentity,
    },
};

interface JSXCanvasElementInterface extends JSXElementInterface {
    width?: number | undefined;
    height?: number | undefined;
}

const HTMLCanvasElementMap: PropertyMap<
    JSXCanvasElementInterface,
    HTMLCanvasElement
> = {
    ...HTMLElementMap,
    width: {
        makeAttrValue: attrNumberToString,
        idlName: 'width',
        makeIdlValue: attrIdentity,
    },
    height: {
        makeAttrValue: attrNumberToString,
        idlName: 'height',
        makeIdlValue: attrIdentity,
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
    value: {
        makeAttrValue: attrIdentity,
        idlName: 'value',
        makeIdlValue: attrIdentity,
    },
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
    open: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'open',
        makeIdlValue: attrIdentity,
    },
};

interface JSXDialogElementInterface extends JSXElementInterface {
    open?: boolean | undefined;
}

const HTMLDialogElementMap: PropertyMap<
    JSXDialogElementInterface,
    HTMLDialogElement & MissingFromTypescriptHTMLDialogElementProperties
> = {
    ...HTMLElementMap,
    open: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'open',
        makeIdlValue: attrIdentity,
    },
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JSXDivElementInterface extends JSXElementInterface {}

const HTMLDivElementMap: PropertyMap<JSXDivElementInterface, HTMLDivElement> = {
    ...HTMLElementMap,
};

interface JSXEmbedElementInterface extends JSXElementInterface {
    src?: string | undefined;
    type?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
}

const HTMLEmbedElementMap: PropertyMap<
    JSXEmbedElementInterface,
    HTMLEmbedElement
> = {
    ...HTMLElementMap,
    src: {
        makeAttrValue: attrIdentity,
        idlName: 'src',
        makeIdlValue: attrIdentity,
    },
    type: {
        makeAttrValue: attrIdentity,
        idlName: 'type',
        makeIdlValue: attrIdentity,
    },
    width: {
        makeAttrValue: attrNumberToString,
        idlName: 'width',
        makeIdlValue: attrIdentity,
    },
    height: {
        makeAttrValue: attrNumberToString,
        idlName: 'height',
        makeIdlValue: attrIdentity,
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
    disabled: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'disabled',
        makeIdlValue: attrIdentity,
    },
    form: { makeAttrValue: attrIdentity }, // form IDL not ever written
    name: {
        makeAttrValue: attrIdentity,
        idlName: 'name',
        makeIdlValue: attrIdentity,
    },
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
        makeAttrValue: attrIdentity,
        idlName: 'acceptCharset',
        makeIdlValue: attrIdentity,
    },
    action: {
        makeAttrValue: attrIdentity,
        idlName: 'action',
        makeIdlValue: attrIdentity,
    },
    autocomplete: {
        makeAttrValue: attrIdentity,
        idlName: 'autocomplete',
        makeIdlValue: attrIdentity,
    },
    enctype: {
        makeAttrValue: attrIdentity,
        idlName: 'enctype',
        makeIdlValue: attrIdentity,
    },
    method: {
        makeAttrValue: attrIdentity,
        idlName: 'method',
        makeIdlValue: attrIdentity,
    },
    name: {
        makeAttrValue: attrIdentity,
        idlName: 'name',
        makeIdlValue: attrIdentity,
    },
    novalidate: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'noValidate',
        makeIdlValue: attrIdentity,
    },
    target: {
        makeAttrValue: attrIdentity,
        idlName: 'target',
        makeIdlValue: attrIdentity,
    },
    rel: {
        makeAttrValue: attrIdentity,
        idlName: 'rel',
        makeIdlValue: attrIdentity,
    },
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
    sandbox?: SandboxValue[] | undefined; // TODO: make more of these tokenized items
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

const HTMLIFrameElementMap: PropertyMap<
    JSXIFrameElementInterface,
    HTMLIFrameElement & MissingFromTypescriptHTMLIframeElementProperties
> = {
    ...HTMLElementMap,
    src: {
        makeAttrValue: attrIdentity,
        idlName: 'src',
        makeIdlValue: attrIdentity,
    },
    srcdoc: {
        makeAttrValue: attrIdentity,
        idlName: 'srcdoc',
        makeIdlValue: attrIdentity,
    },
    name: {
        makeAttrValue: attrIdentity,
        idlName: 'name',
        makeIdlValue: attrIdentity,
    },
    sandbox: {
        makeAttrValue: attrStringArrayToWsString,
        idlName: 'sandbox',
        makeIdlValue: attrStringArrayToWsString,
    },
    allow: {
        makeAttrValue: attrIdentity,
        idlName: 'allow',
        makeIdlValue: attrIdentity,
    },
    allowfullscreen: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'allowFullscreen',
        makeIdlValue: attrIdentity,
    },
    width: {
        makeAttrValue: attrNumberToString,
        idlName: 'width',
        makeIdlValue: attrIdentity,
    },
    height: {
        makeAttrValue: attrNumberToString,
        idlName: 'height',
        makeIdlValue: attrIdentity,
    },
    referrerpolicy: {
        makeAttrValue: attrIdentity,
        idlName: 'referrerPolicy',
        makeIdlValue: attrIdentity,
    },
    loading: {
        makeAttrValue: attrIdentity,
        idlName: 'loading',
        makeIdlValue: attrIdentity,
    },
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

const HTMLImageElementMap: PropertyMap<
    JSXImageElementInterface,
    HTMLImageElement
> = {
    ...HTMLElementMap,
    alt: {
        makeAttrValue: attrIdentity,
        idlName: 'alt',
        makeIdlValue: attrIdentity,
    },
    src: {
        makeAttrValue: attrIdentity,
        idlName: 'src',
        makeIdlValue: attrIdentity,
    },
    srcset: {
        makeAttrValue: attrIdentity,
        idlName: 'srcset',
        makeIdlValue: attrIdentity,
    },
    sizes: {
        makeAttrValue: attrIdentity,
        idlName: 'sizes',
        makeIdlValue: attrIdentity,
    },
    crossorigin: {
        makeAttrValue: attrIdentity,
        idlName: 'crossOrigin',
        makeIdlValue: attrIdentity,
    },
    usemap: {
        makeAttrValue: attrIdentity,
        idlName: 'useMap',
        makeIdlValue: attrIdentity,
    },
    ismap: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'isMap',
        makeIdlValue: attrIdentity,
    },
    width: {
        makeAttrValue: attrNumberToString,
        idlName: 'width',
        makeIdlValue: attrIdentity,
    },
    height: {
        makeAttrValue: attrNumberToString,
        idlName: 'height',
        makeIdlValue: attrIdentity,
    },
    referrerpolicy: {
        makeAttrValue: attrIdentity,
        idlName: 'referrerPolicy',
        makeIdlValue: attrIdentity,
    },
    decoding: {
        makeAttrValue: attrIdentity,
        idlName: 'decoding',
        makeIdlValue: attrIdentity,
    },
    loading: {
        makeAttrValue: attrIdentity,
        idlName: 'loading',
        makeIdlValue: attrIdentity,
    },
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
const HTMLInputElementMap: PropertyMap<
    JSXInputElementInterface,
    HTMLInputElement
> = {
    ...HTMLElementMap,
    accept: {
        makeAttrValue: attrIdentity,
        idlName: 'accept',
        makeIdlValue: attrIdentity,
    },
    alt: {
        makeAttrValue: attrIdentity,
        idlName: 'alt',
        makeIdlValue: attrIdentity,
    },
    autocomplete: {
        makeAttrValue: attrIdentity,
        idlName: 'autocomplete',
        makeIdlValue: attrIdentity,
    },
    checked: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'checked',
        makeIdlValue: attrIdentity,
    },
    dirname: {
        makeAttrValue: attrIdentity,
        idlName: 'dirName',
        makeIdlValue: attrIdentity,
    },
    disabled: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'disabled',
        makeIdlValue: attrIdentity,
    },
    form: {
        makeAttrValue: attrIdentity,
        idlName: 'form',
        makeIdlValue: attrIdentity,
    },
    formaction: {
        makeAttrValue: attrIdentity,
        idlName: 'formAction',
        makeIdlValue: attrIdentity,
    },
    formenctype: {
        makeAttrValue: attrIdentity,
        idlName: 'formEnctype',
        makeIdlValue: attrIdentity,
    },
    formmethod: {
        makeAttrValue: attrIdentity,
        idlName: 'formMethod',
        makeIdlValue: attrIdentity,
    },
    formnovalidate: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'formNoValidate',
        makeIdlValue: attrIdentity,
    },
    formtarget: {
        makeAttrValue: attrIdentity,
        idlName: 'formTarget',
        makeIdlValue: attrIdentity,
    },
    height: {
        makeAttrValue: attrNumberToString,
        idlName: 'height',
        makeIdlValue: attrIdentity,
    },
    indeterminate: {
        idlName: 'indeterminate',
        makeIdlValue: attrIdentity,
    },
    list: {
        makeAttrValue: attrIdentity,
        idlName: 'list',
        makeIdlValue: attrIdentity,
    },
    max: {
        makeAttrValue: attrNumberToString,
        idlName: 'max',
        makeIdlValue: attrIdentity,
    },
    maxlength: {
        makeAttrValue: attrNumberToString,
        idlName: 'maxLength',
        makeIdlValue: attrIdentity,
    },
    min: {
        makeAttrValue: attrNumberToString,
        idlName: 'min',
        makeIdlValue: attrIdentity,
    },
    minlength: {
        makeAttrValue: attrNumberToString,
        idlName: 'minLength',
        makeIdlValue: attrIdentity,
    },
    multiple: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'multiple',
        makeIdlValue: attrIdentity,
    },
    name: {
        makeAttrValue: attrIdentity,
        idlName: 'name',
        makeIdlValue: attrIdentity,
    },
    pattern: {
        makeAttrValue: attrIdentity,
        idlName: 'pattern',
        makeIdlValue: attrIdentity,
    },
    placeholder: {
        makeAttrValue: attrIdentity,
        idlName: 'placeholder',
        makeIdlValue: attrIdentity,
    },
    readonly: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'readOnly',
        makeIdlValue: attrIdentity,
    },
    required: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'required',
        makeIdlValue: attrIdentity,
    },
    size: {
        makeAttrValue: attrNumberToString,
        idlName: 'size',
        makeIdlValue: attrIdentity,
    },
    src: {
        makeAttrValue: attrIdentity,
        idlName: 'src',
        makeIdlValue: attrIdentity,
    },
    step: {
        makeAttrValue: attrNumberToString,
        idlName: 'step',
        makeIdlValue: attrIdentity,
    },
    type: {
        makeAttrValue: attrIdentity,
        idlName: 'type',
        makeIdlValue: attrIdentity,
    },
    value: {
        makeAttrValue: attrIdentity,
        idlName: 'value',
        makeIdlValue: attrIdentity,
    },
    width: {
        makeAttrValue: attrNumberToString,
        idlName: 'width',
        makeIdlValue: attrIdentity,
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
    cite: {
        makeAttrValue: attrIdentity,
        idlName: 'cite',
        makeIdlValue: attrIdentity,
    },
    datetime: {
        makeAttrValue: attrIdentity,
        idlName: 'dateTime',
        makeIdlValue: attrIdentity,
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
        makeAttrValue: attrIdentity,
        idlName: 'htmlFor',
        makeIdlValue: attrIdentity,
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
    value: {
        makeAttrValue: attrIdentity,
        idlName: 'value',
        makeIdlValue: attrIdentity,
    },
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
    href: {
        makeAttrValue: attrIdentity,
        idlName: 'href',
        makeIdlValue: attrIdentity,
    },
    crossorigin: {
        makeAttrValue: attrIdentity,
        idlName: 'crossOrigin',
        makeIdlValue: attrIdentity,
    },
    rel: {
        makeAttrValue: attrIdentity,
        idlName: 'rel',
        makeIdlValue: attrIdentity,
    },
    media: {
        makeAttrValue: attrIdentity,
        idlName: 'media',
        makeIdlValue: attrIdentity,
    },
    integrity: {
        makeAttrValue: attrIdentity,
        idlName: 'integrity',
        makeIdlValue: attrIdentity,
    },
    hreflang: {
        makeAttrValue: attrIdentity,
        idlName: 'hreflang',
        makeIdlValue: attrIdentity,
    },
    type: {
        makeAttrValue: attrIdentity,
        idlName: 'type',
        makeIdlValue: attrIdentity,
    },
    referrerpolicy: {
        makeAttrValue: attrIdentity,
        idlName: 'referrerPolicy',
        makeIdlValue: attrIdentity,
    },
    sizes: {
        makeAttrValue: attrIdentity,
        idlName: 'sizes',
        makeIdlValue: attrIdentity,
    },
    imagesrcset: {
        makeAttrValue: attrIdentity,
        idlName: 'imageSrcset',
        makeIdlValue: attrIdentity,
    },
    imagesizes: {
        makeAttrValue: attrIdentity,
        idlName: 'imageSizes',
        makeIdlValue: attrIdentity,
    },
    as: {
        makeAttrValue: attrIdentity,
        idlName: 'as',
        makeIdlValue: attrIdentity,
    },
    color: {
        makeAttrValue: attrIdentity,
    },
    disabled: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'disabled',
        makeIdlValue: attrIdentity,
    },
};

interface JSXMapElementInterface extends JSXElementInterface {
    /** Name of image map to reference from the usemap attribute */
    name?: string | undefined;
}

const HTMLMapElementMap: PropertyMap<JSXMapElementInterface, HTMLMapElement> = {
    ...HTMLElementMap,
    name: {
        makeAttrValue: attrIdentity,
        idlName: 'name',
        makeIdlValue: attrIdentity,
    },
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
    name: {
        makeAttrValue: attrIdentity,
        idlName: 'name',
        makeIdlValue: attrIdentity,
    },
    'http-equiv': {
        makeAttrValue: attrIdentity,
        idlName: 'httpEquiv',
        makeIdlValue: attrIdentity,
    },
    content: {
        makeAttrValue: attrIdentity,
        idlName: 'content',
        makeIdlValue: attrIdentity,
    },
    charset: {
        makeAttrValue: attrIdentity,
    },
    media: {
        makeAttrValue: attrIdentity,
        idlName: 'media',
        makeIdlValue: attrIdentity,
    },
};

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

const HTMLMeterElementMap: PropertyMap<
    JSXMeterElementInterface,
    HTMLMeterElement
> = {
    ...HTMLElementMap,
    value: {
        makeAttrValue: attrNumberToString,
        idlName: 'value',
        makeIdlValue: attrIdentity,
    },
    min: {
        makeAttrValue: attrNumberToString,
        idlName: 'min',
        makeIdlValue: attrIdentity,
    },
    max: {
        makeAttrValue: attrNumberToString,
        idlName: 'max',
        makeIdlValue: attrIdentity,
    },
    low: {
        makeAttrValue: attrNumberToString,
        idlName: 'low',
        makeIdlValue: attrIdentity,
    },
    high: {
        makeAttrValue: attrNumberToString,
        idlName: 'high',
        makeIdlValue: attrIdentity,
    },
    optimum: {
        makeAttrValue: attrNumberToString,
        idlName: 'optimum',
        makeIdlValue: attrIdentity,
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
    data: {
        makeAttrValue: attrIdentity,
        idlName: 'data',
        makeIdlValue: attrIdentity,
    },
    type: {
        makeAttrValue: attrIdentity,
        idlName: 'type',
        makeIdlValue: attrIdentity,
    },
    name: {
        makeAttrValue: attrIdentity,
        idlName: 'name',
        makeIdlValue: attrIdentity,
    },
    form: {
        makeAttrValue: attrIdentity,
    },
    width: {
        makeAttrValue: attrIdentity,
        idlName: 'width',
        makeIdlValue: attrIdentity,
    },
    height: {
        makeAttrValue: attrIdentity,
        idlName: 'height',
        makeIdlValue: attrIdentity,
    },
};

interface JSXOListElementInterface extends JSXElementInterface {
    /** Number the list backwards */
    reversed?: boolean | undefined;
    /** Starting value of the list */
    start?: number | undefined;
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
    reversed: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'reversed',
        makeIdlValue: attrIdentity,
    },
    start: {
        makeAttrValue: attrNumberToString,
        idlName: 'start',
        makeIdlValue: attrIdentity,
    },
    type: {
        makeAttrValue: attrIdentity,
        idlName: 'type',
        makeIdlValue: attrIdentity,
    },
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
    disabled: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'disabled',
        makeIdlValue: attrIdentity,
    },
    label: {
        makeAttrValue: attrIdentity,
        idlName: 'label',
        makeIdlValue: attrIdentity,
    },
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
    disabled: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'disabled',
        makeIdlValue: attrIdentity,
    },
    label: {
        makeAttrValue: attrIdentity,
        idlName: 'label',
        makeIdlValue: attrIdentity,
    },
    selected: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'selected',
        makeIdlValue: attrIdentity,
    },
    value: {
        makeAttrValue: attrIdentity,
        idlName: 'value',
        makeIdlValue: attrIdentity,
    },
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
        makeAttrValue: attrIdentity,
        idlName: 'htmlFor',
        makeIdlValue: attrIdentity,
    },
    form: { makeAttrValue: attrIdentity },
    name: {
        makeAttrValue: attrIdentity,
        idlName: 'name',
        makeIdlValue: attrIdentity,
    },
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
    name: {
        makeAttrValue: attrIdentity,
        idlName: 'name',
        makeIdlValue: attrIdentity,
    },
    value: {
        makeAttrValue: attrIdentity,
        idlName: 'value',
        makeIdlValue: attrIdentity,
    },
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
    value?: number | undefined;
    /** Upper bound of range */
    max?: number | undefined;
}

const HTMLProgressElementMap: PropertyMap<
    JSXProgressElementInterface,
    HTMLProgressElement
> = {
    ...HTMLElementMap,
    value: {
        makeAttrValue: attrNumberToString,
        idlName: 'value',
        makeIdlValue: attrIdentity,
    },
    max: {
        makeAttrValue: attrNumberToString,
        idlName: 'max',
        makeIdlValue: attrIdentity,
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
    cite: {
        makeAttrValue: attrIdentity,
        idlName: 'cite',
        makeIdlValue: attrIdentity,
    },
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
    src: {
        makeAttrValue: attrIdentity,
        idlName: 'src',
        makeIdlValue: attrIdentity,
    },
    type: {
        makeAttrValue: attrIdentity,
        idlName: 'type',
        makeIdlValue: attrIdentity,
    },
    nomodule: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'noModule',
        makeIdlValue: attrIdentity,
    },
    async: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'async',
        makeIdlValue: attrIdentity,
    },
    defer: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'defer',
        makeIdlValue: attrIdentity,
    },
    crossorigin: {
        makeAttrValue: attrIdentity,
        idlName: 'crossOrigin',
        makeIdlValue: attrIdentity,
    },
    integrity: {
        makeAttrValue: attrIdentity,
        idlName: 'integrity',
        makeIdlValue: attrIdentity,
    },
    referrerpolicy: {
        makeAttrValue: attrIdentity,
        idlName: 'referrerPolicy',
        makeIdlValue: attrIdentity,
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
    size?: number | undefined;
    /** Value of the element */
    value?: string | undefined;
}

const HTMLSelectElementMap: PropertyMap<
    JSXSelectElementInterface,
    HTMLSelectElement
> = {
    ...HTMLElementMap,
    autocomplete: {
        makeAttrValue: attrIdentity,
        idlName: 'autocomplete',
        makeIdlValue: attrIdentity,
    },
    disabled: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'disabled',
        makeIdlValue: attrIdentity,
    },
    form: { makeAttrValue: attrIdentity },
    multiple: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'multiple',
        makeIdlValue: attrIdentity,
    },
    name: {
        makeAttrValue: attrIdentity,
        idlName: 'name',
        makeIdlValue: attrIdentity,
    },
    required: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'required',
        makeIdlValue: attrIdentity,
    },
    size: {
        makeAttrValue: attrNumberToString,
        idlName: 'size',
        makeIdlValue: attrIdentity,
    },
    value: { idlName: 'value', makeIdlValue: attrIdentity },
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
    name: {
        makeAttrValue: attrIdentity,
        idlName: 'name',
        makeIdlValue: attrIdentity,
    },
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
    width?: number | undefined;
    /** (in picture) — Vertical dimension */
    height?: number | undefined;
}

const HTMLSourceElementMap: PropertyMap<
    JSXSourceElementInterface,
    HTMLSourceElement & MissingFromTypescriptHTMLSourceElementProperties
> = {
    ...HTMLElementMap,
    type: {
        makeAttrValue: attrIdentity,
        idlName: 'type',
        makeIdlValue: attrIdentity,
    },
    src: {
        makeAttrValue: attrIdentity,
        idlName: 'src',
        makeIdlValue: attrIdentity,
    },
    srcset: {
        makeAttrValue: attrIdentity,
        idlName: 'srcset',
        makeIdlValue: attrIdentity,
    },
    sizes: {
        makeAttrValue: attrIdentity,
        idlName: 'sizes',
        makeIdlValue: attrIdentity,
    },
    media: {
        makeAttrValue: attrIdentity,
        idlName: 'media',
        makeIdlValue: attrIdentity,
    },
    width: {
        makeAttrValue: attrNumberToString,
        idlName: 'width',
        makeIdlValue: attrIdentity,
    },
    height: {
        makeAttrValue: attrNumberToString,
        idlName: 'height',
        makeIdlValue: attrIdentity,
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
    media: {
        makeAttrValue: attrIdentity,
        idlName: 'media',
        makeIdlValue: attrIdentity,
    },
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
    colspan?: number | undefined;
    /** Number of rows that the cell is to span */
    rowspan?: number | undefined;
    /** The header cells for this cell */
    headers?: string | undefined;
}

const HTMLTableCellElementMap: PropertyMap<
    JSXTableCellElementInterface,
    HTMLTableCellElement
> = {
    ...HTMLElementMap,
    colspan: {
        makeAttrValue: attrNumberToString,
        idlName: 'colSpan',
        makeIdlValue: attrIdentity,
    },
    rowspan: {
        makeAttrValue: attrNumberToString,
        idlName: 'rowSpan',
        makeIdlValue: attrIdentity,
    },
    headers: {
        makeAttrValue: attrIdentity,
        idlName: 'headers',
        makeIdlValue: attrIdentity,
    },
};

interface JSXTableColElementInterface extends JSXElementInterface {
    /** Number of columns spanned by the element */
    span?: number | undefined;
}

const HTMLTableColElementMap: PropertyMap<
    JSXTableColElementInterface,
    HTMLTableColElement
> = {
    ...HTMLElementMap,
    span: {
        makeAttrValue: attrNumberToString,
        idlName: 'span',
        makeIdlValue: attrIdentity,
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

const HTMLTextAreaElementMap: PropertyMap<
    JSXTextAreaElementInterface,
    HTMLTextAreaElement
> = {
    ...HTMLElementMap,
    autocomplete: {
        makeAttrValue: attrIdentity,
        idlName: 'autocomplete',
        makeIdlValue: attrIdentity,
    },
    cols: {
        makeAttrValue: attrNumberToString,
        idlName: 'cols',
        makeIdlValue: attrIdentity,
    },
    dirname: {
        makeAttrValue: attrIdentity,
        idlName: 'dirName',
        makeIdlValue: attrIdentity,
    },
    disabled: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'disabled',
        makeIdlValue: attrIdentity,
    },
    form: { makeAttrValue: attrIdentity },
    maxlength: {
        makeAttrValue: attrNumberToString,
        idlName: 'maxLength',
        makeIdlValue: attrIdentity,
    },
    minlength: {
        makeAttrValue: attrNumberToString,
        idlName: 'minLength',
        makeIdlValue: attrIdentity,
    },
    name: {
        makeAttrValue: attrIdentity,
        idlName: 'name',
        makeIdlValue: attrIdentity,
    },
    placeholder: {
        makeAttrValue: attrIdentity,
        idlName: 'placeholder',
        makeIdlValue: attrIdentity,
    },
    readonly: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'readOnly',
        makeIdlValue: attrIdentity,
    },
    required: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'required',
        makeIdlValue: attrIdentity,
    },
    rows: {
        makeAttrValue: attrNumberToString,
        idlName: 'rows',
        makeIdlValue: attrIdentity,
    },
    wrap: {
        makeAttrValue: attrIdentity,
        idlName: 'wrap',
        makeIdlValue: attrIdentity,
    },
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
        makeAttrValue: attrIdentity,
        idlName: 'dateTime',
        makeIdlValue: attrIdentity,
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
    kind: {
        makeAttrValue: attrIdentity,
        idlName: 'kind',
        makeIdlValue: attrIdentity,
    },
    src: {
        makeAttrValue: attrIdentity,
        idlName: 'src',
        makeIdlValue: attrIdentity,
    },
    srclang: {
        makeAttrValue: attrIdentity,
        idlName: 'srclang',
        makeIdlValue: attrIdentity,
    },
    label: {
        makeAttrValue: attrIdentity,
        idlName: 'label',
        makeIdlValue: attrIdentity,
    },
    default: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'default',
        makeIdlValue: attrIdentity,
    },
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
    width?: number | undefined;
    /** Vertical dimension */
    height?: number | undefined;
}

const HTMLVideoElementMap: PropertyMap<
    JSXVideoElementInterface,
    HTMLVideoElement
> = {
    ...HTMLElementMap,
    src: {
        makeAttrValue: attrIdentity,
        idlName: 'src',
        makeIdlValue: attrIdentity,
    },
    crossorigin: {
        makeAttrValue: attrIdentity,
        idlName: 'crossOrigin',
        makeIdlValue: attrIdentity,
    },
    preload: {
        makeAttrValue: attrIdentity,
        idlName: 'preload',
        makeIdlValue: attrIdentity,
    },
    autoplay: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'autoplay',
        makeIdlValue: attrIdentity,
    },
    loop: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'loop',
        makeIdlValue: attrBooleanToEmptyString,
    },
    muted: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'muted',
        makeIdlValue: attrIdentity,
    },
    controls: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'controls',
        makeIdlValue: attrIdentity,
    },
    poster: {
        makeAttrValue: attrIdentity,
        idlName: 'poster',
        makeIdlValue: attrIdentity,
    },
    playsinline: {
        makeAttrValue: attrIdentity,
        idlName: 'playsInline',
        makeIdlValue: attrIdentity,
    },
    width: {
        makeAttrValue: attrNumberToString,
        idlName: 'width',
        makeIdlValue: attrIdentity,
    },
    height: {
        makeAttrValue: attrNumberToString,
        idlName: 'height',
        makeIdlValue: attrIdentity,
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
    image: HTMLImageElementMap,
    img: HTMLElementMap,
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
    th: HTMLElementMap,
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

type WithCalculationsAndRef<
    TJSXType extends JSXElementInterface,
    TElement extends HTMLElement
> = {
    ref?: undefined | Ref<TElement> | ((current: TElement | undefined) => void);

    'on:abort'?: (event: Event) => void;
    'on:auxclick'?: (event: PointerEvent) => void;
    'on:beforeinput'?: (event: InputEvent) => void;
    'on:blur'?: (event: FocusEvent) => void;
    'on:cancel'?: (event: Event) => void;
    'on:change'?: (event: Event) => void;
    'on:click'?: (event: PointerEvent) => void;
    'on:close'?: (event: Event) => void;
    'on:compositionend'?: (event: CompositionEvent) => void;
    'on:compositionstart'?: (event: CompositionEvent) => void;
    'on:compositionupdate'?: (event: CompositionEvent) => void;
    'on:connect'?: (event: MessageEvent) => void;
    'on:contextlost'?: (event: Event) => void;
    'on:contextmenu'?: (event: PointerEvent) => void;
    'on:contextrestored'?: (event: Event) => void;
    'on:copy'?: (event: Event) => void;
    'on:cut'?: (event: Event) => void;
    'on:dblclick'?: (event: MouseEvent) => void;
    'on:drag'?: (event: DragEvent) => void;
    'on:dragend'?: (event: DragEvent) => void;
    'on:dragenter'?: (event: DragEvent) => void;
    'on:dragleave'?: (event: DragEvent) => void;
    'on:dragover'?: (event: DragEvent) => void;
    'on:dragstart'?: (event: DragEvent) => void;
    'on:drop'?: (event: DragEvent) => void;
    'on:emptied'?: (event: Event) => void;
    'on:error'?: (event: Event) => void;
    'on:focus'?: (event: FocusEvent) => void;
    'on:focusin'?: (event: FocusEvent) => void;
    'on:focusout'?: (event: FocusEvent) => void;
    'on:formdata'?: (event: FormDataEvent) => void;
    'on:hashchange'?: (event: HashChangeEvent) => void;
    'on:input'?: (event: InputEvent) => void;
    'on:invalid'?: (event: Event) => void;
    'on:keydown'?: (event: KeyboardEvent) => void;
    'on:keyup'?: (event: KeyboardEvent) => void;
    'on:languagechange'?: (event: Event) => void;
    'on:load'?: (event: Event) => void;
    'on:loadstart'?: (event: Event) => void;
    'on:message'?: (event: MessageEvent) => void;
    'on:messageerror'?: (event: MessageEvent) => void;
    'on:mousedown'?: (event: MouseEvent) => void;
    'on:mouseenter'?: (event: MouseEvent) => void;
    'on:mouseleave'?: (event: MouseEvent) => void;
    'on:mousemove'?: (event: MouseEvent) => void;
    'on:mouseout'?: (event: MouseEvent) => void;
    'on:mouseover'?: (event: MouseEvent) => void;
    'on:mouseup'?: (event: MouseEvent) => void;
    'on:offline'?: (event: Event) => void;
    'on:online'?: (event: Event) => void;
    'on:open'?: (event: Event) => void;
    'on:pagehide'?: (event: PageTransitionEvent) => void;
    'on:pageshow'?: (event: PageTransitionEvent) => void;
    'on:paste'?: (event: Event) => void;
    'on:popstate'?: (event: PopStateEvent) => void;
    'on:progress'?: (event: Event) => void;
    'on:readystatechange'?: (event: Event) => void;
    'on:rejectionhandled'?: (event: PromiseRejectionEvent) => void;
    'on:reset'?: (event: Event) => void;
    'on:securitypolicyviolation'?: (event: Event) => void;
    'on:select'?: (event: Event) => void;
    'on:slotchange'?: (event: Event) => void;
    'on:stalled'?: (event: Event) => void;
    'on:storage'?: (event: StorageEvent) => void;
    'on:submit'?: (event: SubmitEvent) => void;
    'on:suspend'?: (event: Event) => void;
    'on:toggle'?: (event: Event) => void;
    'on:unhandledrejection'?: (event: PromiseRejectionEvent) => void;
    'on:unload'?: (event: Event) => void;
    'on:visibilitychange'?: (event: Event) => void;
    'on:wheel'?: (event: WheelEvent) => void;
} & {
    //[key: `on:${string}`]: EventHandler<Event> | undefined;
    [key: `data-${string}`]:
        | Calculation<string | undefined>
        | string
        | undefined;
} & {
    [Key in keyof TJSXType]: Calculation<TJSXType[Key]> | TJSXType[Key];
};

export interface KnownElements {
    a: WithCalculationsAndRef<JSXAnchorElementInterface, HTMLAnchorElement>;
    abbr: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    address: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    area: WithCalculationsAndRef<JSXAreaElementInterface, HTMLAreaElement>;
    article: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    aside: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    audio: WithCalculationsAndRef<JSXAudioElementInterface, HTMLAudioElement>;
    b: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    base: WithCalculationsAndRef<JSXBaseElementInterface, HTMLBaseElement>;
    bdi: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    bdo: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    blockquote: WithCalculationsAndRef<
        JSXQuoteElementInterface,
        HTMLQuoteElement
    >;
    body: WithCalculationsAndRef<JSXBodyElementInterface, HTMLBodyElement>;
    br: WithCalculationsAndRef<JSXBRElementInterface, HTMLBRElement>;
    button: WithCalculationsAndRef<
        JSXButtonElementInterface,
        HTMLButtonElement
    >;
    canvas: WithCalculationsAndRef<
        JSXCanvasElementInterface,
        HTMLCanvasElement
    >;
    caption: WithCalculationsAndRef<
        JSXTableCaptionElementInterface,
        HTMLTableCaptionElement
    >;
    cite: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    code: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    col: WithCalculationsAndRef<
        JSXTableColElementInterface,
        HTMLTableColElement
    >;
    colgroup: WithCalculationsAndRef<
        JSXTableColElementInterface,
        HTMLTableColElement
    >;
    data: WithCalculationsAndRef<JSXDataElementInterface, HTMLDataElement>;
    datalist: WithCalculationsAndRef<
        JSXDataListElementInterface,
        HTMLDataListElement
    >;
    dd: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    del: WithCalculationsAndRef<JSXModElementInterface, HTMLModElement>;
    details: WithCalculationsAndRef<
        JSXDetailsElementInterface,
        HTMLDetailsElement
    >;
    dfn: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    dialog: WithCalculationsAndRef<
        JSXDialogElementInterface,
        HTMLDialogElement
    >;
    div: WithCalculationsAndRef<JSXDivElementInterface, HTMLDivElement>;
    dl: WithCalculationsAndRef<JSXDListElementInterface, HTMLDListElement>;
    dt: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    em: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    embed: WithCalculationsAndRef<JSXEmbedElementInterface, HTMLEmbedElement>;
    fieldset: WithCalculationsAndRef<
        JSXFieldSetElementInterface,
        HTMLFieldSetElement
    >;
    figcaption: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    figure: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    footer: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    form: WithCalculationsAndRef<JSXFormElementInterface, HTMLFormElement>;
    h1: WithCalculationsAndRef<JSXHeadingElementInterface, HTMLHeadingElement>;
    h2: WithCalculationsAndRef<JSXHeadingElementInterface, HTMLHeadingElement>;
    h3: WithCalculationsAndRef<JSXHeadingElementInterface, HTMLHeadingElement>;
    h4: WithCalculationsAndRef<JSXHeadingElementInterface, HTMLHeadingElement>;
    h5: WithCalculationsAndRef<JSXHeadingElementInterface, HTMLHeadingElement>;
    h6: WithCalculationsAndRef<JSXHeadingElementInterface, HTMLHeadingElement>;
    head: WithCalculationsAndRef<JSXHeadElementInterface, HTMLHeadElement>;
    header: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    hgroup: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    hr: WithCalculationsAndRef<JSXHRElementInterface, HTMLHRElement>;
    html: WithCalculationsAndRef<JSXHtmlElementInterface, HTMLHtmlElement>;
    i: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    iframe: WithCalculationsAndRef<
        JSXIFrameElementInterface,
        HTMLIFrameElement
    >;
    img: WithCalculationsAndRef<JSXImageElementInterface, HTMLImageElement>;
    input: WithCalculationsAndRef<JSXInputElementInterface, HTMLInputElement>;
    ins: WithCalculationsAndRef<JSXModElementInterface, HTMLModElement>;
    kbd: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    label: WithCalculationsAndRef<JSXLabelElementInterface, HTMLLabelElement>;
    legend: WithCalculationsAndRef<
        JSXLegendElementInterface,
        HTMLLegendElement
    >;
    li: WithCalculationsAndRef<JSXLIElementInterface, HTMLLIElement>;
    link: WithCalculationsAndRef<JSXLinkElementInterface, HTMLLinkElement>;
    main: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    map: WithCalculationsAndRef<JSXMapElementInterface, HTMLMapElement>;
    mark: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    menu: WithCalculationsAndRef<JSXMenuElementInterface, HTMLMenuElement>;
    meta: WithCalculationsAndRef<JSXMetaElementInterface, HTMLMetaElement>;
    meter: WithCalculationsAndRef<JSXMeterElementInterface, HTMLMeterElement>;
    nav: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    noscript: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    object: WithCalculationsAndRef<
        JSXObjectElementInterface,
        HTMLObjectElement
    >;
    ol: WithCalculationsAndRef<JSXOListElementInterface, HTMLOListElement>;
    optgroup: WithCalculationsAndRef<
        JSXOptGroupElementInterface,
        HTMLOptGroupElement
    >;
    option: WithCalculationsAndRef<
        JSXOptionElementInterface,
        HTMLOptionElement
    >;
    output: WithCalculationsAndRef<
        JSXOutputElementInterface,
        HTMLOutputElement
    >;
    p: WithCalculationsAndRef<
        JSXParagraphElementInterface,
        HTMLParagraphElement
    >;
    param: WithCalculationsAndRef<JSXParamElementInterface, HTMLParamElement>;
    picture: WithCalculationsAndRef<
        JSXPictureElementInterface,
        HTMLPictureElement
    >;
    pre: WithCalculationsAndRef<JSXPreElementInterface, HTMLPreElement>;
    progress: WithCalculationsAndRef<
        JSXProgressElementInterface,
        HTMLProgressElement
    >;
    q: WithCalculationsAndRef<JSXQuoteElementInterface, HTMLQuoteElement>;
    rp: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    rt: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    ruby: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    s: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    samp: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    script: WithCalculationsAndRef<
        JSXScriptElementInterface,
        HTMLScriptElement
    >;
    section: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    select: WithCalculationsAndRef<
        JSXSelectElementInterface,
        HTMLSelectElement
    >;
    slot: WithCalculationsAndRef<JSXSlotElementInterface, HTMLSlotElement>;
    small: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    source: WithCalculationsAndRef<
        JSXSourceElementInterface,
        HTMLSourceElement
    >;
    span: WithCalculationsAndRef<JSXSpanElementInterface, HTMLSpanElement>;
    strong: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    style: WithCalculationsAndRef<JSXStyleElementInterface, HTMLStyleElement>;
    sub: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    summary: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    sup: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    table: WithCalculationsAndRef<JSXTableElementInterface, HTMLTableElement>;
    tbody: WithCalculationsAndRef<
        JSXTableSectionElementInterface,
        HTMLTableSectionElement
    >;
    td: WithCalculationsAndRef<
        JSXTableCellElementInterface,
        HTMLTableCellElement
    >;
    template: WithCalculationsAndRef<
        JSXTemplateElementInterface,
        HTMLTemplateElement
    >;
    textarea: WithCalculationsAndRef<
        JSXTextAreaElementInterface,
        HTMLTextAreaElement
    >;
    tfoot: WithCalculationsAndRef<
        JSXTableSectionElementInterface,
        HTMLTableSectionElement
    >;
    th: WithCalculationsAndRef<
        JSXTableCellElementInterface,
        HTMLTableCellElement
    >;
    thead: WithCalculationsAndRef<
        JSXTableSectionElementInterface,
        HTMLTableSectionElement
    >;
    time: WithCalculationsAndRef<JSXTimeElementInterface, HTMLTimeElement>;
    title: WithCalculationsAndRef<JSXTitleElementInterface, HTMLTitleElement>;
    tr: WithCalculationsAndRef<
        JSXTableRowElementInterface,
        HTMLTableRowElement
    >;
    track: WithCalculationsAndRef<JSXTrackElementInterface, HTMLTrackElement>;
    u: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    ul: WithCalculationsAndRef<JSXUListElementInterface, HTMLUListElement>;
    var: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    video: WithCalculationsAndRef<JSXVideoElementInterface, HTMLVideoElement>;
    wbr: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
        interface IntrinsicElements extends KnownElements {
            [unknownElement: string]: any;
        }
        type Element = JSXNode;
    }
}
