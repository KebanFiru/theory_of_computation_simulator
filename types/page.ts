import type React from "react";
import type { State } from "../lib/util-classes/state";
import type { Transition } from "../lib/util-classes/transition";

export type ToastState = { message: string; type: "error" | "success" | "info" } | null;

export type RegexDialogState = {
  isOpen: boolean;
  regex: string;
  name: string;
};

export type TransitionCountDialogState = {
  isOpen: boolean;
  from: number;
  to: number;
  max: number;
  value: string;
};

export type TmTransitionDialogState = {
  isOpen: boolean;
  from: number;
  to: number;
  value: string;
};

export type OverwriteDialogState = {
  isOpen: boolean;
  name: string;
  mode: "FA" | "TM";
  selectionRect: { x1: number; y1: number; x2: number; y2: number } | null;
};

export type FaTransitionDialogState = {
  isOpen: boolean;
  from: number;
  to: number;
  symbol: string;
};

export type TextArtifact = {
  id: string;
  name: string;
  type: "CFG";
  content: string;
  position: { x: number; y: number };
  relatedDFAName?: string;
};

export type ImportPreviewState = {
  name: string;
  alphabet: string[];
  states: State[];
  arrowPairs: Transition[];
  target?: "canvas" | "saved";
  table?: string[][];
  saveName?: string;
  editAfterPlace?: boolean;
} | null;

export type DraggedSavedFAState = {
  name: string;
  anchor: { x: number; y: number };
  bounds: { x1: number; y1: number; x2: number; y2: number };
  snapshotStates: State[];
  liveStateSnapshot: Array<{ index: number; x: number; y: number }>;
  artifactSnapshot: Array<{ id: string; x: number; y: number }>;
} | null;

export type EditModeBannerProps = {
  editMode: boolean;
  editingDFAName: string | null;
  onDone: () => void;
};

export type CanvasDialogsProps = {
  regexDialog: RegexDialogState;
  transitionCountDialog: TransitionCountDialogState;
  tmTransitionDialog: TmTransitionDialogState;
  faTransitionDialog: FaTransitionDialogState;
  overwriteDialog: OverwriteDialogState;
  setRegexDialog: React.Dispatch<React.SetStateAction<RegexDialogState>>;
  setTransitionCountDialog: React.Dispatch<React.SetStateAction<TransitionCountDialogState>>;
  setTmTransitionDialog: React.Dispatch<React.SetStateAction<TmTransitionDialogState>>;
  setFaTransitionDialog: React.Dispatch<React.SetStateAction<FaTransitionDialogState>>;
  setOverwriteDialog: React.Dispatch<React.SetStateAction<OverwriteDialogState>>;
  onCreateRegexAutomaton: () => void;
  onCloseRegexDialog: () => void;
  onTransitionCountConfirm: () => void;
  onTmTransitionConfirm: () => void;
  onFaTransitionConfirm: () => void;
  onOverwriteConfirm: () => void;
  faTransitionAlphabet: string[];
};

export type FloatingArtifactsProps = {
  textArtifacts: TextArtifact[];
  scale: number;
  offset: { x: number; y: number };
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  setTextArtifacts: React.Dispatch<React.SetStateAction<TextArtifact[]>>;
};

export type ToastAlertProps = {
  toast: ToastState;
};
