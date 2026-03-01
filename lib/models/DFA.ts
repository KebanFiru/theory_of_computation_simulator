import { DFAAutomaton, FiniteAutomaton } from "../automata";

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
}
