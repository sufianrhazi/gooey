export class InvariantError extends Error {
}
export const TypeTag = Symbol('reviseType');
const CalculationTypeTag = Symbol('calculationType');
export const RecalculationTag = Symbol('recalculate');
export const OwnKeysField = Symbol('ownKeys');
export const ObserveKey = Symbol('observe');
export const GetRawArrayKey = Symbol('getRawArray');
export const FlushKey = Symbol('flush');
export const NotifyKey = Symbol('notifyEvent');
export function isRef(ref) {
    return ref && ref[TypeTag] === 'ref';
}
/**
 * Make a ref object that can be passed to native elements.
 */
export function ref(val) {
    return {
        [TypeTag]: 'ref',
        current: val,
    };
}
export const OnCollectionRelease = Symbol('OnCollectionRelease');
export function makeCalculation(fn, recalcFn) {
    return Object.assign(fn, {
        [TypeTag]: 'calculation',
        [CalculationTypeTag]: 'calculation',
        [RecalculationTag]: recalcFn,
    });
}
export function makeEffect(fn, recalcFn) {
    return Object.assign(fn, {
        [TypeTag]: 'calculation',
        [CalculationTypeTag]: 'effect',
        [RecalculationTag]: recalcFn,
    });
}
export function isModel(thing) {
    return !!(thing && thing[TypeTag] === 'model');
}
export function isCollection(thing) {
    return !!(thing && thing[TypeTag] === 'collection');
}
export function isCalculation(thing) {
    return !!(thing && thing[TypeTag] === 'calculation');
}
export function isEffect(thing) {
    return thing[CalculationTypeTag] === 'effect';
}
//# sourceMappingURL=types.js.map