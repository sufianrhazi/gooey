import { TypeTag } from './types';
export function isRenderElement(jsxNode) {
    return !!(jsxNode &&
        typeof jsxNode === 'object' &&
        !Array.isArray(jsxNode) &&
        jsxNode[TypeTag] === 'element');
}
export function isRenderComponent(jsxNode) {
    return !!(jsxNode &&
        typeof jsxNode === 'object' &&
        !Array.isArray(jsxNode) &&
        jsxNode[TypeTag] === 'component');
}
/*
 * Interfaces adopted from HTML Living Standard Last Updated 30 November 2021: https://html.spec.whatwg.org/
 */
function attrIdentity(val) {
    return val;
}
function attrBooleanToEmptyString(val) {
    return val ? '' : undefined;
}
function attrNumberToString(val) {
    return val.toString();
}
function attrStringOrNumberToString(val) {
    return val.toString();
}
function attrStringOrNumberToNumber(val) {
    return typeof val === 'number' ? val : parseInt(val);
}
function attrYesNo(val) {
    return val === 'no' ? false : true;
}
function attrStringArrayToWsString(val) {
    if (val.length === 0)
        return undefined;
    return val.join(' ');
}
export const HTMLElementMap = {
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
const HTMLAnchorElementMap = {
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
const HTMLAreaElementMap = {
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
const HTMLAudioElementMap = {
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
const HTMLBRElementMap = {
    ...HTMLElementMap,
};
const HTMLBaseElementMap = {
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
const HTMLBodyElementMap = {
    ...HTMLElementMap,
};
const HTMLButtonElementMap = {
    ...HTMLElementMap,
    disabled: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'disabled',
        makeIdlValue: attrIdentity,
    },
    form: { makeAttrValue: attrIdentity },
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
const HTMLCanvasElementMap = {
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
const HTMLDListElementMap = {
    ...HTMLElementMap,
};
const HTMLDataElementMap = {
    ...HTMLElementMap,
    value: {
        makeAttrValue: attrIdentity,
        idlName: 'value',
        makeIdlValue: attrIdentity,
    },
};
const HTMLDataListElementMap = {
    ...HTMLElementMap,
};
const HTMLDetailsElementMap = {
    ...HTMLElementMap,
    open: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'open',
        makeIdlValue: attrIdentity,
    },
};
const HTMLDialogElementMap = {
    ...HTMLElementMap,
    open: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'open',
        makeIdlValue: attrIdentity,
    },
};
const HTMLDivElementMap = {
    ...HTMLElementMap,
};
const HTMLEmbedElementMap = {
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
const HTMLFieldSetElementMap = {
    ...HTMLElementMap,
    disabled: {
        makeAttrValue: attrBooleanToEmptyString,
        idlName: 'disabled',
        makeIdlValue: attrIdentity,
    },
    form: { makeAttrValue: attrIdentity },
    name: {
        makeAttrValue: attrIdentity,
        idlName: 'name',
        makeIdlValue: attrIdentity,
    },
};
const HTMLFormElementMap = {
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
const HTMLHeadingElementMap = {
    ...HTMLElementMap,
};
const HTMLHeadElementMap = {
    ...HTMLElementMap,
};
const HTMLHRElementMap = {
    ...HTMLElementMap,
};
const HTMLHtmlElementMap = {
    ...HTMLElementMap,
};
const HTMLIFrameElementMap = {
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
const HTMLImageElementMap = {
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
const HTMLInputElementMap = {
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
const HTMLModElementMap = {
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
const HTMLLabelElementMap = {
    ...HTMLElementMap,
    for: {
        makeAttrValue: attrIdentity,
        idlName: 'htmlFor',
        makeIdlValue: attrIdentity,
    },
};
const HTMLLegendElementMap = {
    ...HTMLElementMap,
};
const HTMLLIElementMap = {
    ...HTMLElementMap,
    value: {
        makeAttrValue: attrIdentity,
        idlName: 'value',
        makeIdlValue: attrIdentity,
    },
};
const HTMLLinkElementMap = {
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
const HTMLMapElementMap = {
    ...HTMLElementMap,
    name: {
        makeAttrValue: attrIdentity,
        idlName: 'name',
        makeIdlValue: attrIdentity,
    },
};
const HTMLMenuElementMap = {
    ...HTMLElementMap,
};
const HTMLMetaElementMap = {
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
const HTMLMeterElementMap = {
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
const HTMLObjectElementMap = {
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
const HTMLOListElementMap = {
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
const HTMLOptGroupElementMap = {
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
const HTMLOptionElementMap = {
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
const HTMLOutputElementMap = {
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
const HTMLParagraphElementMap = {
    ...HTMLElementMap,
};
const HTMLParamElementMap = {
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
const HTMLPictureElementMap = {
    ...HTMLElementMap,
};
const HTMLPreElementMap = {
    ...HTMLElementMap,
};
const HTMLProgressElementMap = {
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
const HTMLQuoteElementMap = {
    ...HTMLElementMap,
    cite: {
        makeAttrValue: attrIdentity,
        idlName: 'cite',
        makeIdlValue: attrIdentity,
    },
};
const HTMLScriptElementMap = {
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
const HTMLSelectElementMap = {
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
const HTMLSlotElementMap = {
    ...HTMLElementMap,
    name: {
        makeAttrValue: attrIdentity,
        idlName: 'name',
        makeIdlValue: attrIdentity,
    },
};
const HTMLSourceElementMap = {
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
const HTMLSpanElementMap = {
    ...HTMLElementMap,
};
const HTMLStyleElementMap = {
    ...HTMLElementMap,
    media: {
        makeAttrValue: attrIdentity,
        idlName: 'media',
        makeIdlValue: attrIdentity,
    },
};
const HTMLTableElementMap = {
    ...HTMLElementMap,
};
const HTMLTableCaptionElementMap = {
    ...HTMLElementMap,
};
const HTMLTableSectionElementMap = {
    ...HTMLElementMap,
};
const HTMLTableCellElementMap = {
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
const HTMLTableColElementMap = {
    ...HTMLElementMap,
    span: {
        makeAttrValue: attrNumberToString,
        idlName: 'span',
        makeIdlValue: attrIdentity,
    },
};
const HTMLTemplateElementMap = {
    ...HTMLElementMap,
};
const HTMLTextAreaElementMap = {
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
const HTMLTimeElementMap = {
    ...HTMLElementMap,
    datetime: {
        makeAttrValue: attrIdentity,
        idlName: 'dateTime',
        makeIdlValue: attrIdentity,
    },
};
const HTMLTitleElementMap = {
    ...HTMLElementMap,
};
const HTMLTableRowElementMap = {
    ...HTMLElementMap,
};
const HTMLTrackElementMap = {
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
const HTMLUListElementMap = {
    ...HTMLElementMap,
};
const HTMLVideoElementMap = {
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
};
// TODO: maybe typecheck this?
export function getElementTypeMapping(elementName, property) {
    var _a;
    return (_a = ElementTypeMapping[elementName]) === null || _a === void 0 ? void 0 : _a[property];
}
//# sourceMappingURL=jsx.js.map