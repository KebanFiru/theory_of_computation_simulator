import type { TmTransition } from "../../types/turing";

/**
 * Turing Machine — formal 7-tuple per Wikipedia:
 * M = ⟨Q, Γ, b, Σ, δ, q0, F⟩
 *
 * Q          — finite non-empty set of states
 * Γ          — finite non-empty tape alphabet
 * b ∈ Γ      — blank symbol
 * Σ ⊆ Γ\{b}  — input alphabet
 * δ          — partial transition function (Q\F) × Γ ⇀ Q × Γ × {L,R,N}
 * q0 ∈ Q     — initial state
 * F ⊆ Q      — set of final (accepting) states
 *
 * The machine halts (and implicitly rejects) when δ is undefined
 * for the current (state, symbol) pair and the state is not in F.
 * There are no explicit reject states in this definition.
 */
export class TuringMachine {
  readonly states: string[];          // Q
  readonly inputAlphabet: string[];   // Σ
  readonly tapeAlphabet: string[];    // Γ
  readonly blankSymbol: string;       // b
  readonly startState: string;        // q0
  readonly finalStates: string[];     // F (accepting/halting states)
  readonly transitions: TmTransition[]; // δ

  constructor(args: {
    states: string[];
    inputAlphabet: string[];
    tapeAlphabet: string[];
    blankSymbol: string;
    startState: string;
    finalStates: string[];
    transitions: TmTransition[];
  }) {
    this.states = args.states;
    this.inputAlphabet = args.inputAlphabet;
    this.tapeAlphabet = args.tapeAlphabet;
    this.blankSymbol = args.blankSymbol;
    this.startState = args.startState;
    this.finalStates = args.finalStates;
    this.transitions = args.transitions;
  }

  static createDefault() {
    return new TuringMachine({
      states: ["q0", "qaccept"],
      inputAlphabet: ["0", "1"],
      tapeAlphabet: ["0", "1", "_"],
      blankSymbol: "_",
      startState: "q0",
      finalStates: ["qaccept"],
      transitions: [
        { from: "q0", read: "0", to: "q0", write: "0", move: "R" },
        { from: "q0", read: "1", to: "q0", write: "1", move: "R" },
        { from: "q0", read: "_", to: "qaccept", write: "_", move: "N" }
      ]
    });
  }

  toJSON() {
    return {
      type: "TuringMachine",
      // 7-tuple components labeled per Wikipedia
      Q: this.states,
      Gamma: this.tapeAlphabet,
      b: this.blankSymbol,
      Sigma: this.inputAlphabet,
      delta: this.transitions,
      q0: this.startState,
      F: this.finalStates
    };
  }
}
