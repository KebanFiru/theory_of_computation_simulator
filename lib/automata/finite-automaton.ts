import { State } from "../util-classes/state";
import { Transition } from "../util-classes/transition";
import type { AutomatonInit, TransitionMap } from "../../types/automata";
import { EPSILON, normalizeSymbol, sortedNumbers } from "./constants";

export class FiniteAutomaton {
  protected transitions: TransitionMap = new Map();
  readonly states: Set<number>;
  readonly alphabet: Set<string>;
  startState: number;
  readonly acceptStates: Set<number>;

  constructor({ states, alphabet = [], startState, acceptStates = [] }: AutomatonInit) {
    this.states = new Set(states);
    this.alphabet = new Set([...alphabet].map(normalizeSymbol).filter(symbol => symbol && symbol !== EPSILON));
    this.startState = startState;
    this.acceptStates = new Set(acceptStates);
  }

  static clone(source: FiniteAutomaton) {
    const next = new FiniteAutomaton({
      states: source.states,
      alphabet: source.alphabet,
      startState: source.startState,
      acceptStates: source.acceptStates
    });
    source.transitions.forEach((symbolMap, from) => {
      symbolMap.forEach((targets, symbol) => {
        targets.forEach(target => {
          next.addTransition(from, target, symbol);
        });
      });
    });
    return next;
  }

  static fromTable(table: string[][]) {
    const header = table[0] ?? [];
    const symbols = (header.slice(1) ?? []).map(normalizeSymbol).filter(Boolean);
    const rows = table.slice(1);
    const stateNames = rows.map(row => (row?.[0] ?? "").replace(/\*$/, "").trim()).filter(Boolean);

    const labelToId = new Map<string, number>();
    stateNames.forEach((label, index) => labelToId.set(label, index));

    const automaton = new FiniteAutomaton({
      states: stateNames.map((_, index) => index),
      alphabet: symbols.filter(symbol => symbol !== EPSILON),
      startState: 0,
      acceptStates: rows
        .map((row, index) => ({ label: row?.[0] ?? "", index }))
        .filter(({ label }) => /\*$/.test(label))
        .map(({ index }) => index)
    });

    rows.forEach((row, rowIndex) => {
      symbols.forEach((symbol, symbolIndex) => {
        const cell = row?.[symbolIndex + 1] ?? "-";
        const targets = String(cell)
          .split(",")
          .map(value => value.trim())
          .filter(Boolean)
          .filter(value => value !== "-");

        targets.forEach(targetLabel => {
          const target = labelToId.get(targetLabel);
          if (target === undefined) return;
          automaton.addTransition(rowIndex, target, symbol);
        });
      });
    });

    return automaton;
  }

  static fromCanvasSnapshot(states: State[], arrowPairs: Transition[], alphabet: string[] = []) {
    const startIndex = states.findIndex(state => state.color === "red");
    const acceptIndices = states
      .map((state, index) => ({ state, index }))
      .filter(({ state }) => state.color === "blue")
      .map(({ index }) => index);

    const automaton = new FiniteAutomaton({
      states: states.map((_, index) => index),
      alphabet: alphabet.map(normalizeSymbol).filter(symbol => symbol && symbol !== EPSILON),
      startState: startIndex >= 0 ? startIndex : 0,
      acceptStates: acceptIndices
    });

    arrowPairs.forEach(pair => {
      const symbol = normalizeSymbol(pair.label);
      if (!symbol) return;
      automaton.addTransition(pair.from, pair.to, symbol);
    });

    return automaton;
  }

  addTransition(from: number, to: number, symbol: string) {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) return;

    this.states.add(from);
    this.states.add(to);
    if (normalized !== EPSILON) {
      this.alphabet.add(normalized);
    }

    if (!this.transitions.has(from)) {
      this.transitions.set(from, new Map());
    }
    const symbolMap = this.transitions.get(from)!;
    if (!symbolMap.has(normalized)) {
      symbolMap.set(normalized, new Set());
    }
    symbolMap.get(normalized)!.add(to);
  }

  getTransitions(from: number, symbol: string) {
    const normalized = normalizeSymbol(symbol);
    return new Set(this.transitions.get(from)?.get(normalized) ?? []);
  }

  forEachTransition(callback: (from: number, to: number, symbol: string) => void) {
    this.transitions.forEach((symbolMap, from) => {
      symbolMap.forEach((targets, symbol) => {
        targets.forEach(to => callback(from, to, symbol));
      });
    });
  }

  hasEpsilonTransitions() {
    for (const [, symbolMap] of this.transitions) {
      if (symbolMap.has(EPSILON) && (symbolMap.get(EPSILON)?.size ?? 0) > 0) return true;
    }
    return false;
  }

  private epsilonClosure(seed: Set<number>) {
    const closure = new Set(seed);
    const stack = [...seed];

    while (stack.length > 0) {
      const current = stack.pop()!;
      const next = this.transitions.get(current)?.get(EPSILON) ?? new Set<number>();
      next.forEach(target => {
        if (closure.has(target)) return;
        closure.add(target);
        stack.push(target);
      });
    }

    return closure;
  }

  private move(states: Set<number>, symbol: string) {
    const result = new Set<number>();
    states.forEach(state => {
      const targets = this.getTransitions(state, symbol);
      targets.forEach(target => result.add(target));
    });
    return result;
  }

  accepts(input: string) {
    if (!this.states.has(this.startState)) return false;

    let current = this.epsilonClosure(new Set([this.startState]));

    for (const symbol of input) {
      if (!this.alphabet.has(symbol)) return false;
      const next = this.move(current, symbol);
      current = this.epsilonClosure(next);
      if (current.size === 0) return false;
    }

    for (const state of current) {
      if (this.acceptStates.has(state)) return true;
    }
    return false;
  }

  isDeterministic() {
    for (const state of this.states) {
      const symbolMap = this.transitions.get(state);
      if (!symbolMap) continue;
      if ((symbolMap.get(EPSILON)?.size ?? 0) > 0) return false;
      for (const symbol of this.alphabet) {
        if ((symbolMap.get(symbol)?.size ?? 0) > 1) return false;
      }
    }
    return true;
  }

  isCompleteDeterministic() {
    if (!this.isDeterministic()) return false;
    for (const state of this.states) {
      for (const symbol of this.alphabet) {
        if (this.getTransitions(state, symbol).size !== 1) return false;
      }
    }
    return true;
  }

  getType() {
    if (!this.isDeterministic()) return "NFA" as const;
    if (!this.isCompleteDeterministic()) return "NFA" as const;
    return "DFA" as const;
  }

  toRegex() {
    const ids = sortedNumbers(this.states);
    if (ids.length === 0 || !this.states.has(this.startState)) return "∅";

    const start = "__start__";
    const end = "__end__";
    const allStates = [start, ...ids.map(id => String(id)), end];
    const empty = "∅";
    const epsilon = EPSILON;

    const wrap = (value: string) => {
      if (value === empty || value === epsilon) return value;
      if (/^[a-zA-Z0-9ε]$/.test(value)) return value;
      if (/^\(.*\)$/.test(value)) return value;
      return `(${value})`;
    };

    const union = (a: string, b: string) => {
      if (a === empty) return b;
      if (b === empty) return a;
      if (a === b) return a;
      return `(${a}|${b})`;
    };

    const concat = (a: string, b: string) => {
      if (a === empty || b === empty) return empty;
      if (a === epsilon) return b;
      if (b === epsilon) return a;
      return `${wrap(a)}${wrap(b)}`;
    };

    const star = (value: string) => {
      if (value === empty || value === epsilon) return epsilon;
      return `${wrap(value)}*`;
    };

    const R: Record<string, Record<string, string>> = {};
    allStates.forEach(i => {
      R[i] = {};
      allStates.forEach(j => {
        R[i][j] = empty;
      });
    });

    R[start][String(this.startState)] = epsilon;
    this.acceptStates.forEach(state => {
      R[String(state)][end] = union(R[String(state)][end], epsilon);
    });

    this.transitions.forEach((symbolMap, from) => {
      symbolMap.forEach((targets, symbol) => {
        const label = symbol === EPSILON ? epsilon : symbol;
        targets.forEach(target => {
          const fromKey = String(from);
          const toKey = String(target);
          R[fromKey][toKey] = union(R[fromKey][toKey], label);
        });
      });
    });

    ids.forEach(kNum => {
      const k = String(kNum);
      allStates.forEach(i => {
        if (i === k) return;
        allStates.forEach(j => {
          if (j === k) return;
          const rik = R[i][k];
          const rkk = R[k][k];
          const rkj = R[k][j];
          if (rik === empty || rkj === empty) return;
          const candidate = concat(concat(rik, star(rkk)), rkj);
          R[i][j] = union(R[i][j], candidate);
        });
      });
    });

    return R[start][end] === empty ? "∅" : R[start][end];
  }

  toTable() {
    const hasEpsilon = this.hasEpsilonTransitions();
    const symbols = [...this.alphabet].sort();
    const headers = hasEpsilon ? [...symbols, EPSILON] : symbols;
    const stateIds = sortedNumbers(this.states);
    const idToLabel = new Map<number, string>();
    stateIds.forEach((id, index) => {
      idToLabel.set(id, `q${index}`);
    });

    const rows: string[][] = [];
    rows.push(["State", ...headers]);

    stateIds.forEach(id => {
      const base = idToLabel.get(id) ?? `q${id}`;
      const isAccept = this.acceptStates.has(id);
      const row = [isAccept ? `${base}*` : base];

      headers.forEach(symbol => {
        const targets = sortedNumbers(this.getTransitions(id, symbol));
        const value = targets.length
          ? targets.map(target => idToLabel.get(target) ?? `q${target}`).join(",")
          : "-";
        row.push(value);
      });

      rows.push(row);
    });

    return rows;
  }

  toCanvasPayload(origin: { x: number; y: number } = { x: 0, y: 0 }) {
    const ids = sortedNumbers(this.states);
    const idToIndex = new Map<number, number>();
    ids.forEach((id, index) => idToIndex.set(id, index));

    const radius = ids.length > 1 ? 140 : 0;
    const step = ids.length > 0 ? (Math.PI * 2) / ids.length : 0;

    const states: State[] = ids.map((id, index) => {
      const angle = step * index - Math.PI / 2;
      const color = this.acceptStates.has(id)
        ? "blue"
        : id === this.startState
        ? "red"
        : "green";
      return State.create({
        x: origin.x + Math.cos(angle) * radius,
        y: origin.y + Math.sin(angle) * radius,
        color,
        r: 20,
        id: Date.now() + Math.random() + index
      });
    });

    const arrowPairs: Transition[] = [];
    this.transitions.forEach((symbolMap, from) => {
      symbolMap.forEach((targets, symbol) => {
        targets.forEach(to => {
          const fromIndex = idToIndex.get(from);
          const toIndex = idToIndex.get(to);
          if (fromIndex === undefined || toIndex === undefined) return;
          arrowPairs.push(Transition.create(fromIndex, toIndex, symbol));
        });
      });
    });

    return {
      states,
      arrowPairs,
      alphabet: [...this.alphabet].sort()
    };
  }

  determinize() {
    const symbols = [...this.alphabet].sort();
    const startSet = this.epsilonClosure(new Set([this.startState]));
    const subsetKey = (subset: Set<number>) => sortedNumbers(subset).join(",");

    const keyToId = new Map<string, number>();
    const subsets: Set<number>[] = [];

    const startKey = subsetKey(startSet);
    keyToId.set(startKey, 0);
    subsets[0] = startSet;

    const dfa = new DFAAutomaton({
      states: [0],
      alphabet: symbols,
      startState: 0,
      acceptStates: [...startSet].some(state => this.acceptStates.has(state)) ? [0] : []
    });

    const queue: number[] = [0];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentSubset = subsets[currentId];

      symbols.forEach(symbol => {
        const moved = this.move(currentSubset, symbol);
        const closed = this.epsilonClosure(moved);
        if (closed.size === 0) return;

        const key = subsetKey(closed);
        let targetId = keyToId.get(key);

        if (targetId === undefined) {
          targetId = subsets.length;
          keyToId.set(key, targetId);
          subsets[targetId] = closed;
          dfa.states.add(targetId);
          if ([...closed].some(state => this.acceptStates.has(state))) {
            dfa.acceptStates.add(targetId);
          }
          queue.push(targetId);
        }

        dfa.addTransition(currentId, targetId, symbol);
      });
    }

    return dfa;
  }

  private generateStrings(maxLength: number) {
    const alphabet = [...this.alphabet];
    const results: string[] = [""];
    for (let length = 1; length <= maxLength; length += 1) {
      const prev = results.filter(str => str.length === length - 1);
      prev.forEach(str => {
        alphabet.forEach(symbol => results.push(str + symbol));
      });
    }
    return results;
  }

  testInput(value: string, maxRegexLength: number = 5) {
    const trimmed = value.trim();
    if (!trimmed) return { status: "", detail: "" };

    const alphabet = [...this.alphabet];
    const regexCharacters = /[.*+?^${}()|[\]\\]/;
    const regexInput = regexCharacters.test(trimmed) || (trimmed.startsWith("/") && trimmed.endsWith("/"));

    if (!regexInput) {
      if ([...trimmed].some(char => !alphabet.includes(char))) {
        return { status: "Invalid", detail: "Contains symbols outside the alphabet." };
      }
      const isValid = this.accepts(trimmed);
      return { status: isValid ? "Valid" : "Invalid", detail: "" };
    }

    const pattern = trimmed.startsWith("/") && trimmed.endsWith("/")
      ? trimmed.slice(1, -1)
      : trimmed;

    try {
      const regex = new RegExp(`^${pattern}$`);
      const candidates = this.generateStrings(maxRegexLength);
      const match = candidates.find(str => regex.test(str) && this.accepts(str));
      if (match !== undefined) {
        return { status: "Valid", detail: `Matched accepted string: "${match}"` };
      }
      return { status: "Invalid", detail: `No accepted match up to length ${maxRegexLength}.` };
    } catch {
      return { status: "Invalid", detail: "Regex syntax error." };
    }
  }
}

export class NFAAutomaton extends FiniteAutomaton {
  static from(source: FiniteAutomaton) {
    const next = new NFAAutomaton({
      states: source.states,
      alphabet: source.alphabet,
      startState: source.startState,
      acceptStates: source.acceptStates
    });
    source.forEachTransition((from, to, symbol) => next.addTransition(from, to, symbol));
    return next;
  }
}

export class DFAAutomaton extends FiniteAutomaton {
  static from(source: FiniteAutomaton) {
    const next = new DFAAutomaton({
      states: source.states,
      alphabet: source.alphabet,
      startState: source.startState,
      acceptStates: source.acceptStates
    });
    source.forEachTransition((from, to, symbol) => next.addTransition(from, to, symbol));
    return next;
  }
}
