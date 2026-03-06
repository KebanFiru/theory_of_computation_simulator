import { EPSILON, FiniteAutomaton } from "../automata/index";
import type { GnfaTransitionMap } from "../../types/automata";
import { State } from "../util-classes/state";
import { Transition } from "../util-classes/transition";
import { SavedFA } from "../automata/saved-fa";
import type { SavedDFA } from "../../types/domain";

const unionRegex = (a?: string, b?: string) => {
  if (!a || a === "∅") return b || "∅";
  if (!b || b === "∅") return a;
  if (a === b) return a;
  return `(${a}|${b})`;
};

export class GNFA {
  readonly states: string[];
  readonly startState: string;
  readonly acceptState: string;
  readonly transitions: GnfaTransitionMap;

  constructor(states: string[], startState: string, acceptState: string) {
    this.states = states;
    this.startState = startState;
    this.acceptState = acceptState;
    this.transitions = new Map();
  }

  addTransition(from: string, to: string, regexLabel: string) {
    if (!this.transitions.has(from)) {
      this.transitions.set(from, new Map());
    }
    const targetMap = this.transitions.get(from)!;
    const previous = targetMap.get(to);
    targetMap.set(to, unionRegex(previous, regexLabel));
  }

  static fromAutomaton(automaton: FiniteAutomaton) {
    const ids = [...automaton.states].sort((a, b) => a - b);
    const labels = new Map<number, string>();
    ids.forEach((id, index) => labels.set(id, `q${index}`));

    const start = "S";
    const accept = "F";
    const states = [start, ...ids.map(id => labels.get(id) ?? `q${id}`), accept];
    const gnfa = new GNFA(states, start, accept);

    const oldStartLabel = labels.get(automaton.startState);
    if (oldStartLabel) {
      gnfa.addTransition(start, oldStartLabel, EPSILON);
    }

    automaton.acceptStates.forEach(state => {
      const acceptLabel = labels.get(state);
      if (acceptLabel) {
        gnfa.addTransition(acceptLabel, accept, EPSILON);
      }
    });

    automaton.forEachTransition((from, to, symbol) => {
      const fromLabel = labels.get(from);
      const toLabel = labels.get(to);
      if (!fromLabel || !toLabel) return;
      gnfa.addTransition(fromLabel, toLabel, symbol || EPSILON);
    });

    return gnfa;
  }

  static fromSavedFA(savedFA: SavedDFA, fallbackAlphabet: string[] = []) {
    return GNFA.fromAutomaton(SavedFA.toAutomaton(savedFA, fallbackAlphabet));
  }

  toRegex(): string {
    const wrapIfUnion = (r: string): string => {
      if (!r || r === "∅") return r;
      if (r.startsWith("(") && r.endsWith(")")) return r;
      if (r.includes("|")) return `(${r})`;
      return r;
    };

    const trans = new Map<string, Map<string, string>>();
    const setT = (from: string, to: string, label: string) => {
      if (!trans.has(from)) trans.set(from, new Map());
      trans.get(from)!.set(to, label);
    };
    this.transitions.forEach((targets, from) => {
      targets.forEach((label, to) => setT(from, to, label));
    });

    const innerStates = this.states.filter(s => s !== this.startState && s !== this.acceptState);

    for (const qRip of innerStates) {
      const predecessors: string[] = [];
      trans.forEach((_t, from) => {
        if (from !== qRip && trans.get(from)?.has(qRip)) predecessors.push(from);
      });
      const successors: string[] = [];
      trans.get(qRip)?.forEach((_l, to) => {
        if (to !== qRip) successors.push(to);
      });

      const selfLoopLabel = trans.get(qRip)?.get(qRip);
      const selfRegex = selfLoopLabel && selfLoopLabel !== "∅"
        ? `${wrapIfUnion(selfLoopLabel)}*`
        : "";

      for (const qi of predecessors) {
        for (const qj of successors) {
          const r1 = trans.get(qi)?.get(qRip) ?? "";
          const r3 = trans.get(qRip)?.get(qj) ?? "";
          if (!r1 || r1 === "∅" || !r3 || r3 === "∅") continue;
          const parts = [wrapIfUnion(r1), selfRegex, wrapIfUnion(r3)].filter(Boolean);
          const newPath = parts.join("");
          const existing = trans.get(qi)?.get(qj);
          setT(qi, qj, unionRegex(existing, newPath));
        }
      }

      trans.delete(qRip);
      trans.forEach(targets => targets.delete(qRip));
    }

    return trans.get(this.startState)?.get(this.acceptState) ?? "∅";
  }

  toCanvasPayload(origin: { x: number; y: number } = { x: 0, y: 0 }) {
    const labelToIndex = new Map<string, number>();
    const stateCount = this.states.length;
    const radius = stateCount > 1 ? 140 : 0;
    const step = stateCount > 0 ? (Math.PI * 2) / stateCount : 0;

    const states = this.states.map((label, index) => {
      labelToIndex.set(label, index);
      const angle = step * index - Math.PI / 2;
      const color = label === this.startState ? "red" : label === this.acceptState ? "blue" : "green";
      return State.create({
        x: origin.x + Math.cos(angle) * radius,
        y: origin.y + Math.sin(angle) * radius,
        color,
        r: 20,
        id: Date.now() + Math.random() + index
      });
    });

    const arrowPairs: Transition[] = [];
    this.transitions.forEach((targets, from) => {
      const fromIndex = labelToIndex.get(from);
      if (fromIndex === undefined) return;
      targets.forEach((label, to) => {
        const toIndex = labelToIndex.get(to);
        if (toIndex === undefined) return;
        arrowPairs.push(Transition.create(fromIndex, toIndex, label));
      });
    });

    return {
      states,
      arrowPairs,
      alphabet: [] as string[]
    };
  }

  toTable() {
    const payload = this.toCanvasPayload();
    const uniqueLabels = new Set<string>();
    payload.arrowPairs.forEach(pair => {
      if (pair.label) uniqueLabels.add(pair.label);
    });

    const tableHeader = ["State", ...Array.from(uniqueLabels)];
    const tableRows = this.states.map((label, index) => {
      const rowName = label === this.acceptState ? `${label}*` : label;
      const row = [rowName];
      tableHeader.slice(1).forEach(symbol => {
        const targets = payload.arrowPairs
          .filter(pair => pair.from === index && pair.label === symbol)
          .map(pair => this.states[pair.to])
          .filter(Boolean);
        row.push(targets.length ? targets.join(",") : "-");
      });
      return row;
    });

    return [tableHeader, ...tableRows];
  }

  toSavedPreview(baseName: string) {
    const payload = this.toCanvasPayload();
    return {
      name: `${baseName}-GNFA`,
      alphabet: payload.alphabet,
      states: payload.states,
      arrowPairs: payload.arrowPairs,
      target: "saved" as const,
      table: this.toTable(),
      saveName: `${baseName}-GNFA`
    };
  }

  toJSON() {
    const serializedTransitions: Record<string, Record<string, string>> = {};
    this.transitions.forEach((targets, from) => {
      serializedTransitions[from] = {};
      targets.forEach((label, to) => {
        serializedTransitions[from][to] = label;
      });
    });

    return {
      type: "GNFA",
      states: this.states,
      startState: this.startState,
      acceptState: this.acceptState,
      transitions: serializedTransitions
    };
  }
}
