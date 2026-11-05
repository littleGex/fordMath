const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/** Parses "3, 1.5; -2 4e2" into numbers. Dots are decimals; commas separate values. */
export function parseValues(text: string): number[] {
  const tokens = text.split(/[\s,;]+/).filter(Boolean);
  const bad = tokens.find((t) => !NUMBER.test(t));
  if (bad !== undefined) {
    throw new Error(`"${bad}" isn't a number. Use digits, an optional minus sign and a dot for decimals.`);
  }
  return tokens.map(Number);
}

/** Up to 6 decimals, trailing zeros trimmed. */
export const formatNumber = (n: number): string => String(parseFloat(n.toFixed(6)));
