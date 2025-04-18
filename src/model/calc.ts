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
 * tracked. These tracked accesses are added to the directed graph as inbound edges: from the item being
 * accessed (either a calculation or a field) and to the calculation performing the access. Each execution replaces all
 * inbound edges.
 *
 * This tracking of access is shallow. That is to say:
 * * There is a stack of active calculations
 * * When a calculation starts execution it is added pushed on the top of the stack
 * * When a calculation finishes execution (either naturally or via exception) it is popped off the top of the stack
 * * Tracking only impacts the calculation on the top of the stack
 *
 * For example, if a calculation’s function (A) is called, which calls another calculation’s function (B), which accesses a
 * field (C), the resulting edges added are:
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

import type { Dynamic, DynamicSubscriptionHandler } from '../common/dyn';
import * as log from '../common/log';
import { wrapError } from '../common/util';
import {
    addEdge,
    addVertex,
    getForwardDependencies,
    isProcessable,
    markCycleInformed,
    notifyRead,
    release,
    removeEdge,
    removeVertex,
    retain,
    trackReads,
} from './engine';
import type { Processable, Retainable } from './engine';

type CalcUnsubscribe = () => void;

type CalcErrorHandler<T> = (error: Error) => T;

type CalculationResult<T> =
    | { ok: false; error: Error }
    | { ok: true; stale: boolean; value: T };

function strictEqual<T>(a: T, b: T) {
    return a === b;
}

export class Calculation<T> implements Retainable, Processable, Dynamic<T> {
    declare __processable: true;
    declare __refcount: number;
    declare __debugName: string;

    private declare _fn: () => T;
    private declare _errorHandler: undefined | ((err: Error) => T);
    private declare _result: CalculationResult<T> | undefined;
    private declare _calculating: boolean;
    private declare _eq: (a: T, b: T) => boolean;
    private declare _dependencies: Set<Processable & Retainable>;
    private declare _subscriptions: Set<DynamicSubscriptionHandler<T>>;

    private ensureResult(): {
        propagate: boolean;
        result: CalculationResult<T>;
    } {
        const result = this._result;
        if (result && !result.ok) {
            return { propagate: false, result };
        }
        if (result?.ok && !result.stale) {
            DEBUG && log.debug(`Reuse calc ${this.__debugName}`);
            return { propagate: false, result };
        }
        if (result?.ok && result.stale) {
            DEBUG &&
                log.debug(`Recalculating calc (stale) ${this.__debugName}`);
            const lastValue = result.value;
            const newResult = this.recalc();
            if (newResult.ok && this._eq(lastValue, newResult.value)) {
                DEBUG &&
                    log.debug(`Stale recalculation reused ${this.__debugName}`);
                return {
                    propagate: false,
                    result: {
                        ok: true,
                        stale: false,
                        value: lastValue,
                    },
                };
            }
            return { propagate: true, result: newResult };
        }
        DEBUG && log.debug(`Recalculating calc ${this.__debugName}`);
        return { propagate: true, result: this.recalc() };
    }

    get(): T {
        notifyRead(this);
        const { result } = this.ensureResult();
        if (!result.ok) {
            throw result.error;
        }
        return result.value;
    }

    recalc() {
        if (this._calculating) {
            throw new SynchronousCycleError(
                'Cycle error: calculation cycle reached itself',
                this
            );
        }

        // Call the calc implementation
        this._calculating = true;
        let result: CalculationResult<T>;
        const newDependencies = new Set<Processable & Retainable>();
        try {
            result = {
                ok: true,
                stale: false,
                value: trackReads(
                    (dependency) => {
                        if (!newDependencies.has(dependency)) {
                            newDependencies.add(dependency);
                            retain(dependency);
                            if (
                                !this._dependencies.has(dependency) &&
                                isProcessable(dependency) &&
                                this.__refcount > 0
                            ) {
                                addEdge(dependency, this);
                            }
                        }
                        return this;
                    },
                    () => this._fn(),
                    this.__debugName
                ),
            };
        } catch (e) {
            result = {
                ok: false,
                error: wrapError(e),
            };
        }
        this._calculating = false;

        // Inform the graph of new dependencies
        for (const prevDependency of this._dependencies) {
            if (
                !newDependencies.has(prevDependency) &&
                isProcessable(prevDependency)
            ) {
                // We lost a dependency
                removeEdge(prevDependency, this);
            }
            release(prevDependency); // We **always** release previous dependencies, since we **always** retain new ones
        }
        this._dependencies = newDependencies;

        const synchronousError =
            !result.ok && result.error instanceof SynchronousCycleError
                ? result.error
                : null;

        if (synchronousError) {
            // This calculation has learned it is part of a cycle, let the engine know so we are not informed by it of
            // the cycle.
            if (this.__refcount > 0) {
                markCycleInformed(this);
            }

            if (synchronousError.sourceCalculation !== this) {
                // The discovery of the cycle is passing upward, synchronously
                synchronousError.passthruCalculations.add(this);
            } else {
                // We're at the source of the cycle, so all of the nodes in the cycle (aside from this one) should be in
                //   result.error.passthruCalculations
                //
                // So we do the same thing that the engine does:

                // 1. Tell the nodes to discard their cache
                for (const calculation of synchronousError.passthruCalculations) {
                    calculation.__invalidate();
                }

                // 2. Tell the nodes they're part of a cycle
                const cycleDependencies = new Set<Processable>(
                    this._dependencies
                );
                for (const calculation of synchronousError.passthruCalculations) {
                    for (const dependency of calculation.__cycle()) {
                        cycleDependencies.add(dependency);
                    }
                }
                for (const calculation of synchronousError.passthruCalculations) {
                    cycleDependencies.delete(calculation);
                }
                cycleDependencies.delete(this);
            }
        }

        if (!result.ok) {
            let error: Error;
            if (
                result.error instanceof SynchronousCycleError &&
                result.error.sourceCalculation === this
            ) {
                // TODO: fragile error message & tests. Rewrite tests that fail when this error message is reworded
                // TODO: also check to see if passthruCalculations is needed at all
                error = new CycleError(
                    'Cycle error: calculation cycle reached itself'
                );
            } else {
                error = result.error;
            }
            if (this._errorHandler) {
                try {
                    result = {
                        ok: true,
                        stale: false,
                        value: this._errorHandler(error),
                    };
                } catch (innerError) {
                    // The error handler threw, nothing we can do but have the calculation error
                    result = {
                        ok: false,
                        error: wrapError(innerError),
                    };
                }
            } else {
                result = {
                    ok: false,
                    error,
                };
            }
        }

        if (this.__refcount > 0) {
            this._result = result;
        }

        if (synchronousError && synchronousError.sourceCalculation !== this) {
            // Instead of returning, we throw the error until we've reached sourceCalculation again
            throw synchronousError;
        }

        return result;
    }

    constructor(fn: () => T, debugName?: string) {
        this.__refcount = 0;
        this.__debugName = debugName ?? `calc:(${fn.name})`;
        this.__processable = true;
        this._result = undefined;
        this._fn = fn;
        this._errorHandler = undefined;
        this._calculating = false;
        this._eq = strictEqual;
        this._dependencies = new Set();
        this._subscriptions = new Set();
    }

    onError(handler: CalcErrorHandler<T>): this {
        this._errorHandler = handler;
        return this;
    }

    setCmp(eq: (a: T, b: T) => boolean): this {
        this._eq = eq;
        return this;
    }

    subscribe(handler: DynamicSubscriptionHandler<T>): CalcUnsubscribe {
        retain(this);
        let args: [Error, undefined] | [undefined, T];
        try {
            args = [undefined, this.get()];
        } catch (e) {
            args = [wrapError(e), undefined];
        }
        if (!this._subscriptions) {
            this._subscriptions = new Set();
        }
        this._subscriptions.add(handler);
        const unsubscribe = () => {
            this._subscriptions?.delete(handler);
            release(this);
        };
        handler(...args);
        return unsubscribe;
    }

    retain() {
        retain(this);
    }

    release() {
        release(this);
    }

    __alive() {
        addVertex(this);
    }

    __dead() {
        this._result = undefined;

        for (const dependency of this._dependencies) {
            if (isProcessable(dependency)) {
                removeEdge(dependency, this);
            }
            release(dependency);
        }
        this._dependencies.clear();
        removeVertex(this);
    }

    __recalculate(vertexGroup: Set<Processable>): Processable[] {
        const { propagate, result } = this.ensureResult();
        DEBUG &&
            log.debug(
                `Recalculated ${this.__debugName} (propagate=${propagate}) {result=${JSON.stringify(result)}}`
            );
        this.notifySubscriptions(result);
        // Since each vertex is responsible for its own propagation, we need to
        // take downstream dependencies that are _not_ part of the
        // vertexGroup.
        // The vertexGroup can be greater than one if an entire cycle is being
        // recalculated. This is how we can avoid having a cycle propagate to
        // itself.
        const toPropagate: Processable[] = [];
        if (propagate) {
            for (const dependency of getForwardDependencies(this)) {
                toPropagate.push(dependency);
            }
        }
        return toPropagate;
    }

    __invalidate(): void {
        if (this._result?.ok) {
            this._result = { ...this._result, stale: true };
        } else {
            this._result = undefined;
        }
    }

    __cycle(): Processable[] {
        const error = new MarkedCycleError(
            'Cycle error: calculation cycle reached itself'
        );
        if (this._errorHandler) {
            try {
                this._result = {
                    ok: true,
                    stale: false,
                    value: this._errorHandler(error),
                };
            } catch (e) {
                this._result = { ok: false, error: wrapError(e) };
            }
        } else {
            this._result = {
                ok: false,
                error,
            };
        }
        this.notifySubscriptions(this._result);
        return [...getForwardDependencies(this)];
    }

    private notifySubscriptions(result: CalculationResult<T>) {
        for (const subscription of this._subscriptions) {
            if (result.ok) {
                subscription(undefined, result.value);
            } else {
                subscription(result.error, undefined);
            }
        }
    }

    map<V>(fn: (val: T) => V): Calculation<V> {
        return calc(() => fn(this.get()));
    }
}

export class CycleError extends Error {}

class MarkedCycleError extends CycleError {}

export class SynchronousCycleError extends CycleError {
    declare sourceCalculation: Calculation<any>;
    passthruCalculations: Set<Calculation<any>>;

    constructor(msg: string, sourceCalculation: Calculation<any>) {
        super(msg);
        this.sourceCalculation = sourceCalculation;
        this.passthruCalculations = new Set();
    }
}

export function calc<T>(fn: () => T, debugName?: string) {
    return new Calculation(fn, debugName);
}
