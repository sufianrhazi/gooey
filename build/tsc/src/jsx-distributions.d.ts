import type { Calculation } from './calc';
import type { Field } from './field';
/**
 * Deep magic: DistributeCalculation produces a Calculation<T> for every
 * possible combination of the union type T. Yes this is exponential.
 *
 * Is this necessary? Probably not, I could re-type all of the
 * JSX*ElementInterface things to have these combinations.
 *
 * Not gonna lie, I don't fully understand this. But there are type tests in
 * view.test.tsx to ensure a Calculation<string | number> is assignable to a
 * prop that accepts string | number | undefined
 *
 * Per https://stackoverflow.com/a/73911604
 */
export type DistributeCalculation<TUnion, TTmp = TUnion> = TUnion extends infer TUnionReduction ? Calculation<TUnion> | (DistributeCalculation<Exclude<TTmp, TUnionReduction>> extends infer TSubset ? TSubset extends Calculation<any> ? Calculation<TUnion | ReturnType<TSubset['get']>> : never : never) : never;
export type DistributeField<TUnion, TTmp = TUnion> = TUnion extends infer TUnionReduction ? Field<TUnion> | (DistributeField<Exclude<TTmp, TUnionReduction>> extends infer TSubset ? TSubset extends Field<any> ? Field<TUnion | ReturnType<TSubset['get']>> : never : never) : never;
//# sourceMappingURL=jsx-distributions.d.ts.map