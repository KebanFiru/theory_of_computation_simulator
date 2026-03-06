import type { State } from "../lib/util-classes/state";

export type TransitionLike = {
  from: number;
  to: number;
  label?: string;
};

export type TransitionLabelErrorCode =
  | "invalid-index"
  | "tm-format"
  | "tm-duplicate-read"
  | "fa-duplicate-symbol";

export type TransitionLabelResolution =
  | { kind: "set"; value: string }
  | { kind: "error"; code: TransitionLabelErrorCode; from?: number; read?: string };

export type ResolveTransitionLabelArgs = {
  arrowPairs: TransitionLike[];
  states: State[];
  index: number;
  label: string;
};