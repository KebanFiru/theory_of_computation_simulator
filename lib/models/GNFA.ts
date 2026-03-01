import { EPSILON, FiniteAutomaton } from "../automata";
import type { GnfaTransitionMap } from "../../types/automata";

const unionRegex = (a?: string, b?: string) => {
  if (!a || a === "∅") return b || "∅";
  if (!b || b === "∅") return a;
  if (a === b) return a;
  return `(${a}|${b})`;
};

export class GNFA {
  readonly states: string[];
  readonly startState: string;
  readonly acceptState: string;
  readonly transitions: GnfaTransitionMap;

  constructor(states: string[], startState: string, acceptState: string) {
    this.states = states;
    this.startState = startState;
    this.acceptState = acceptState;
    this.transitions = new Map();
  }

  addTransition(from: string, to: string, regexLabel: string) {
    if (!this.transitions.has(from)) {
      this.transitions.set(from, new Map());
    }
    const targetMap = this.transitions.get(from)!;
    const previous = targetMap.get(to);
    targetMap.set(to, unionRegex(previous, regexLabel));
  }

  static fromAutomaton(automaton: FiniteAutomaton) {
    const ids = [...automaton.states].sort((a, b) => a - b);
    const labels = new Map<number, string>();
    ids.forEach((id, index) => labels.set(id, `q${index}`));

    const start = "S";
    const accept = "F";
    const states = [start, ...ids.map(id => labels.get(id) ?? `q${id}`), accept];
    const gnfa = new GNFA(states, start, accept);

    const oldStartLabel = labels.get(automaton.startState);
    if (oldStartLabel) {
      gnfa.addTransition(start, oldStartLabel, EPSILON);
    }

    automaton.acceptStates.forEach(state => {
      const acceptLabel = labels.get(state);
      if (acceptLabel) {
        gnfa.addTransition(acceptLabel, accept, EPSILON);
      }
    });

    automaton.forEachTransition((from, to, symbol) => {
      const fromLabel = labels.get(from);
      const toLabel = labels.get(to);
      if (!fromLabel || !toLabel) return;
      gnfa.addTransition(fromLabel, toLabel, symbol || EPSILON);
    });

    return gnfa;
  }

  toJSON() {
    const serializedTransitions: Record<string, Record<string, string>> = {};
    this.transitions.forEach((targets, from) => {
      serializedTransitions[from] = {};
      targets.forEach((label, to) => {
        serializedTransitions[from][to] = label;
      });
    });

    return {
      type: "GNFA",
      states: this.states,
      startState: this.startState,
      acceptState: this.acceptState,
      transitions: serializedTransitions
    };
  }
}
