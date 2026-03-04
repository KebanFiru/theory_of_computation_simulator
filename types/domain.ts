import type { State, Transition } from "../lib/util-classes";

export type Arrow = {
  from: State;
  to: State;
  label: string;
};

export type Offset = {
  x: number;
  y: number;
};

export type SelectionRect = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
} | null;

export type Bounds = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type SavedDFA = {
  table: string[][];
  bounds: Bounds;
  snapshot?: {
    states: State[];
    arrowPairs: Transition[];
  };
};

export type SavedDFAs = {
  [name: string]: SavedDFA;
};
