export const SymDebugName = Symbol('debugName');
export const SymRefcount = Symbol('refcount');
export const SymAlive = Symbol('alive');
export const SymDead = Symbol('dead');
export const SymRecalculate = Symbol('recalculate');
export const SymCycle = Symbol('cycle');
export const SymInvalidate = Symbol('invalidate');
export const SymProcessable = Symbol('processable');

const allSymbols = new Set();
allSymbols.add(SymDebugName);
allSymbols.add(SymRefcount);
allSymbols.add(SymAlive);
allSymbols.add(SymDead);
allSymbols.add(SymRecalculate);
allSymbols.add(SymCycle);
allSymbols.add(SymInvalidate);
allSymbols.add(SymProcessable);

export const isGooeySymbol = (sym: any) => allSymbols.has(sym);
