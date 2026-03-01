import { FiniteAutomaton, NFAAutomaton } from "../automata";

export class NFA extends NFAAutomaton {
  static create(stateCount: number, alphabet: string[]) {
    const states = Array.from({ length: Math.max(1, stateCount) }, (_, index) => index);
    return new NFA({
      states,
      alphabet,
      startState: 0,
      acceptStates: states.length > 0 ? [states[states.length - 1]] : []
    });
  }

  static fromAutomaton(automaton: FiniteAutomaton) {
    const next = new NFA({
      states: automaton.states,
      alphabet: automaton.alphabet,
      startState: automaton.startState,
      acceptStates: automaton.acceptStates
    });
    automaton.forEachTransition((from, to, symbol) => next.addTransition(from, to, symbol));
    return next;
  }
}
