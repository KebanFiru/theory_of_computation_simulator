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
  const nfa = new NFAAutomaton({
    states: Array.from({ length: stateCounter }, (_, index) => index),
    alphabet: [],
    startState: result.start,
    acceptStates: [result.end]
  });

  transitions.forEach(({ from, to, symbol }) => {
    nfa.addTransition(from, to, symbol);
  });

  return nfa;
};
