import type { RegexFragment, RegexToken } from "../../types/automata";
import { EPSILON } from "./constants";
import { NFAAutomaton } from "./finite-automaton";

const isOperator = (token: string) => ["|", ".", "*", "+", "?", "(", ")"].includes(token);
const isUnary = (token: string) => token === "*" || token === "+" || token === "?";
const isValueToken = (token: string) => !isOperator(token) || token === EPSILON;

const tokenizeRegex = (regex: string) => {
  const tokens: RegexToken[] = [];

  for (let i = 0; i < regex.length; i += 1) {
    const char = regex[i];
    if (char === "\\") {
      const next = regex[i + 1];
      if (!next) throw new Error("Invalid escape sequence in regex.");
      tokens.push(next);
      i += 1;
      continue;
    }
    tokens.push(char);
  }

  const withConcat: RegexToken[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const current = tokens[i];
    const next = tokens[i + 1];
    withConcat.push(current);

    if (!next) continue;
    const shouldConcat =
      (isValueToken(current) || current === ")" || isUnary(current)) &&
      (isValueToken(next) || next === "(");

    if (shouldConcat) {
      withConcat.push(".");
    }
  }

  return withConcat;
};

const toPostfix = (tokens: RegexToken[]) => {
  const output: RegexToken[] = [];
  const ops: RegexToken[] = [];
  const precedence: Record<string, number> = { "|": 1, ".": 2, "*": 3, "+": 3, "?": 3 };

  tokens.forEach(token => {
    if (token === "(") {
      ops.push(token);
      return;
    }

    if (token === ")") {
      while (ops.length > 0 && ops[ops.length - 1] !== "(") {
        output.push(ops.pop()!);
      }
      if (ops.length === 0) throw new Error("Mismatched parentheses in regex.");
      ops.pop();
      return;
    }

    if (!isOperator(token) || token === EPSILON) {
      output.push(token);
      return;
    }

    while (
      ops.length > 0 &&
      ops[ops.length - 1] !== "(" &&
      (precedence[ops[ops.length - 1]] ?? 0) >= (precedence[token] ?? 0)
    ) {
      output.push(ops.pop()!);
    }
    ops.push(token);
  });

  while (ops.length > 0) {
    const token = ops.pop()!;
    if (token === "(" || token === ")") throw new Error("Mismatched parentheses in regex.");
    output.push(token);
  }

  return output;
};

const epsilonClosure = (nfa: NFAAutomaton, state: number): Set<number> => {
  const closure = new Set<number>();
  const stack = [state];
  while (stack.length > 0) {
    const curr = stack.pop()!;
    if (closure.has(curr)) continue;
    closure.add(curr);
    nfa.getTransitions(curr, EPSILON).forEach(target => stack.push(target));
  }
  return closure;
};

const eliminateEpsilons = (nfa: NFAAutomaton): NFAAutomaton => {
  const stateList = [...nfa.states];

  const epsClose = new Map<number, Set<number>>();
  for (const s of stateList) {
    epsClose.set(s, epsilonClosure(nfa, s));
  }

  const alphabet = [...nfa.alphabet]; 
  const newEdges: Array<{ from: number; to: number; symbol: string }> = [];
  for (const s of stateList) {
    for (const sym of alphabet) {
      const reachable = new Set<number>();
      for (const q of epsClose.get(s)!) {
        nfa.getTransitions(q, sym).forEach(r => {
          for (const rc of epsClose.get(r)!) reachable.add(rc);
        });
      }
      for (const r of reachable) {
        newEdges.push({ from: s, to: r, symbol: sym });
      }
    }
  }

  const origAccept = nfa.acceptStates;
  const newAccept = stateList.filter(s => {
    for (const q of epsClose.get(s)!) if (origAccept.has(q)) return true;
    return false;
  });

  const startClosure = epsClose.get(nfa.startState)!;
  const reachable = new Set<number>(startClosure);
  const queue = [...startClosure];
  while (queue.length > 0) {
    const s = queue.shift()!;
    for (const edge of newEdges) {
      if (edge.from === s && !reachable.has(edge.to)) {
        reachable.add(edge.to);
        queue.push(edge.to);
      }
    }
  }

  const sorted = [...reachable].sort((a, b) => {
    if ([...startClosure].includes(a) && a === nfa.startState) return -1;
    if ([...startClosure].includes(b) && b === nfa.startState) return 1;
    return a - b;
  });
  const canonicalStart = Math.min(...startClosure);
  const sortedStates = [canonicalStart, ...sorted.filter(s => s !== canonicalStart)];
  const renumber = new Map<number, number>();
  sortedStates.forEach((s, i) => renumber.set(s, i));

  const cleanNfa = new NFAAutomaton({
    states: sortedStates.map((_, i) => i),
    alphabet,
    startState: 0,
    acceptStates: newAccept
      .filter(s => reachable.has(s))
      .map(s => renumber.get(s)!)
      .filter((v): v is number => v !== undefined)
      .filter((v, i, arr) => arr.indexOf(v) === i)
  });

  for (const e of newEdges) {
    if (reachable.has(e.from) && reachable.has(e.to)) {
      cleanNfa.addTransition(renumber.get(e.from)!, renumber.get(e.to)!, e.symbol);
    }
  }

  return cleanNfa;
};

export const buildNFAFromRegex = (rawRegex: string) => {
  const regex = rawRegex.trim();
  if (!regex) {
    const epsilonNfa = new NFAAutomaton({
      states: [0],
      alphabet: [],
      startState: 0,
      acceptStates: [0]
    });
    return epsilonNfa;
  }

  const tokens = tokenizeRegex(regex);
  const postfix = toPostfix(tokens);

  let stateCounter = 0;
  const nextState = () => {
    const id = stateCounter;
    stateCounter += 1;
    return id;
  };

  const transitions: Array<{ from: number; to: number; symbol: string }> = [];
  const stack: RegexFragment[] = [];

  const connect = (from: number, to: number, symbol: string) => {
    transitions.push({ from, to, symbol });
  };

  postfix.forEach(token => {
    if (!isOperator(token) || token === EPSILON) {
      const start = nextState();
      const end = nextState();
      connect(start, end, token === EPSILON ? EPSILON : token);
      stack.push({ start, end });
      return;
    }

    if (token === ".") {
      const right = stack.pop();
      const left = stack.pop();
      if (!left || !right) throw new Error("Invalid regex concatenation.");
      connect(left.end, right.start, EPSILON);
      stack.push({ start: left.start, end: right.end });
      return;
    }

    if (token === "|") {
      const right = stack.pop();
      const left = stack.pop();
      if (!left || !right) throw new Error("Invalid regex union.");
      const start = nextState();
      const end = nextState();
      connect(start, left.start, EPSILON);
      connect(start, right.start, EPSILON);
      connect(left.end, end, EPSILON);
      connect(right.end, end, EPSILON);
      stack.push({ start, end });
      return;
    }

    if (token === "*") {
      const fragment = stack.pop();
      if (!fragment) throw new Error("Invalid regex star operation.");
      const start = nextState();
      const end = nextState();
      connect(start, fragment.start, EPSILON);
      connect(start, end, EPSILON);
      connect(fragment.end, fragment.start, EPSILON);
      connect(fragment.end, end, EPSILON);
      stack.push({ start, end });
      return;
    }

    if (token === "+") {
      const fragment = stack.pop();
      if (!fragment) throw new Error("Invalid regex plus operation.");
      const start = nextState();
      const end = nextState();
      connect(start, fragment.start, EPSILON);
      connect(fragment.end, fragment.start, EPSILON);
      connect(fragment.end, end, EPSILON);
      stack.push({ start, end });
      return;
    }

    if (token === "?") {
      const fragment = stack.pop();
      if (!fragment) throw new Error("Invalid regex optional operation.");
      const start = nextState();
      const end = nextState();
      connect(start, fragment.start, EPSILON);
      connect(start, end, EPSILON);
      connect(fragment.end, end, EPSILON);
      stack.push({ start, end });
    }
  });

  if (stack.length !== 1) {
    throw new Error("Invalid regex expression.");
  }

  const result = stack[0];
  const thompsonNfa = new NFAAutomaton({
    states: Array.from({ length: stateCounter }, (_, index) => index),
    alphabet: [],
    startState: result.start,
    acceptStates: [result.end]
  });

  transitions.forEach(({ from, to, symbol }) => {
    thompsonNfa.addTransition(from, to, symbol);
  });

  const nfa = eliminateEpsilons(thompsonNfa);

  return nfa;
};
