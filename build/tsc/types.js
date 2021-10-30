export class InvariantError extends Error {
}
export const TypeTag = Symbol('reviseType');
const CalculationTypeTag = Symbol('calculationType');
export function isRef(ref) {
    return ref && ref[TypeTag] === 'ref';
}
export function ref(val) {
    return {
        [TypeTag]: 'ref',
        current: val,
    };
}
export const OnCollectionRelease = Symbol('OnCollectionRelease');
export function makeCalculation(fn) {
    return Object.assign(fn, {
        [TypeTag]: 'calculation',
        [CalculationTypeTag]: 'calculation',
    });
}
export function makeEffect(fn) {
    return Object.assign(fn, {
        [TypeTag]: 'calculation',
        [CalculationTypeTag]: 'effect',
    });
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