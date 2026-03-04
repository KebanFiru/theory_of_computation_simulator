import { FiniteAutomaton } from "../automata/index";
import { NFA } from "./NFA";
import { SavedFA } from "../automata/saved-fa";
import type { SavedDFA } from "../../types/domain";

export class ENFA extends NFA {
  static fromSavedFA(savedFA: SavedDFA, fallbackAlphabet: string[] = []) {
    const automaton = SavedFA.toAutomaton(savedFA, fallbackAlphabet);
    return ENFA.fromAutomaton(automaton);
  }

  static fromAutomaton(automaton: FiniteAutomaton) {
    const next = new ENFA({
      states: automaton.states,
      alphabet: automaton.alphabet,
      startState: automaton.startState,
      acceptStates: automaton.acceptStates
    });

    automaton.forEachTransition((from, to, symbol) => {
      next.addTransition(from, to, symbol);
    });

    return next;
  }

  toSavedPreview(baseName: string) {
    const payload = this.toCanvasPayload({ x: 0, y: 0 });
    const table = this.toTable();
    return {
      name: `${baseName}-ENFA`,
      alphabet: payload.alphabet,
      states: payload.states,
      arrowPairs: payload.arrowPairs,
      target: "saved" as const,
      table,
      saveName: `${baseName}-ENFA`
    };
  }
}
