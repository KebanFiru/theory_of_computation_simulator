import type {
  TmExecutionResult,
  TmSnapshotSource,
  TmTransition
} from "../../types/turing";
import { Transition } from "../util-classes/transition";

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
  readonly rejectStates: string[];    // optional explicit reject states (extension)
  readonly transitions: TmTransition[]; // δ
  readonly validationIssues: string[];

  constructor(args: {
    states: string[];
    inputAlphabet: string[];
    tapeAlphabet: string[];
    blankSymbol: string;
    startState: string;
    finalStates: string[];
    rejectStates?: string[];
    transitions: TmTransition[];
    validationIssues?: string[];
  }) {
    this.states = args.states;
    this.inputAlphabet = args.inputAlphabet;
    this.tapeAlphabet = args.tapeAlphabet;
    this.blankSymbol = args.blankSymbol;
    this.startState = args.startState;
    this.finalStates = args.finalStates;
    this.rejectStates = args.rejectStates ?? [];
    this.transitions = args.transitions;
    this.validationIssues = args.validationIssues ?? [];
  }

  static isTmStateColor(color: string) {
    return color.startsWith("tm-");
  }

  static fromCanvasSnapshot({
    states,
    arrowPairs,
    fallbackInputAlphabet = []
  }: TmSnapshotSource) {
    const tmStateIndices = states
      .map((state, index) => ({ state, index }))
      .filter(({ state }) => TuringMachine.isTmStateColor(state.color));

    if (tmStateIndices.length === 0) {
      throw new Error("No TM states found in snapshot.");
    }

    const labelByIndex = new Map<number, string>();
    tmStateIndices.forEach(({ index }) => {
      labelByIndex.set(index, `q${index}`);
    });

    const startStateIndex = tmStateIndices[0].index;
    const startState = labelByIndex.get(startStateIndex) ?? "q0";

    const finalStates = tmStateIndices
      .filter(({ state }) => state.color === "tm-blue")
      .map(({ index }) => labelByIndex.get(index) ?? `q${index}`);

    const rejectStates = tmStateIndices
      .filter(({ state }) => state.color === "tm-purple")
      .map(({ index }) => labelByIndex.get(index) ?? `q${index}`);

    const transitions: TmTransition[] = [];
    const issues: string[] = [];
    const seenDeterministic = new Set<string>();
    const inferredSymbols = new Set<string>();

    arrowPairs.forEach(pair => {
      const fromLabel = labelByIndex.get(pair.from);
      const toLabel = labelByIndex.get(pair.to);
      if (!fromLabel || !toLabel) return;

      const parsed = Transition.parseTmLabel(pair.label ?? "");
      if (!parsed) {
        issues.push(`Invalid TM transition label on ${fromLabel} → ${toLabel}: "${pair.label ?? ""}"`);
        return;
      }

      const deterministicKey = `${fromLabel}|${parsed.read}`;
      if (seenDeterministic.has(deterministicKey)) {
        issues.push(`Non-deterministic TM transition for (${fromLabel}, ${parsed.read}).`);
        return;
      }
      seenDeterministic.add(deterministicKey);

      inferredSymbols.add(parsed.read);
      inferredSymbols.add(parsed.write);

      transitions.push({
        from: fromLabel,
        read: parsed.read,
        to: toLabel,
        write: parsed.write,
        move: parsed.move
      });
    });

    const blankSymbol = "_";
    const sanitizedInputAlphabet = Array.from(new Set(
      fallbackInputAlphabet
        .map(symbol => symbol.trim())
        .filter(symbol => symbol && symbol !== blankSymbol)
    ));

    const inferredInputAlphabet = Array.from(inferredSymbols).filter(symbol => symbol !== blankSymbol);
    const inputAlphabet = Array.from(new Set([...sanitizedInputAlphabet, ...inferredInputAlphabet]));
    const tapeAlphabet = Array.from(new Set([...inputAlphabet, ...Array.from(inferredSymbols), blankSymbol]));

    return new TuringMachine({
      states: tmStateIndices.map(({ index }) => labelByIndex.get(index) ?? `q${index}`),
      inputAlphabet,
      tapeAlphabet,
      blankSymbol,
      startState,
      finalStates,
      rejectStates,
      transitions,
      validationIssues: issues
    });
  }

  static createDefault() {
    return new TuringMachine({
      states: ["q0", "qaccept"],
      inputAlphabet: ["0", "1"],
      tapeAlphabet: ["0", "1", "_"],
      blankSymbol: "_",
      startState: "q0",
      finalStates: ["qaccept"],
      rejectStates: [],
      transitions: [
        { from: "q0", read: "0", to: "q0", write: "0", move: "R" },
        { from: "q0", read: "1", to: "q0", write: "1", move: "R" },
        { from: "q0", read: "_", to: "qaccept", write: "_", move: "N" }
      ]
    });
  }

  toTransitionTable() {
    const header = ["State", "Read", "Write", "Move", "Next"];
    if (this.transitions.length === 0) {
      return [header, ["-", "-", "-", "-", "-"]];
    }

    const rows = [...this.transitions]
      .sort((left, right) => {
        const fromCompare = left.from.localeCompare(right.from);
        if (fromCompare !== 0) return fromCompare;
        const readCompare = left.read.localeCompare(right.read);
        if (readCompare !== 0) return readCompare;
        return left.to.localeCompare(right.to);
      })
      .map(transition => {
        const stateLabel = this.finalStates.includes(transition.from)
          ? `${transition.from}*`
          : transition.from;
        return [
          stateLabel,
          transition.read,
          transition.write,
          transition.move,
          transition.to
        ];
      });

    return [header, ...rows];
  }

  testInput(input: string, maxSteps: number = 10_000): TmExecutionResult {
    const trimmed = input.trim();
    if (!trimmed) {
      return { status: "", detail: "" };
    }

    if (this.validationIssues.length > 0) {
      return {
        status: "Invalid",
        detail: this.validationIssues[0]
      };
    }

    const inputSymbols = Array.from(trimmed);
    const invalidSymbol = inputSymbols.find(symbol => !this.inputAlphabet.includes(symbol));
    if (invalidSymbol) {
      return {
        status: "Invalid",
        detail: `Input symbol "${invalidSymbol}" is not in Σ.`
      };
    }

    const transitionMap = new Map<string, TmTransition>();
    this.transitions.forEach(transition => {
      transitionMap.set(`${transition.from}|${transition.read}`, transition);
    });

    const tape = new Map<number, string>();
    inputSymbols.forEach((symbol, index) => {
      tape.set(index, symbol);
    });

    const readTape = (position: number) => tape.get(position) ?? this.blankSymbol;
    const writeTape = (position: number, symbol: string) => {
      if (symbol === this.blankSymbol) {
        tape.delete(position);
        return;
      }
      tape.set(position, symbol);
    };

    let state = this.startState;
    let head = 0;

    for (let step = 0; step < maxSteps; step += 1) {
      if (this.finalStates.includes(state)) {
        return {
          status: "Valid",
          detail: `Accepted in ${step} step(s).`
        };
      }

      if (this.rejectStates.includes(state)) {
        return {
          status: "Invalid",
          detail: `Rejected in explicit reject state (${state}) after ${step} step(s).`
        };
      }

      const read = readTape(head);
      const transition = transitionMap.get(`${state}|${read}`);
      if (!transition) {
        return {
          status: "Invalid",
          detail: `No transition for (${state}, ${read}); machine halts and rejects.`
        };
      }

      writeTape(head, transition.write);
      if (transition.move === "L") head -= 1;
      if (transition.move === "R") head += 1;
      state = transition.to;
    }

    return {
      status: "Invalid",
      detail: `Step limit (${maxSteps}) exceeded.`
    };
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
      F: this.finalStates,
      rejectStates: this.rejectStates,
      validationIssues: this.validationIssues
    };
  }
}
