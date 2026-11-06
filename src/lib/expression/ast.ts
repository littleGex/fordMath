import type { ConstantName, FunctionName } from "./builtins";
import type { Operator } from "./tokenize";

/**
 * The parsed expression as a tree (an "abstract syntax tree").
 * `Expr` refers to itself, which is how a type describes something nested to any depth.
 *
 *   x^2 + 3sin(x)  →        binary +
 *                          /        \
 *                    binary ^      binary * (implicit)
 *                    /     \        /     \
 *                  var    num 2   num 3   call sin
 *                                            |
 *                                           var
 */
export type Expr =
  | { type: "num"; value: number }
  | { type: "var" }
  | { type: "const"; name: ConstantName }
  | { type: "neg"; arg: Expr }
  | { type: "call"; fn: FunctionName; arg: Expr }
  | { type: "binary"; op: Operator; left: Expr; right: Expr; implicit?: boolean; paren?: boolean };
// `paren` marks an operation the user wrapped in brackets, e.g. (3 + 4) · 2. The value doesn't need it
// (the tree already says what goes first), but "Klammern zuerst" in the Punkt vor Strich trainer does.
