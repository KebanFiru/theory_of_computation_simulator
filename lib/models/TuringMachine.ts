import type { TmTransition } from "../../types/turing";

export class TuringMachine {
  readonly states: string[];
  readonly inputAlphabet: string[];
  readonly tapeAlphabet: string[];
  readonly blankSymbol: string;
  readonly startState: string;
  readonly acceptStates: string[];
  readonly rejectStates: string[];
  readonly transitions: TmTransition[];

  constructor(args: {
    states: string[];
    inputAlphabet: string[];
    tapeAlphabet: string[];
    blankSymbol: string;
    startState: string;
    acceptStates: string[];
    rejectStates: string[];
    transitions: TmTransition[];
  }) {
    this.states = args.states;
    this.inputAlphabet = args.inputAlphabet;
    this.tapeAlphabet = args.tapeAlphabet;
    this.blankSymbol = args.blankSymbol;
    this.startState = args.startState;
    this.acceptStates = args.acceptStates;
    this.rejectStates = args.rejectStates;
    this.transitions = args.transitions;
  }

  static createDefault() {
    return new TuringMachine({
      states: ["q0", "qa", "qr"],
      inputAlphabet: ["0", "1"],
      tapeAlphabet: ["0", "1", "_"],
      blankSymbol: "_",
      startState: "q0",
      acceptStates: ["qa"],
      rejectStates: ["qr"],
      transitions: [
        { from: "q0", read: "0", to: "q0", write: "0", move: "R" },
        { from: "q0", read: "1", to: "q0", write: "1", move: "R" },
        { from: "q0", read: "_", to: "qa", write: "_", move: "S" }
      ]
    });
  }

  toJSON() {
    return {
      type: "TuringMachine",
      states: this.states,
      inputAlphabet: this.inputAlphabet,
      tapeAlphabet: this.tapeAlphabet,
      blankSymbol: this.blankSymbol,
      startState: this.startState,
      acceptStates: this.acceptStates,
      rejectStates: this.rejectStates,
      transitions: this.transitions
    };
  }
}
