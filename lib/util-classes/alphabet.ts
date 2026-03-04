export class Alphabet {
  symbols: string[];

  constructor(symbols: string[] = []) {
    this.symbols = [...symbols];
  }

  static from(symbols: string[]) {
    return new Alphabet(symbols);
  }

  trimmed() {
    return this.symbols.map(symbol => symbol.trim());
  }

  emptySymbols() {
    return this.trimmed().filter(symbol => symbol === "");
  }

  duplicateSymbols() {
    const counts = new Map<string, number>();
    this.trimmed().forEach(symbol => {
      counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
    });
    return [...counts.entries()].filter(([symbol, count]) => symbol !== "" && count > 1).map(([symbol]) => symbol);
  }

  hasEmptyAfterTrim() {
    return this.emptySymbols().length > 0;
  }

  hasDuplicatesAfterTrim() {
    return this.duplicateSymbols().length > 0;
  }

  sanitize() {
    const sanitized: string[] = [];
    this.trimmed().forEach(symbol => {
      if (!symbol) return;
      if (sanitized.includes(symbol)) return;
      sanitized.push(symbol);
    });
    return sanitized;
  }
}
