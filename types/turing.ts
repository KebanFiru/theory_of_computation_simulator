import type { TransitionLike } from "./transition";

export type MoveDirection = "L" | "R" | "N";

export type TmTransition = {
  from: string;   
  to: string;     
  reads: string[];
  writes: string[];
  moves: MoveDirection[];
};

export type ParsedTmLabel = {
  reads: string[];
  writes: string[];
  moves: MoveDirection[];
  tapeCount: number;
};

export type TmSnapshotSource = {
  states: Array<{ color: string }>;
  arrowPairs: TransitionLike[];
  fallbackInputAlphabet?: string[];
};

export type TmExecutionResult = {
  status: "" | "Valid" | "Invalid";
  detail: string;
};
