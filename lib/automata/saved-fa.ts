import type { SavedDFA } from "../../types/domain";
import { DFAAutomaton, FiniteAutomaton, NFAAutomaton } from "./finite-automaton";

export class SavedFA {
  static toAutomaton(savedFA: SavedDFA, fallbackAlphabet: string[] = []) {
    const fromSnapshot = savedFA.snapshot?.states?.length
      ? FiniteAutomaton.fromCanvasSnapshot(savedFA.snapshot.states, savedFA.snapshot.arrowPairs ?? [], fallbackAlphabet)
      : FiniteAutomaton.fromTable(savedFA.table);

    return fromSnapshot.getType() === "NFA" ? NFAAutomaton.from(fromSnapshot) : DFAAutomaton.from(fromSnapshot);
  }

  static getType(savedFA: SavedDFA, fallbackAlphabet: string[] = []) {
    return SavedFA.toAutomaton(savedFA, fallbackAlphabet).getType();
  }
}
