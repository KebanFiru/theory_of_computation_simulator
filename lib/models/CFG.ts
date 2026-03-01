export type ProductionRules = Record<string, string[]>;

export class CFG {
  readonly variables: string[];
  readonly terminals: string[];
  readonly startVariable: string;
  readonly productions: ProductionRules;

  constructor(variables: string[], terminals: string[], startVariable: string, productions: ProductionRules) {
    this.variables = variables;
    this.terminals = terminals;
    this.startVariable = startVariable;
    this.productions = productions;
  }

  static createDefault() {
    return new CFG(
      ["S"],
      ["a", "b"],
      "S",
      {
        S: ["aS", "bS", "ε"]
      }
    );
  }

  toJSON() {
    return {
      type: "CFG",
      variables: this.variables,
      terminals: this.terminals,
      startVariable: this.startVariable,
      productions: this.productions
    };
  }
}
