/**
 * The only functions and constants an expression may use.
 * `satisfies` checks the shape without widening the type, so `keyof typeof FUNCTIONS`
 * is the exact union "sin" | "cos" | … rather than plain `string`.
 */
export const FUNCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  log10: Math.log10,
  sqrt: Math.sqrt,
  abs: Math.abs,
} satisfies Record<string, (x: number) => number>;

export type FunctionName = keyof typeof FUNCTIONS;

export const CONSTANTS = {
  pi: Math.PI,
  e: Math.E,
} satisfies Record<string, number>;

export type ConstantName = keyof typeof CONSTANTS;

/**
 * Type guard: after `if (isFunctionName(s))`, TypeScript treats `s` as a FunctionName.
 * Object.hasOwn (not `s in FUNCTIONS`) so inherited names like "constructor" or
 * "toString" are rejected instead of reaching Object.prototype.
 */
export const isFunctionName = (name: string): name is FunctionName => Object.hasOwn(FUNCTIONS, name);

export const isConstantName = (name: string): name is ConstantName => Object.hasOwn(CONSTANTS, name);
