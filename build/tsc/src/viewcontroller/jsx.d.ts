import type { Dyn, Dynamic } from '../common/dyn';
import type { RefObjectOrCallback } from './ref';
import type { ClassComponentInterface } from './rendernode/componentrendernode';
import type { RenderNode } from './rendernode/rendernode';
export interface JSXRenderable {
    __renderNode<T>(this: T, renderJsxNode: (jsxNode: JSXNode) => RenderNode): RenderNode;
}
export declare function isCustomJSXNode(node: JSXNode): node is JSXRenderable;
/**
 * The core type that can be used as a child or root of a JSX expression
 */
export type JSXNode = string | number | boolean | null | undefined | bigint | symbol | Function | Node | RenderNode | JSXNodeArray | Dynamic<JSXNode> | Promise<JSXNode> | JSXRenderable;
export interface JSXNodeArray extends Array<JSXNode> {
}
export interface CustomElements {
}
declare global {
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
        type IntrinsicElements = KnownElements & CustomElements & Record<string, any>;
        /**
         * The object property of children
         */
        interface ElementChildrenAttribute {
            children: {};
        }
        /**
         * The class property of props
         */
        interface ElementAttributesProperty {
            props: {};
        }
        /**
         * The class component interface
         */
        type ElementClass = ClassComponentInterface;
    }
}
export declare function setAttribute(element: Element, attributeName: string, val: unknown): void;
export declare function assignProp(element: Element, attribute: string, value: any): void;
type AriaRole = 'alert' | 'alertdialog' | 'application' | 'article' | 'associationlist' | 'associationlistitemkey' | 'associationlistitemvalue' | 'banner' | 'blockquote' | 'button' | 'caption' | 'cell' | 'checkbox' | 'code' | 'columnheader' | 'combobox' | 'comment' | 'complementary' | 'contentinfo' | 'definition' | 'deletion' | 'dialog' | 'directory' | 'document' | 'emphasis' | 'feed' | 'figure' | 'form' | 'generic' | 'grid' | 'gridcell' | 'group' | 'heading' | 'img' | 'insertion' | 'link' | 'list' | 'listbox' | 'listitem' | 'log' | 'main' | 'mark' | 'marquee' | 'math' | 'menu' | 'menubar' | 'menuitem' | 'menuitemcheckbox' | 'menuitemradio' | 'meter' | 'navigation' | 'none' | 'note' | 'option' | 'paragraph' | 'presentation' | 'progressbar' | 'radio' | 'radiogroup' | 'region' | 'row' | 'rowgroup' | 'rowheader' | 'scrollbar' | 'search' | 'searchbox' | 'separator' | 'slider' | 'spinbutton' | 'status' | 'strong' | 'subscript' | 'suggestion' | 'superscript' | 'switch' | 'tab' | 'table' | 'tablist' | 'tabpanel' | 'term' | 'textbox' | 'time' | 'timer' | 'toolbar' | 'tooltip' | 'tree' | 'treegrid' | 'treeitem' | string;
type DirValue = 'ltr' | 'rtl' | 'auto' | string;
type BrowsingContextValue = '_blank' | '_self' | '_parent' | '_top' | string;
type ReferrerPolicyValue = '' | 'no-referrer' | 'no-referrer-when-downgrade' | 'same-origin' | 'origin' | 'strict-origin' | 'origin-when-cross-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url' | string;
type CrossOriginValue = 'anonymous' | '' | 'use-credentials';
type LazyLoadingValue = 'lazy' | 'eager' | string;
type ImageDecodingHintValue = 'sync' | 'async' | 'auto' | string;
type SandboxValue = 'allow-forms' | 'allow-modals' | 'allow-orientation-lock' | 'allow-pointer-lock' | 'allow-popups' | 'allow-popups-to-escape-sandbox' | 'allow-presentation' | 'allow-same-origin' | 'allow-scripts' | 'allow-top-navigation' | 'allow-top-navigation-by-user-activation' | 'allow-downloads' | string;
type EncTypeValue = 'application/x-www-form-urlencoded' | 'multipart/form-data' | 'text/plain' | string;
type FormMethodValue = 'get' | 'post' | 'dialog' | string;
type AutocompleteValue = 'on' | 'off' | string;
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
    popover?: 'auto' | 'manual' | true | false | undefined;
    role?: AriaRole | undefined;
    slot?: string | undefined;
    spellcheck?: boolean | undefined;
    style?: string | undefined;
    tabindex?: -1 | 0 | '-1' | '0' | string | number | undefined;
    title?: string | undefined;
    translate?: '' | 'yes' | 'no' | undefined;
}
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
    width?: string | number | undefined;
    height?: string | number | undefined;
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
    width?: string | number | undefined;
    height?: string | number | undefined;
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
    width?: string | number | undefined;
    /** Vertical dimension */
    height?: string | number | undefined;
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
type FormInputTypeValues = 'button' | 'checkbox' | 'color' | 'date' | 'datetime-local' | 'email' | 'file' | 'hidden' | 'image' | 'month' | 'number' | 'password' | 'radio' | 'range' | 'reset' | 'search' | 'submit' | 'tel' | 'text' | 'time' | 'url' | 'week' | string;
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
    value?: string | number | undefined;
    /** Horizontal dimension */
    width?: string | number | undefined;
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
    value?: string | number | undefined;
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
    /** OpenGraph Property */
    property?: string | undefined;
}
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
    start?: string | number | undefined;
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
    value?: string | number | undefined;
    /** Upper bound of range */
    max?: string | number | undefined;
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
    size?: string | number | undefined;
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
    width?: string | number | undefined;
    /** (in picture) — Vertical dimension */
    height?: string | number | undefined;
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
    colspan?: string | number | undefined;
    /** Number of rows that the cell is to span */
    rowspan?: string | number | undefined;
    /** The header cells for this cell */
    headers?: string | undefined;
}
interface JSXTableHeaderElementInterface extends JSXTableCellElementInterface {
    /** Specifies which cells the header cell applies to */
    scope?: string | undefined;
    /** Alternative label to use for the header cell when referencing the cell in other contexts */
    abbr?: string | undefined;
}
interface JSXTableColElementInterface extends JSXElementInterface {
    /** Number of columns spanned by the element */
    span?: string | number | undefined;
}
interface JSXTemplateElementInterface extends JSXElementInterface {
}
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
    /** The value of the textarea element */
    value?: string | undefined;
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
    width?: string | number | undefined;
    /** Vertical dimension */
    height?: string | number | undefined;
}
/**
 * Good old bivarianceHack to allow assignability of specific event handlers to more generic event handlers :facepalm:
 */
type EventHandler<TEvent extends Event, TElement extends Element> = undefined | {
    bivarianceHack(event: TEvent, target: TElement): void;
}['bivarianceHack'];
interface JSXRefProps<TElement extends Element> {
    ref?: undefined | RefObjectOrCallback<TElement | undefined>;
}
type DynamicPropValue<T> = Dyn<T>;
interface JSXAttrProps {
    [key: `attr:${string}`]: DynamicPropValue<string | number | boolean | undefined>;
    [key: `prop:${string}`]: DynamicPropValue<string | number | boolean | undefined>;
}
type JSXEventPrefix = 'on' | 'onpassive' | 'oncapture';
type JSXEventTypes = {
    animationcancel: AnimationEvent;
    animationend: AnimationEvent;
    animationiteration: AnimationEvent;
    animationstart: AnimationEvent;
    auxclick: PointerEvent;
    beforeinput: InputEvent;
    blur: FocusEvent;
    click: PointerEvent;
    compositionend: CompositionEvent;
    compositionstart: CompositionEvent;
    compositionupdate: CompositionEvent;
    contextmenu: PointerEvent;
    copy: ClipboardEvent;
    cut: ClipboardEvent;
    dblclick: MouseEvent;
    focus: FocusEvent;
    focusin: FocusEvent;
    focusout: FocusEvent;
    fullscreenchange: Event;
    fullscreenerror: Event;
    gotpointercapture: PointerEvent;
    input: InputEvent;
    keydown: KeyboardEvent;
    keyup: KeyboardEvent;
    lostpointercapture: PointerEvent;
    mousedown: MouseEvent;
    mouseenter: MouseEvent;
    mouseleave: MouseEvent;
    mousemove: MouseEvent;
    mouseout: MouseEvent;
    mouseover: MouseEvent;
    mouseup: MouseEvent;
    paste: ClipboardEvent;
    pointercancel: PointerEvent;
    pointerdown: PointerEvent;
    pointerenter: PointerEvent;
    pointerleave: PointerEvent;
    pointermove: PointerEvent;
    pointerout: PointerEvent;
    pointerover: PointerEvent;
    pointerup: PointerEvent;
    scroll: Event;
    scrollend: Event;
    securitypolicyviolation: SecurityPolicyViolationEvent;
    touchcancel: TouchEvent;
    touchend: TouchEvent;
    touchmove: TouchEvent;
    touchstart: TouchEvent;
    transitioncancel: TransitionEvent;
    transitionend: TransitionEvent;
    transitionrun: TransitionEvent;
    transitionstart: TransitionEvent;
    wheel: WheelEvent;
    beforetoggle: Event;
    change: Event;
    close: Event;
    drag: DragEvent;
    dragend: DragEvent;
    dragenter: DragEvent;
    dragleave: DragEvent;
    dragover: DragEvent;
    dragstart: DragEvent;
    drop: DragEvent;
    error: Event;
    load: Event;
    toggle: Event;
    abort: Event;
    canplay: Event;
    canplaythrough: Event;
    durationchange: Event;
    emptied: Event;
    encrypted: MediaEncryptedEvent;
    ended: Event;
    loadeddata: Event;
    loadedmetadata: Event;
    loadstart: Event;
    pause: Event;
    play: Event;
    playing: Event;
    progress: Event;
    ratechange: Event;
    seeked: Event;
    seeking: Event;
    stalled: Event;
    suspend: Event;
    timeupdate: Event;
    volumechange: Event;
    waiting: Event;
    waitingforkey: Event;
    cancel: Event;
    contextlost: Event;
    contextrestored: Event;
    webglcontextcreationerror: WebGLContextEvent;
    webglcontextlost: WebGLContextEvent;
    webglcontextrestored: WebGLContextEvent;
    formdata: FormDataEvent;
    reset: Event;
    submit: SubmitEvent;
    invalid: Event;
    select: Event;
    slotchange: Event;
    hashchange: HashChangeEvent;
    languagechange: Event;
    message: MessageEvent;
    messageerror: MessageEvent;
    offline: Event;
    online: Event;
    pagehide: PageTransitionEvent;
    pageshow: PageTransitionEvent;
    popstate: PopStateEvent;
    rejectionhandled: PromiseRejectionEvent;
    storage: StorageEvent;
    unhandledrejection: PromiseRejectionEvent;
    readystatechange: Event;
    visibilitychange: Event;
    connect: MessageEvent;
    open: Event;
};
type JSXEventPropsNamed<TElement extends Element> = {
    [TKey in `${JSXEventPrefix}:${keyof JSXEventTypes}`]?: TKey extends `${JSXEventPrefix}:${infer TValue}` ? TValue extends keyof JSXEventTypes ? EventHandler<JSXEventTypes[TValue], TElement> : never : never;
};
interface JSXEventProps<TElement extends Element> extends JSXEventPropsNamed<TElement> {
    [key: `on:${string}`]: EventHandler<Event, TElement>;
    [key: `onpassive:${string}`]: EventHandler<Event, TElement>;
    [key: `oncapture:${string}`]: EventHandler<Event, TElement>;
}
interface CSSProps {
    [key: `style:${string}`]: DynamicPropValue<string | number | undefined>;
    [key: `cssprop:${string}`]: DynamicPropValue<string | number | undefined>;
}
interface JSXDataProps {
    [key: `data-${string}`]: DynamicPropValue<string | number | boolean | undefined>;
}
type JSXElementInterfaceProps<TJSXType extends JSXElementInterface> = {
    [Key in keyof TJSXType]: Key extends 'is' ? string | undefined : DynamicPropValue<TJSXType[Key]>;
};
type JSXChildrenProps<HasChildren extends boolean> = HasChildren extends true ? {
    children?: JSX.Node | JSX.Node[];
} : {
    children?: never;
};
type WithCalculationsAndRef<TJSXType extends JSXElementInterface, TElement extends Element, HasChildren extends boolean> = JSXRefProps<TElement> & JSXAttrProps & JSXEventProps<TElement> & JSXDataProps & CSSProps & JSXElementInterfaceProps<TJSXType> & JSXChildrenProps<HasChildren>;
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
    th: WithCalculationsAndRef<JSXTableHeaderElementInterface, HTMLTableCellElement, true>;
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