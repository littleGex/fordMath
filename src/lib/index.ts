// Public API. Internal *Unchecked / *OfSorted helpers are intentionally not re-exported.
export { assertValid } from "./validate";
export { mean } from "./mean";
export { median } from "./median";
export { mode } from "./mode";
export { variance, standardDeviation, type DeviationKind } from "./deviation";
export { getStats, type Stats } from "./stats";
export {
  solveQuadratic,
  discriminant,
  evaluateQuadratic,
  type QuadraticSolution,
  type QuadraticRoots,
  type Parabola,
  type Complex,
} from "./quadratic";
