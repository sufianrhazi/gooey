export class InvariantError extends Error {
}
export const TypeTag = Symbol('reviseType');
export const DataTypeTag = Symbol('dataTypeTag');
const CalculationTypeTag = Symbol('calculationType');
export const RecalculationTag = Symbol('recalculate');
export const ObserveKey = Symbol('observe');
export const MakeModelViewKey = Symbol('makeModelView');
export const DeferredKey = Symbol('deferred');
export const FlushKey = Symbol('flush');
export const AddDeferredWorkKey = Symbol('addDeferredWork');
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
    return !!(thing &&
        thing[TypeTag] === 'data' &&
        thing[DataTypeTag] === 'model');
}
export function isModelField(thing) {
    return !!(thing &&
        !thing[TypeTag] &&
        !!thing.model &&
        !!thing.model[DataTypeTag]);
}
export function isCollection(thing) {
    return !!(thing &&
        thing[TypeTag] === 'data' &&
        thing[DataTypeTag] === 'collection');
}
export function isCalculation(thing) {
    return !!(thing && thing[TypeTag] === 'calculation');
}
export function isEffect(thing) {
    return thing[CalculationTypeTag] === 'effect';
}
export function isSubscription(thing) {
    return !!(thing && thing[TypeTag] === 'subscription');
}
//# sourceMappingURL=types.js.map