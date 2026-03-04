import { DFAAutomaton, FiniteAutomaton } from "../automata/index";
import { SavedFA } from "../automata/saved-fa";
import type { SavedDFA } from "../../types/domain";

export class DFA extends DFAAutomaton {
  static create(stateCount: number, alphabet: string[]) {
    const states = Array.from({ length: Math.max(1, stateCount) }, (_, index) => index);
    return new DFA({
      states,
      alphabet,
      startState: 0,
      acceptStates: states.length > 0 ? [states[states.length - 1]] : []
    });
  }

  static fromAutomaton(automaton: FiniteAutomaton) {
    const dfa = automaton.getType() === "NFA" ? automaton.determinize() : DFAAutomaton.from(automaton);
    const next = new DFA({
      states: dfa.states,
      alphabet: dfa.alphabet,
      startState: dfa.startState,
      acceptStates: dfa.acceptStates
    });
    dfa.forEachTransition((from, to, symbol) => next.addTransition(from, to, symbol));
    return next;
  }

  static fromSavedFA(savedFA: SavedDFA, fallbackAlphabet: string[] = []) {
    const automaton = SavedFA.toAutomaton(savedFA, fallbackAlphabet);
    return DFA.fromAutomaton(automaton);
  }

  toSavedPreview(baseName: string) {
    const payload = this.toCanvasPayload({ x: 0, y: 0 });
    const table = this.toTable();
    return {
      name: `${baseName}-DFA`,
      alphabet: payload.alphabet,
      states: payload.states,
      arrowPairs: payload.arrowPairs,
      target: "saved" as const,
      table,
      saveName: `${baseName}-DFA`
    };
  }
}
