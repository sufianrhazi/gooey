import { Calculation, DAGNode, EqualityFunc } from './types';
/**
 * Reset all data to a clean slate.
 */
export declare function reset(): void;
/**
 * Create a calculation cell: while the provided function is executed, all dependencies are tracked.
 *
 * The provided function will be recalculated when any of those dependencies are changed. The result of this function is
 * treated as a dependency, so if recalculations change the result, any dependent calculations are recalculated.
 */
export declare function calc<Ret>(func: () => Ret): Calculation<Ret>;
export declare function calc<Ret>(func: () => Ret, debugName: string): Calculation<Ret>;
export declare function calc<Ret>(func: () => Ret, isEqual: EqualityFunc<Ret>): Calculation<Ret>;
export declare function calc<Ret>(func: () => Ret, isEqual: EqualityFunc<Ret>, debugName: string): Calculation<Ret>;
/**
 * Create an effect cell: while the provided function is executed, all dependencies are tracked.
 *
 * The provided function will be re-executed when any of those dependencies are changed.
 *
 * Effect cells are not be added as dependencies to the current computation.
 *
 * Note: Since nothing depends on created effects, they must be be manually retained and released if you want the effect
 * to re-run when its dependencies change. Failure to do so will not automatically re-run the effect (which may be
 * desired if you want to trigger behavior only once within a computation)
 */
export declare function effect(func: () => void, debugName?: string): Calculation<void>;
export declare function untracked<TRet>(func: () => TRet): TRet;
export declare function addDepToCurrentCalculation(item: DAGNode): void;
export declare function addManualDep(fromNode: DAGNode, toNode: DAGNode): void;
export declare function removeManualDep(fromNode: DAGNode, toNode: DAGNode): void;
export declare function processChange(item: DAGNode): void;
declare type Listener = () => void;
export declare function nextFlush(): Promise<void>;
/**
 * Call provided callback when any pending calculations are created. Use to configure how/when the application flushes calculations.
 *
 * If any pending calculations are needed when this function is called, the provided callback is called synchronously.
 *
 * By default, the subscribe mechanism is to call flush() on setTimeout. Calling subscribe removes this default and
 * replaces it with whatever mechanism you'd like.
 *
 * Example: subscribe(() => requestAnimationFrame(() => flush()));
 */
export declare function subscribe(listener: Listener): void;
/**
 * Recalculate all pending calculations.
 */
export declare function flush(): void;
/**
 * Retain a calculation (increase the refcount)
 */
export declare function retain(item: DAGNode): void;
/**
 * Release a calculation (decrease the refcount). If the refcount reaches zero, the calculation will be garbage
 * collected.
 */
export declare function release(item: DAGNode): void;
/**
 * Return a graphviz formatted directed graph
 */
export declare function debug(): string;
export {};
//# sourceMappingURL=calc.d.ts.map