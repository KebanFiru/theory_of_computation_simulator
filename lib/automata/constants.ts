export const EPSILON = "ε";

export const normalizeSymbol = (symbol?: string) => {
  if (!symbol) return "";
  const value = symbol.trim();
  if (value === "") return "";
  if (value === "eps" || value === "epsilon" || value === "λ") return EPSILON;
  return value;
};

export const sortedNumbers = (values: Iterable<number>) => [...values].sort((a, b) => a - b);
