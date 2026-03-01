import { DFAAutomaton, FiniteAutomaton } from "../automata";

export class DNFA extends DFAAutomaton {
  static fromNFA(automaton: FiniteAutomaton) {
    const deterministic = automaton.determinize();
    const next = new DNFA({
      states: deterministic.states,
      alphabet: deterministic.alphabet,
      startState: deterministic.startState,
      acceptStates: deterministic.acceptStates
    });
    deterministic.forEachTransition((from, to, symbol) => next.addTransition(from, to, symbol));
    return next;
  }
}
