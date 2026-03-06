import type {
  MoveDirection,
  TmExecutionResult,
  TmSnapshotSource,
  TmTransition
} from "../../types/turing";
import { Transition } from "../util-classes/transition";

export class TuringMachine {
  readonly states: string[];
  readonly inputAlphabet: string[];
  readonly tapeAlphabet: string[];
  readonly blankSymbol: string;
  readonly tapeCount: number;
  readonly startState: string;
  readonly finalStates: string[];
  readonly rejectStates: string[];
  readonly transitions: TmTransition[];
  readonly validationIssues: string[];

  constructor(args: {
    states: string[];
    inputAlphabet: string[];
    tapeAlphabet: string[];
    blankSymbol: string;
    tapeCount?: number;
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
    this.tapeCount = Math.max(1, args.tapeCount ?? TuringMachine.inferTapeCount(args.transitions));
    this.startState = args.startState;
    this.finalStates = args.finalStates;
    this.rejectStates = args.rejectStates ?? [];
    this.transitions = args.transitions;
    this.validationIssues = args.validationIssues ?? [];
  }

  private static inferTapeCount(transitions: TmTransition[]) {
    if (transitions.length === 0) return 1;

    return transitions.reduce((max, transition) => {
      const localMax = Math.max(
        transition.reads.length,
        transition.writes.length,
        transition.moves.length,
        1
      );
      return Math.max(max, localMax);
    }, 1);
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
    const inferredSymbols = new Set<string>();
    const inferredInputSymbols = new Set<string>();
    let expectedTapeCount: number | null = null;

    arrowPairs.forEach(pair => {
      const fromLabel = labelByIndex.get(pair.from);
      const toLabel = labelByIndex.get(pair.to);
      if (!fromLabel || !toLabel) return;

      const parsed = Transition.parseTmLabel(pair.label ?? "");
      if (!parsed) {
        issues.push(`Invalid TM transition label on ${fromLabel} → ${toLabel}: "${pair.label ?? ""}"`);
        return;
      }

      if (expectedTapeCount === null) {
        expectedTapeCount = parsed.tapeCount;
      }

      if (expectedTapeCount !== parsed.tapeCount) {
        issues.push(
          `Inconsistent TM tape count on ${fromLabel} → ${toLabel}: expected ${expectedTapeCount}, got ${parsed.tapeCount}.`
        );
        return;
      }

      parsed.reads.forEach(symbol => inferredSymbols.add(symbol));
      parsed.writes.forEach(symbol => inferredSymbols.add(symbol));

      const firstRead = parsed.reads[0];
      const firstWrite = parsed.writes[0];
      if (firstRead) inferredInputSymbols.add(firstRead);
      if (firstWrite) inferredInputSymbols.add(firstWrite);

      transitions.push({
        from: fromLabel,
        to: toLabel,
        reads: parsed.reads,
        writes: parsed.writes,
        moves: parsed.moves
      });
    });

    const blankSymbol = "_";
    const sanitizedInputAlphabet = Array.from(new Set(
      fallbackInputAlphabet
        .map(symbol => symbol.trim())
        .filter(symbol => symbol && symbol !== blankSymbol)
    ));

    const inferredInputAlphabet = Array.from(inferredInputSymbols).filter(symbol => symbol !== blankSymbol);
    const inputAlphabet = Array.from(new Set([...sanitizedInputAlphabet, ...inferredInputAlphabet]));
    const tapeAlphabet = Array.from(new Set([...inputAlphabet, ...Array.from(inferredSymbols), blankSymbol]));
    const tapeCount = expectedTapeCount ?? 1;

    return new TuringMachine({
      states: tmStateIndices.map(({ index }) => labelByIndex.get(index) ?? `q${index}`),
      inputAlphabet,
      tapeAlphabet,
      blankSymbol,
      tapeCount,
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
      tapeCount: 1,
      startState: "q0",
      finalStates: ["qaccept"],
      rejectStates: [],
      transitions: [
        { from: "q0", to: "q0", reads: ["0"], writes: ["0"], moves: ["R"] },
        { from: "q0", to: "q0", reads: ["1"], writes: ["1"], moves: ["R"] },
        { from: "q0", to: "qaccept", reads: ["_"], writes: ["_"], moves: ["N"] }
      ]
    });
  }

  private normalizeTransition(transition: TmTransition) {
    const reads = Array.from({ length: this.tapeCount }).map((_, index) =>
      transition.reads[index] ?? this.blankSymbol
    );
    const writes = Array.from({ length: this.tapeCount }).map((_, index) =>
      transition.writes[index] ?? reads[index]
    );
    const moves = Array.from({ length: this.tapeCount }).map((_, index) =>
      transition.moves[index] ?? "N"
    ) as MoveDirection[];

    return { reads, writes, moves };
  }

  private getReadKey(state: string, reads: string[]) {
    return `${state}|${reads.join("\u241f")}`;
  }

  private isNondeterministic() {
    const counts = new Map<string, number>();

    this.transitions.forEach(transition => {
      const normalized = this.normalizeTransition(transition);
      const key = this.getReadKey(transition.from, normalized.reads);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return Array.from(counts.values()).some(count => count > 1);
  }

  toTransitionTable() {
    const header = this.tapeCount === 1
      ? ["State", "Read", "Write", "Move", "Next"]
      : [
          "State",
          ...Array.from({ length: this.tapeCount }).flatMap((_, index) => [
            `Read ${index + 1}`,
            `Write ${index + 1}`,
            `Move ${index + 1}`
          ]),
          "Next"
        ];

    if (this.transitions.length === 0) {
      return [header, Array.from({ length: header.length }).map(() => "-")];
    }

    const rows = [...this.transitions]
      .sort((left, right) => {
        const fromCompare = left.from.localeCompare(right.from);
        if (fromCompare !== 0) return fromCompare;
        const leftRead = this.normalizeTransition(left).reads.join("");
        const rightRead = this.normalizeTransition(right).reads.join("");
        const readCompare = leftRead.localeCompare(rightRead);
        if (readCompare !== 0) return readCompare;
        return left.to.localeCompare(right.to);
      })
      .map(transition => {
        const normalized = this.normalizeTransition(transition);
        const stateLabel = this.finalStates.includes(transition.from)
          ? `${transition.from}*`
          : transition.from;

        if (this.tapeCount === 1) {
          return [
            stateLabel,
            normalized.reads[0],
            normalized.writes[0],
            normalized.moves[0],
            transition.to
          ];
        }

        return [
          stateLabel,
          ...normalized.reads.flatMap((read, index) => [read, normalized.writes[index], normalized.moves[index]]),
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

    const transitionMap = new Map<string, Array<{
      to: string;
      reads: string[];
      writes: string[];
      moves: MoveDirection[];
    }>>();

    this.transitions.forEach(transition => {
      const normalized = this.normalizeTransition(transition);
      const key = this.getReadKey(transition.from, normalized.reads);
      const existing = transitionMap.get(key) ?? [];
      existing.push({
        to: transition.to,
        reads: normalized.reads,
        writes: normalized.writes,
        moves: normalized.moves
      });
      transitionMap.set(key, existing);
    });

    const readTape = (tape: Map<number, string>, position: number) =>
      tape.get(position) ?? this.blankSymbol;

    const writeTape = (tape: Map<number, string>, position: number, symbol: string) => {
      if (symbol === this.blankSymbol) {
        tape.delete(position);
        return;
      }
      tape.set(position, symbol);
    };

    const serializeTape = (tape: Map<number, string>) =>
      Array.from(tape.entries())
        .sort((left, right) => left[0] - right[0])
        .map(([index, symbol]) => `${index}:${symbol}`)
        .join(",");

    const serializeConfig = (config: {
      state: string;
      heads: number[];
      tapes: Array<Map<number, string>>;
    }) => `${config.state}|${config.heads.join(",")}|${config.tapes.map(serializeTape).join("|")}`;

    const initialTapes = Array.from({ length: this.tapeCount }).map((_, tapeIndex) => {
      const tape = new Map<number, string>();
      if (tapeIndex === 0) {
        inputSymbols.forEach((symbol, index) => {
          tape.set(index, symbol);
        });
      }
      return tape;
    });

    const initialConfig = {
      state: this.startState,
      heads: Array.from({ length: this.tapeCount }).map(() => 0),
      tapes: initialTapes
    };

    const seenConfigurations = new Set<string>();
    seenConfigurations.add(serializeConfig(initialConfig));
    const maxVisitedConfigurations = 100_000;

    let frontier = [initialConfig];

    for (let step = 0; step <= maxSteps; step += 1) {
      const accepted = frontier.some(config => this.finalStates.includes(config.state));
      if (accepted) {
        return {
          status: "Valid",
          detail: `Accepted in ${step} step(s) (${this.tapeCount}-tape ${this.isNondeterministic() ? "NTM" : "DTM"}).`
        };
      }

      if (step === maxSteps) {
        break;
      }

      const nextFrontier: typeof frontier = [];

      for (const config of frontier) {
        if (this.rejectStates.includes(config.state)) {
          continue;
        }

        const reads = config.tapes.map((tape, tapeIndex) => readTape(tape, config.heads[tapeIndex]));
        const key = this.getReadKey(config.state, reads);
        const candidates = transitionMap.get(key) ?? [];

        for (const candidate of candidates) {
          const nextHeads = [...config.heads];
          const nextTapes = config.tapes.map(tape => new Map(tape));

          for (let tapeIndex = 0; tapeIndex < this.tapeCount; tapeIndex += 1) {
            const headPosition = nextHeads[tapeIndex];
            writeTape(nextTapes[tapeIndex], headPosition, candidate.writes[tapeIndex]);

            const move = candidate.moves[tapeIndex];
            if (move === "L") nextHeads[tapeIndex] -= 1;
            if (move === "R") nextHeads[tapeIndex] += 1;
          }

          const nextConfig = {
            state: candidate.to,
            heads: nextHeads,
            tapes: nextTapes
          };

          const signature = serializeConfig(nextConfig);
          if (seenConfigurations.has(signature)) {
            continue;
          }

          seenConfigurations.add(signature);
          if (seenConfigurations.size > maxVisitedConfigurations) {
            return {
              status: "Invalid",
              detail: `Configuration limit (${maxVisitedConfigurations}) exceeded while exploring nondeterministic branches.`
            };
          }

          nextFrontier.push(nextConfig);
        }
      }

      if (nextFrontier.length === 0) {
        return {
          status: "Invalid",
          detail: "All branches halted without reaching an accept state."
        };
      }

      frontier = nextFrontier;
    }

    return {
      status: "Invalid",
      detail: `Step limit (${maxSteps}) exceeded.`
    };
  }

  toJSON() {
    return {
      type: "TuringMachine",
      Q: this.states,
      k: this.tapeCount,
      Gamma: this.tapeAlphabet,
      b: this.blankSymbol,
      Sigma: this.inputAlphabet,
      delta: this.transitions,
      q0: this.startState,
      F: this.finalStates,
      rejectStates: this.rejectStates,
      nondeterministic: this.isNondeterministic(),
      validationIssues: this.validationIssues
    };
  }
}
