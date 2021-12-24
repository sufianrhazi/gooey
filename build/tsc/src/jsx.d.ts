import { TypeTag, Ref, Calculation, Collection } from './types';
declare type PropsWithChildren<P> = P & {
    children?: JSXNode[];
};
declare type OnUnmountCallback = () => void;
declare type OnMountCallback = () => void;
declare type EffectCallback = () => void;
declare type ComponentListeners = {
    onUnmount: (callback: OnUnmountCallback) => void;
    onMount: (callback: OnMountCallback) => void;
    onEffect: (callback: EffectCallback) => void;
};
export declare type Component<P extends {}> = (props: PropsWithChildren<P>, listeners: ComponentListeners) => JSXNode;
declare type JsxRawNode = string | number | boolean | null | undefined | Function;
/**
 * The type returnable by JSX (raw nodes)
 */
declare type JSXNodeSingle = JsxRawNode | Calculation<JsxRawNode> | Calculation<JsxRawNode[]> | RenderElement<any> | RenderComponent<any>;
export declare type JSXNode = JSXNodeSingle | JSXNodeSingle[] | Collection<JSXNodeSingle>;
export declare type RenderElement<ElementName extends keyof JSX.IntrinsicElements> = {
    [TypeTag]: 'element';
    element: ElementName;
    props?: JSX.IntrinsicElements[ElementName];
    children: JSXNode[];
};
export declare function isRenderElement(jsxNode: JSXNode): jsxNode is RenderElement<any>;
export declare type RenderComponent<Props extends {}> = {
    [TypeTag]: 'component';
    component: Component<Props>;
    props?: Props;
    children: JSXNode[];
};
export declare function isRenderComponent(jsxNode: JSXNode): jsxNode is RenderComponent<any>;
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
    makeAttrValue?: (jsxAttr: Exclude<TJSXField, undefined>) => string | undefined;
} | {
    makeAttrValue?: (jsxAttr: Exclude<TJSXField, undefined>) => string | undefined;
    idlName: TIDLName;
    makeIdlValue: (jsxAttr: Exclude<TJSXField, undefined>) => TElement[TIDLName];
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
    sandbox?: SandboxValue[] | undefined;
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
declare type WithCalculationsAndRef<TJSXType extends JSXElementInterface, TElement extends HTMLElement> = {
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
    [key: `data-${string}`]: Calculation<string | undefined> | string | undefined;
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
    blockquote: WithCalculationsAndRef<JSXQuoteElementInterface, HTMLQuoteElement>;
    body: WithCalculationsAndRef<JSXBodyElementInterface, HTMLBodyElement>;
    br: WithCalculationsAndRef<JSXBRElementInterface, HTMLBRElement>;
    button: WithCalculationsAndRef<JSXButtonElementInterface, HTMLButtonElement>;
    canvas: WithCalculationsAndRef<JSXCanvasElementInterface, HTMLCanvasElement>;
    caption: WithCalculationsAndRef<JSXTableCaptionElementInterface, HTMLTableCaptionElement>;
    cite: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    code: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    col: WithCalculationsAndRef<JSXTableColElementInterface, HTMLTableColElement>;
    colgroup: WithCalculationsAndRef<JSXTableColElementInterface, HTMLTableColElement>;
    data: WithCalculationsAndRef<JSXDataElementInterface, HTMLDataElement>;
    datalist: WithCalculationsAndRef<JSXDataListElementInterface, HTMLDataListElement>;
    dd: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    del: WithCalculationsAndRef<JSXModElementInterface, HTMLModElement>;
    details: WithCalculationsAndRef<JSXDetailsElementInterface, HTMLDetailsElement>;
    dfn: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    dialog: WithCalculationsAndRef<JSXDialogElementInterface, HTMLDialogElement>;
    div: WithCalculationsAndRef<JSXDivElementInterface, HTMLDivElement>;
    dl: WithCalculationsAndRef<JSXDListElementInterface, HTMLDListElement>;
    dt: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    em: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    embed: WithCalculationsAndRef<JSXEmbedElementInterface, HTMLEmbedElement>;
    fieldset: WithCalculationsAndRef<JSXFieldSetElementInterface, HTMLFieldSetElement>;
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
    iframe: WithCalculationsAndRef<JSXIFrameElementInterface, HTMLIFrameElement>;
    img: WithCalculationsAndRef<JSXImageElementInterface, HTMLImageElement>;
    input: WithCalculationsAndRef<JSXInputElementInterface, HTMLInputElement>;
    ins: WithCalculationsAndRef<JSXModElementInterface, HTMLModElement>;
    kbd: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    label: WithCalculationsAndRef<JSXLabelElementInterface, HTMLLabelElement>;
    legend: WithCalculationsAndRef<JSXLegendElementInterface, HTMLLegendElement>;
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
    object: WithCalculationsAndRef<JSXObjectElementInterface, HTMLObjectElement>;
    ol: WithCalculationsAndRef<JSXOListElementInterface, HTMLOListElement>;
    optgroup: WithCalculationsAndRef<JSXOptGroupElementInterface, HTMLOptGroupElement>;
    option: WithCalculationsAndRef<JSXOptionElementInterface, HTMLOptionElement>;
    output: WithCalculationsAndRef<JSXOutputElementInterface, HTMLOutputElement>;
    p: WithCalculationsAndRef<JSXParagraphElementInterface, HTMLParagraphElement>;
    param: WithCalculationsAndRef<JSXParamElementInterface, HTMLParamElement>;
    picture: WithCalculationsAndRef<JSXPictureElementInterface, HTMLPictureElement>;
    pre: WithCalculationsAndRef<JSXPreElementInterface, HTMLPreElement>;
    progress: WithCalculationsAndRef<JSXProgressElementInterface, HTMLProgressElement>;
    q: WithCalculationsAndRef<JSXQuoteElementInterface, HTMLQuoteElement>;
    rp: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    rt: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    ruby: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    s: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    samp: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    script: WithCalculationsAndRef<JSXScriptElementInterface, HTMLScriptElement>;
    section: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    select: WithCalculationsAndRef<JSXSelectElementInterface, HTMLSelectElement>;
    slot: WithCalculationsAndRef<JSXSlotElementInterface, HTMLSlotElement>;
    small: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    source: WithCalculationsAndRef<JSXSourceElementInterface, HTMLSourceElement>;
    span: WithCalculationsAndRef<JSXSpanElementInterface, HTMLSpanElement>;
    strong: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    style: WithCalculationsAndRef<JSXStyleElementInterface, HTMLStyleElement>;
    sub: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    summary: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    sup: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    table: WithCalculationsAndRef<JSXTableElementInterface, HTMLTableElement>;
    tbody: WithCalculationsAndRef<JSXTableSectionElementInterface, HTMLTableSectionElement>;
    td: WithCalculationsAndRef<JSXTableCellElementInterface, HTMLTableCellElement>;
    template: WithCalculationsAndRef<JSXTemplateElementInterface, HTMLTemplateElement>;
    textarea: WithCalculationsAndRef<JSXTextAreaElementInterface, HTMLTextAreaElement>;
    tfoot: WithCalculationsAndRef<JSXTableSectionElementInterface, HTMLTableSectionElement>;
    th: WithCalculationsAndRef<JSXTableCellElementInterface, HTMLTableCellElement>;
    thead: WithCalculationsAndRef<JSXTableSectionElementInterface, HTMLTableSectionElement>;
    time: WithCalculationsAndRef<JSXTimeElementInterface, HTMLTimeElement>;
    title: WithCalculationsAndRef<JSXTitleElementInterface, HTMLTitleElement>;
    tr: WithCalculationsAndRef<JSXTableRowElementInterface, HTMLTableRowElement>;
    track: WithCalculationsAndRef<JSXTrackElementInterface, HTMLTrackElement>;
    u: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    ul: WithCalculationsAndRef<JSXUListElementInterface, HTMLUListElement>;
    var: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
    video: WithCalculationsAndRef<JSXVideoElementInterface, HTMLVideoElement>;
    wbr: WithCalculationsAndRef<JSXElementInterface, HTMLElement>;
}
declare global {
    namespace JSX {
        interface IntrinsicElements extends KnownElements {
            [unknownElement: string]: any;
        }
        type Element = JSXNode;
    }
}
export {};
//# sourceMappingURL=jsx.d.ts.map