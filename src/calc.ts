/*
 * ### Calculations
 *
 * A calculation exists on the directed graph as a single vertex. They only get dirtied via propagation.
 *
 * The calculation abstraction represents a “pure” function which takes no arguments and should produce the same value
 * if the data it reads is unchanged. Calculations have the following state:
 * - An optional error handler, which provides an alternative value in case of a cycle/error in calculation/processing
 * - An optional equality function, which determines whether or not subsequent results are the same value
 * - The cached value of its result
 * - The items it owns with respect to retaining
 *
 * A calculation may be in an error state, in which any calls to it raise an exception.
 *
 * A calculation may be a special “effect” calculation, which means it does not return any value.
 *
 *
 * #### Calculation Caching
 *
 * All calculations have their results cached. A calculation may be invalidated, which discards the cached result if it
 * exists.
 *
 * Additionally, calculations have an equality comparator. By default this comparator is strict reference equality.
 *
 * If a cached calculation is recalculated, if the recalculated result compares equal to the cached result, the newly
 * produced result is discarded and the cached result is kept.
 *
 * When a calculation is called, the calculation is treated as an access with respect to tracking, even if the
 * calculation is in an error state or its result is cached. If the calculation is cached, the cached value is returned.
 * If the calculation is uncached, the underlying function is executed, its result cached, and that value is returned.
 *
 *
 * #### Calculation Error Handling
 *
 * Calculations have an error state, which is initially clear, and an optional error handler which is not set.
 *
 * The optional error handler is a function that takes one parameter, a value which indicates the error was due to a cycle
 * or due to an exception.
 *
 * The error handler is always executed in an “untracked” context.
 *
 * When a calculation’s function is executed, all exceptions are caught. If an error handler is present, it is called
 * with a value that indicates the error was due to an exception and the return value of the error handler is used as if
 * it was the return value of the function (including equality comparison of the cached value). On completion of an
 * error handler, the calculation is popped off the global tracking stack, and inbound edge replacement proceeds as
 * normal. This means that only accesses that occur during the execution of the function (not during the execution of
 * the error handler) are tracked in the directed graph.
 *
 * If an exception is caught and there is no error handler present, the error state is set on the calculation so that
 * further calls raise an exception, the calculation is popped off the global tracking stack, inbound edge replacement
 * proceeds as normal, and the caught exception is re-thrown. This means that access that occur during the execution of the
 * function prior to the exception are tracked in the directed graph.
 *
 * The error state is cleared when the calculation is recalculated or when the calculation is invalidated.
 *
 * A calculation in a non-error state may be informed that it participates in a cycle. In this case if there is no error
 * handler the calculation’s cache is cleared and is set to an error state. If there is an error handler, it is called with
 * a value that indicates the error is due to a cycle and the returned value is set to the cache if unequal to the value in
 * cache.
 *
 *
 * #### Calculation Execution
 *
 * When a calculation’s function is being executed, all calls to other calculations (cached or uncached) or fields are
 * tracked. The only exception is when a calculation calls an “effect” calculation, which does not return a value and as
 * a result cannot cause data to flow from effect to callee. These tracked accesses are added to the directed graph as
 * inbound, “hard” edges: from the item being accessed (either a calculation or a field) and to the calculation
 * performing the access. Each execution replaces all inbound “hard” edges.
 *
 * This tracking of access is shallow. That is to say:
 * * There is a stack of active calculations
 * * When a calculation starts execution it is added pushed on the top of the stack
 * * When a calculation finishes execution (either naturally or via exception) it is popped off the top of the stack
 * * Tracking only impacts the calculation on the top of the stack
 *
 * For example, if a calculation’s function (A) is called, which calls another calculation’s function (B), which accesses a
 * field (C), the resulting hard edges added are:
 * * C -> B
 * * B -> A
 *
 * Sometimes it is desirable to avoid this tracking. In this case a sentinel untracked value can be pushed to the stack of
 * calculations, call a function, and then pop the sentinel off the stack. When accesses occur while this sentinel value is
 * on top of the stack, no tracking is necessary. This is called executing a function in an “untracked” context.
 *
 *
 * #### Calculation Behavior
 *
 * This strict set of behaviors around caching, data tracking, and error handling are specifically chosen so that the
 * maintained topological ordering of the directed graph holds the quality that data accesses are placed before all things
 * doing the access. This allows us to intelligently recalculate functions only when their data dependencies have changed.
 * In other words, caching should be “perfect” with no need to choose specific cache keys that need to be invalidated for
 * classes of calculations, or no need to manually invalidate cached calculations.
 *
 * For example, let’s look at the following function that we’ll call X:
 *
 * ```
 * calc(() => {
 *   if (A()) return B();
 *   if (C()) return D();
 *   return E();
 * })
 * ```
 *
 * There are three possible variations of the directed graph when calling X:
 * 1. If `A()` returns true, then `X` depends on `A` and `B`.
 * 2. If `A()` returns false and `C()` returns true, then `X` depends on `A` and `C` and `D`.
 * 3. If `A()` returns false and `C()` returns false, then `X` depends on `A` and `C` and `E`.
 *
 * This is to say that in case 2, we know for a fact that the return value does not and cannot depend on `B`, so we do not
 * need to recalculate/invalidate `X` if `B` were to change.
 *
 * Similarly in case 2, if `C` were to throw an exception, the effect of this exception depends on the fact that `A` was
 * called and returned a value that was true. If `A` were to change, even though the calculation is in an error state, it
 * could be that `A` now returns a value such that `C` is never called—so we should recalculate `X` if `A` were to change
 * even if `X` is in the error state.
 *
 * In other words, we always know what values depend on the result of calculating `X`, so we know exactly when to
 * recalculate/invalidate `X`.
 *
 * If you are familiar with React hooks, you may recognize that the list of dependencies that React hooks forces you to
 * list explicitly when using `useMemo()` is the set of all possible data accesses, not the set of data accesses that
 * matter for each invocation. This is strikingly different than gooey, which performs the work of automatically tracking
 * only the values that the function uses.
 *
 *
 * #### Calculation Processing
 *
 * While the directed graph is processing, it emits one of three actions: invalidation, recalculation, and cycle.
 * * On an invalidation event, the calculation’s cache is discarded and the error state is cleared. Propagation occurs if
 *   the calculation was cached.
 * * On a recalculation event, the calculation’s underlying function is executed. Propagation occurs if the calculation is
 *   uncached.
 * * On a cycle event
 *     * If there is no error handler for the calculation, the calculation is invalidated and placed in an error state.
 *       Propagation occurs if the calculation was not in an error state.
 *     * If there is an error handler, it is called and the result is handled in the same manner as if it was the result of
 *       a recalculation event. Propagation occurs if the calculation was not cached or the error handler’s return value
 *       does not equal the prior cached value.
 */

import * as log from './log';
import { Sentinel } from './sentinel';
import {
    Processable,
    Retainable,
    notifyCreate,
    notifyRead,
    addHardEdge,
    addVertex,
    release,
    removeHardEdge,
    removeVertex,
    markCycleInformed,
    unmarkDirty,
    trackReads,
    untrackReads,
    isProcessable,
} from './engine';
import {
    SymProcessable,
    SymCycle,
    SymDebugName,
    SymAlive,
    SymDead,
    SymInvalidate,
    SymRecalculate,
    SymRefcount,
} from './symbols';
import { wrapError } from './util';

enum CalculationState {
    READY,
    CALLING,
    CACHED,
    ERROR,
    DEAD,
}

export enum CalculationErrorType {
    CYCLE,
    EXCEPTION,
}

const CalculationSymbol = Symbol('calculation');
const CalculationUnsubscribeSymbol = Symbol('calculationUnsubscribe');

interface CalcSubscriptionHandler<T> {
    (errorType: undefined, val: T): void;
    (errorType: CalculationErrorType, val: Error): void;
    (errorType: CalculationErrorType | undefined, val: Error | T): void;
}

interface CalcUnsubscribe<T> {
    (): void;
    _type: typeof CalculationUnsubscribeSymbol;
    calculation: Calculation<T>;
}

export interface Calculation<T> extends Retainable, Processable {
    (): T;
    onError: (handler: (errorType: CalculationErrorType) => T) => this;
    setCmp: (eq: (a: T, b: T) => boolean) => this;
    onRecalc: (handler: CalcSubscriptionHandler<T>) => CalcUnsubscribe<T>;
    _subscriptions?: Set<CalcSubscriptionHandler<T>>;
    _type: typeof CalculationSymbol;
    _fn: () => T;
    _eq: (a: T, b: T) => boolean;
    _errorHandler?: (errorType: CalculationErrorType) => T;
    _isEffect: boolean;
    _state: CalculationState;
    _retained?: Set<Retainable | (Processable & Retainable)>;
    _val?: T;
    _error?: any;
}

export function isCalculation(val: any): val is Calculation<unknown> {
    return val && val._type === CalculationSymbol;
}

export function isCalcUnsubscribe(val: any): val is CalcUnsubscribe<unknown> {
    return val && val._type === CalculationUnsubscribeSymbol;
}

function strictEqual<T>(a: T, b: T) {
    return a === b;
}

function calcSetError<T>(
    this: Calculation<T>,
    handler: (errorType: CalculationErrorType) => T
) {
    this._errorHandler = handler;
    return this;
}

function calcSetCmp<T>(this: Calculation<T>, eq: (a: T, b: T) => boolean) {
    this._eq = eq;
    return this;
}

function calcOnRecalc<T>(
    this: Calculation<T>,
    handler: CalcSubscriptionHandler<T>
): CalcUnsubscribe<T> {
    if (!this._subscriptions) {
        this._subscriptions = new Set();
    }
    this._subscriptions.add(handler);
    const unsubscribe = () => {
        this._subscriptions?.delete(handler);
    };
    const unsubscribeData = {
        _type: CalculationUnsubscribeSymbol,
        calculation: this,
    } as const;
    return Object.assign(unsubscribe, unsubscribeData);
}

class CycleError extends Error {
    sourceCalculation: Calculation<any>;

    constructor(msg: string, sourceCalculation: Calculation<any>) {
        super(msg);
        this.sourceCalculation = sourceCalculation;
    }
}

function calculationCall<T>(calculation: Calculation<T>): T {
    if (!calculation._isEffect) {
        notifyRead(calculation);
    }

    const state = calculation._state;
    switch (state) {
        case CalculationState.DEAD:
            // Note: dead calculations are just plain old functions
            return calculation._fn();
        case CalculationState.CACHED:
            return calculation._val as T;
        case CalculationState.CALLING:
            calculation._state = CalculationState.ERROR;
            calculation._error = new CycleError(
                'Cycle reached: calculation reached itself',
                calculation
            );
            throw calculation._error;
        case CalculationState.ERROR:
            if (calculation._error === Sentinel) {
                throw new Error('Cycle reached: calculation reached itself');
            } else {
                throw new Error(
                    'Calculation in error state: ' + calculation._error.message
                );
            }
            break;
        case CalculationState.READY: {
            const calculationReads: Set<
                Retainable | (Retainable & Processable)
            > = new Set();
            let result: T | Sentinel = Sentinel;
            let exception: any;
            calculation._state = CalculationState.CALLING;
            try {
                result = trackReads(
                    calculationReads,
                    () => calculation._fn(),
                    calculation[SymDebugName]
                );
            } catch (e) {
                exception = e;
            }

            if (
                (calculation._state as CalculationState) ===
                CalculationState.DEAD
            ) {
                // It's possible that a cycle which is recalculated releases itself entirely
                // In this case we release all of the things retained (automatically, see note XXX:AUTO_RETAIN)
                for (const retained of calculationReads) {
                    release(retained);
                }
                if (result === Sentinel) throw exception;
                return result;
            }

            // If A calls B, which calls A, and B has an error handler:
            // B will catch and return the self-cycle error.
            // In this case, A will mark itself in the ERROR state.
            if (
                // Cast due to TypeScript limitation
                (calculation._state as CalculationState) ===
                CalculationState.ERROR
            ) {
                exception = calculation._error;
            }

            let isActiveCycle = false;
            let isActiveCycleRoot = false;
            if (exception) {
                if (exception instanceof CycleError) {
                    isActiveCycle = true;
                    isActiveCycleRoot =
                        exception.sourceCalculation === calculation;
                }
                const errorHandler = calculation._errorHandler;
                if (errorHandler) {
                    result = untrackReads(
                        () =>
                            errorHandler(
                                isActiveCycle
                                    ? CalculationErrorType.CYCLE
                                    : CalculationErrorType.EXCEPTION
                            ),
                        calculation[SymDebugName]
                    );
                }

                if (isActiveCycle) {
                    markCycleInformed(calculation);
                }
            }

            if (result === Sentinel) {
                if ('_val' in calculation) {
                    delete calculation._val;
                }
                calculation._error = exception;
                calculation._state = CalculationState.ERROR;
            } else {
                calculation._val = result;
                if ('_error' in calculation) {
                    delete calculation._error;
                }
                calculation._state = CalculationState.CACHED;
                unmarkDirty(calculation);
            }

            if (calculation._retained) {
                for (const priorDependency of calculation._retained) {
                    if (
                        isProcessable(priorDependency) &&
                        !calculationReads.has(priorDependency)
                    ) {
                        removeHardEdge(priorDependency, calculation);
                    }
                    // XXX:AUTO_RETAIN: THIS IS SURPRISING
                    // We retain all dependencies read when they are first added to a tracked calculation
                    // So we need to release prior dependencies to keep the refcount stable
                    // This is a bit gross...
                    release(priorDependency);
                }
            }
            for (const dependency of calculationReads) {
                if (isProcessable(dependency)) {
                    if (
                        !calculation._retained ||
                        !calculation._retained.has(dependency)
                    ) {
                        addHardEdge(dependency, calculation);
                    }
                }
            }
            calculation._retained = calculationReads;

            if (result === Sentinel) {
                throw exception;
            } else if (isActiveCycle && !isActiveCycleRoot) {
                throw exception;
            } else {
                return result;
            }
        }
        default:
            log.assertExhausted(state, 'Calculation in unknown state');
    }
}

function calculationAlive<T>(this: Calculation<T>) {
    addVertex(this);
    this._state = CalculationState.READY;
}

function calculationDead<T>(this: Calculation<T>) {
    if (this._retained) {
        for (const retained of this._retained) {
            if (isProcessable(retained)) {
                removeHardEdge(retained, this);
            }
            release(retained);
        }
    }
    delete this._retained;
    removeVertex(this);
    this._state = CalculationState.DEAD;
    delete this._val;
}

function calculationRecalculate<T>(this: Calculation<T>) {
    switch (this._state) {
        case CalculationState.DEAD:
            log.fail('cannot recalculate dead calculation');
            break;
        case CalculationState.CALLING:
            log.fail('cannot recalculate calculation being tracked');
            break;
        case CalculationState.READY:
        case CalculationState.ERROR:
        case CalculationState.CACHED: {
            const priorResult = '_val' in this ? (this._val as T) : Sentinel;
            this._state = CalculationState.READY;
            let newResult: T;
            try {
                newResult = calculationCall(this);
            } catch (e) {
                this._state = CalculationState.ERROR;
                this._error = e;
                if (this._subscriptions) {
                    const error = wrapError(e, 'Unknown error in calculation');
                    for (const subscription of this._subscriptions) {
                        subscription(CalculationErrorType.EXCEPTION, error);
                    }
                }
                return true; // Errors always propagate
            }
            if (priorResult !== Sentinel && this._eq(priorResult, newResult)) {
                this._val = priorResult;
                return false;
            }
            if (this._subscriptions) {
                for (const subscription of this._subscriptions) {
                    subscription(undefined, newResult);
                }
            }
            return true;
        }
        default:
            log.assertExhausted(this._state, 'Calculation in unknown state');
    }
}

function calculationInvalidate<T>(this: Calculation<T>) {
    switch (this._state) {
        case CalculationState.DEAD:
            log.fail('cannot invalidate dead calculation');
            break;
        case CalculationState.CALLING:
            log.fail('cannot invalidate calculation being tracked');
            break;
        case CalculationState.READY:
            return false;
        case CalculationState.ERROR:
            this._state = CalculationState.READY;
            return false;
        case CalculationState.CACHED:
            this._state = CalculationState.READY;
            return true;
        default:
            log.assertExhausted(this._state, 'Calculation in unknown state');
    }
}

function calculationCycle<T>(this: Calculation<T>) {
    switch (this._state) {
        case CalculationState.DEAD:
            log.fail('cannot trigger cycle on dead calculation');
            break;
        case CalculationState.CALLING:
            log.fail('cannot trigger cycle on calculation being tracked');
            break;
        case CalculationState.ERROR:
        case CalculationState.CACHED:
        case CalculationState.READY: {
            const priorResult = '_val' in this ? (this._val as T) : Sentinel;
            this._state = CalculationState.READY;
            const errorHandler = this._errorHandler;
            if (errorHandler) {
                this._val = untrackReads(
                    () => errorHandler(CalculationErrorType.CYCLE),
                    this[SymDebugName]
                );
                this._state = CalculationState.CACHED;
                unmarkDirty(this);
            } else {
                this._state = CalculationState.ERROR;
                this._error = Sentinel;
                if (this._subscriptions) {
                    const error = new Error(
                        'Calculation found to be in a cycle'
                    );
                    for (const subscription of this._subscriptions) {
                        subscription(CalculationErrorType.CYCLE, error);
                    }
                }
                return true; // Errors always propagate
            }
            if (priorResult !== Sentinel && this._eq(priorResult, this._val)) {
                this._val = priorResult;
                return false;
            }
            if (this._subscriptions) {
                for (const subscription of this._subscriptions) {
                    subscription(undefined, this._val);
                }
            }
            return true;
        }
        default:
            log.assertExhausted(this._state, 'Calculation in unknown state');
    }
}

export function calc<T>(fn: () => T, debugName?: string) {
    const calculationData = {
        // Dynamic members
        _fn: fn,
        _isEffect: false,
        _state: CalculationState.DEAD,
        _call: calculationCall,
        _eq: strictEqual,

        // Statically defined
        _type: CalculationSymbol,
        onError: calcSetError,
        setCmp: calcSetCmp,
        onRecalc: calcOnRecalc,

        // Retainable
        [SymAlive]: calculationAlive,
        [SymDead]: calculationDead,
        [SymRefcount]: 0,

        // Processable
        [SymProcessable]: true,
        [SymDebugName]: debugName ?? fn.name,
        [SymRecalculate]: calculationRecalculate,
        [SymCycle]: calculationCycle,
        [SymInvalidate]: calculationInvalidate,
    } as const;
    const calculation: Calculation<T> = Object.assign(
        () => calculationCall(calculation),
        calculationData
    );
    notifyCreate(calculation);
    return calculation;
}

export function effect<T>(fn: () => T, debugName?: string) {
    const calculationData = {
        // Dynamic members
        _fn: fn,
        _isEffect: true,
        _state: CalculationState.DEAD,
        _call: calculationCall,
        _eq: strictEqual,

        // Statically defined
        _type: CalculationSymbol,
        onError: calcSetError,
        setCmp: calcSetCmp,
        onRecalc: calcOnRecalc,

        // Retainable
        [SymAlive]: calculationAlive,
        [SymDead]: calculationDead,
        [SymRefcount]: 0,

        // Processable
        [SymProcessable]: true,
        [SymDebugName]: debugName ?? fn.name,
        [SymRecalculate]: calculationRecalculate,
        [SymCycle]: calculationCycle,
        [SymInvalidate]: calculationInvalidate,
    } as const;
    const calculation: Calculation<T> = Object.assign(
        () => calculationCall(calculation),
        calculationData
    );
    notifyCreate(calculation);
    return calculation;
}
