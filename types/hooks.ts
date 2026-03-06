import type React from "react";
import type { State } from "../lib/util-classes/state";
import type { Transition } from "../lib/util-classes/transition";
import type { SavedDFAs } from "./domain";
import type {
  DraggedSavedFAState,
  ImportPreviewState,
  OverwriteDialogState,
  RegexDialogState,
  TextArtifact,
  TmTransitionDialogState,
  TransitionCountDialogState
} from "./page";

export type SelectionBounds = { x1: number; y1: number; x2: number; y2: number };
export type CanvasPoint = { x: number; y: number };

export type CanvasKeyboardSelectionApi = {
  isDrawingSelection: boolean;
  clearSelection: () => void;
  selectionMode: boolean;
  setSelectionMode: (value: boolean) => void;
};

export type CanvasKeyboardAutomatonManagerApi = {
  states: State[];
  setStates: React.Dispatch<React.SetStateAction<State[]>>;
  arrowSelection: number[];
  setArrowSelection: React.Dispatch<React.SetStateAction<number[]>>;
  setArrowPairs: React.Dispatch<React.SetStateAction<Transition[]>>;
  savedDFAs: SavedDFAs;
  deleteDFAs: (names: string[]) => void;
  clearAlphabet: () => void;
};

export type UseCanvasKeyboardShortcutsParams = {
  dfaManager: CanvasKeyboardAutomatonManagerApi;
  selection: CanvasKeyboardSelectionApi;
  selectedDFAName: string | null;
  setSelectedDFAName: React.Dispatch<React.SetStateAction<string | null>>;
  editingDFAName: string | null;
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingDFAName: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingParentMode: React.Dispatch<React.SetStateAction<"FA" | "TM" | null>>;
  importPreview: ImportPreviewState;
  setImportPreview: React.Dispatch<React.SetStateAction<ImportPreviewState>>;
  setImportCursor: React.Dispatch<React.SetStateAction<CanvasPoint | null>>;
  road: boolean;
  roadSelection: number | null;
  setRoad: React.Dispatch<React.SetStateAction<boolean>>;
  setRoadSelection: React.Dispatch<React.SetStateAction<number | null>>;
  setTransitionSlots: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  buildTransitionSlotsFromPairs: (pairs: Transition[]) => Record<string, number>;
};

export type CanvasPointerInteractionApi = {
  offset: CanvasPoint;
  scale: number;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setDraggedCircle: React.Dispatch<React.SetStateAction<number | null>>;
  setDragOffset: React.Dispatch<React.SetStateAction<CanvasPoint | null>>;
  draggedCircle: number | null;
  dragOffset: CanvasPoint | null;
  isDragging: boolean;
  setLastPos: React.Dispatch<React.SetStateAction<CanvasPoint>>;
  lastPos: CanvasPoint;
  setOffset: React.Dispatch<React.SetStateAction<CanvasPoint>>;
};

export type CanvasPointerSelectionApi = {
  selectionMode: boolean;
  isDrawingSelection: boolean;
  selectionStart: CanvasPoint | null;
  startSelection: (x: number, y: number) => void;
  finishSelection: () => void;
  updateSelection: (x: number, y: number) => void;
};

export type CanvasPointerAutomatonManagerApi = {
  states: State[];
  setStates: React.Dispatch<React.SetStateAction<State[]>>;
  arrowPairs: Transition[];
  setArrowSelection: React.Dispatch<React.SetStateAction<number[]>>;
  savedDFAs: SavedDFAs;
  setSavedDFAs: React.Dispatch<React.SetStateAction<SavedDFAs>>;
};

export type UseCanvasPointerHandlersParams = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  canvasInteraction: CanvasPointerInteractionApi;
  selection: CanvasPointerSelectionApi;
  dfaManager: CanvasPointerAutomatonManagerApi;
  editMode: boolean;
  setSelectedDFAName: React.Dispatch<React.SetStateAction<string | null>>;
  draggedSavedFA: DraggedSavedFAState;
  setDraggedSavedFA: React.Dispatch<React.SetStateAction<DraggedSavedFAState>>;
  importPreview: ImportPreviewState;
  setImportCursor: React.Dispatch<React.SetStateAction<CanvasPoint | null>>;
  setLastCanvasPos: React.Dispatch<React.SetStateAction<CanvasPoint | null>>;
};

export type CanvasClickSelectionApi = {
  selectionMode: boolean;
  isDrawingSelection: boolean;
};

export type CanvasClickInteractionApi = {
  offset: CanvasPoint;
  scale: number;
};

export type CanvasClickAutomatonManagerApi = {
  states: State[];
  arrowPairs: Transition[];
  savedDFAs: SavedDFAs;
  alphabet: string[];
  setStates: React.Dispatch<React.SetStateAction<State[]>>;
  setArrowPairs: React.Dispatch<React.SetStateAction<Transition[]>>;
  setArrowSelection: React.Dispatch<React.SetStateAction<number[]>>;
  setAlphabet: React.Dispatch<React.SetStateAction<string[]>>;
};

export type UseCanvasClickHandlerParams = {
  selection: CanvasClickSelectionApi;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  canvasInteraction: CanvasClickInteractionApi;
  importPreview: ImportPreviewState;
  setImportPreview: React.Dispatch<React.SetStateAction<ImportPreviewState>>;
  importCursor: CanvasPoint | null;
  setImportCursor: React.Dispatch<React.SetStateAction<CanvasPoint | null>>;
  dfaManager: CanvasClickAutomatonManagerApi;
  saveGeneratedAutomaton: (
    name: string,
    payload: { states: State[]; arrowPairs: Transition[]; alphabet: string[] },
    table: string[][]
  ) => string;
  setTransitionSlots: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  buildTransitionSlotsFromPairs: (pairs: Transition[]) => Record<string, number>;
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingDFAName: React.Dispatch<React.SetStateAction<string | null>>;
  editMode: boolean;
  selectedDFAName: string | null;
  setSelectedDFAName: React.Dispatch<React.SetStateAction<string | null>>;
  road: boolean;
  setRoad: React.Dispatch<React.SetStateAction<boolean>>;
  roadSelection: number | null;
  setRoadSelection: React.Dispatch<React.SetStateAction<number | null>>;
  transitionSlots: Record<string, number>;
  setTransitionCountDialog: React.Dispatch<React.SetStateAction<TransitionCountDialogState>>;
  tmTransitionMode: boolean;
  setTmTransitionDialog: React.Dispatch<React.SetStateAction<TmTransitionDialogState>>;
  startingState: boolean;
  setStartgingState: React.Dispatch<React.SetStateAction<boolean>>;
  state: boolean;
  setState: React.Dispatch<React.SetStateAction<boolean>>;
  acceptState: boolean;
  setAcceptState: React.Dispatch<React.SetStateAction<boolean>>;
  tmStateMode: boolean;
  setTmStateMode: React.Dispatch<React.SetStateAction<boolean>>;
  tmAcceptMode: boolean;
  setTmAcceptMode: React.Dispatch<React.SetStateAction<boolean>>;
  tmRejectMode: boolean;
  setTmRejectMode: React.Dispatch<React.SetStateAction<boolean>>;
  showToast: (message: string, type?: "error" | "success" | "info") => void;
};

export type FinalizeSelectionApi = {
  selectionMode: boolean;
  selectionRect: SelectionBounds | null;
  clearSelection: () => void;
  setSelectionMode: (value: boolean) => void;
};

export type UseFinalizeSelectionFlowParams = {
  finalize: boolean;
  setFinalize: React.Dispatch<React.SetStateAction<boolean>>;
  tmFinalize: boolean;
  setTmFinalize: React.Dispatch<React.SetStateAction<boolean>>;
  selection: FinalizeSelectionApi;
  states: State[];
  setNameDialogMode: React.Dispatch<React.SetStateAction<"FA" | "TM">>;
  setShowNameDialog: React.Dispatch<React.SetStateAction<boolean>>;
  showToast: (message: string, type?: "error" | "success" | "info") => void;
};

export type AutomatonWorkbenchManagerApi = {
  savedDFAs: SavedDFAs;
  dfaAlphabets: { [name: string]: string[] };
  setSavedDFAs: React.Dispatch<React.SetStateAction<SavedDFAs>>;
  setDfaAlphabets: React.Dispatch<React.SetStateAction<{ [name: string]: string[] }>>;
};

export type UseAutomatonWorkbenchActionsParams = {
  dfaManager: AutomatonWorkbenchManagerApi;
  selectedDFAName: string | null;
  setSelectedDFAName: React.Dispatch<React.SetStateAction<string | null>>;
  setImportPreview: React.Dispatch<React.SetStateAction<ImportPreviewState>>;
  setImportCursor: React.Dispatch<React.SetStateAction<CanvasPoint | null>>;
  lastCanvasPos: CanvasPoint | null;
  setTextArtifacts: React.Dispatch<React.SetStateAction<TextArtifact[]>>;
  regexDialog: RegexDialogState;
  setRegexDialog: React.Dispatch<React.SetStateAction<RegexDialogState>>;
  showToast: (message: string, type?: "error" | "success" | "info") => void;
};

export type AutomatonEditSelectionApi = {
  selectionRect: SelectionBounds | null;
  clearSelection: () => void;
  setSelectionMode: (value: boolean) => void;
};

export type AutomatonEditManagerApi = {
  dfaAlphabets: { [name: string]: string[] };
  savedDFAs: SavedDFAs;
  states: State[];
  arrowPairs: Transition[];
  alphabet: string[];
  restoreAlphabet: (dfaName: string) => void;
  clearAlphabet: () => void;
  setAlphabet: React.Dispatch<React.SetStateAction<string[]>>;
  setStates: React.Dispatch<React.SetStateAction<State[]>>;
  setArrowPairs: React.Dispatch<React.SetStateAction<Transition[]>>;
  setArrowSelection: React.Dispatch<React.SetStateAction<number[]>>;
  updateDfaAlphabet: (dfaName: string, nextAlphabet: string[]) => void;
  saveDFA: (
    dfaName: string,
    selectionRect: SelectionBounds,
    options?: { forceOverwrite?: boolean; onError?: (message: string) => void }
  ) => boolean;
};

export type UseAutomatonEditFlowParams = {
  dfaManager: AutomatonEditManagerApi;
  selection: AutomatonEditSelectionApi;
  dfaName: string;
  setDfaName: React.Dispatch<React.SetStateAction<string>>;
  nameDialogMode: "FA" | "TM";
  setNameDialogMode: React.Dispatch<React.SetStateAction<"FA" | "TM">>;
  setShowNameDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setFinalize: React.Dispatch<React.SetStateAction<boolean>>;
  setTmFinalize: React.Dispatch<React.SetStateAction<boolean>>;
  overwriteDialog: OverwriteDialogState;
  setOverwriteDialog: React.Dispatch<React.SetStateAction<OverwriteDialogState>>;
  setTransitionSlots: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  buildTransitionSlotsFromPairs: (pairs: Transition[]) => Record<string, number>;
  editMode: boolean;
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  editingDFAName: string | null;
  setEditingDFAName: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingParentMode: React.Dispatch<React.SetStateAction<"FA" | "TM" | null>>;
  forceRefresh: () => void;
  showToast: (message: string, type?: "error" | "success" | "info") => void;
};

export type TransitionFlowManagerApi = {
  arrowPairs: Transition[];
  alphabet: string[];
  setArrowPairs: React.Dispatch<React.SetStateAction<Transition[]>>;
};

export type UseTransitionFlowParams = {
  dfaManager: TransitionFlowManagerApi;
  transitionSlots: Record<string, number>;
  setTransitionSlots: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  transitionCountDialog: TransitionCountDialogState;
  setTransitionCountDialog: React.Dispatch<React.SetStateAction<TransitionCountDialogState>>;
  tmTransitionDialog: TmTransitionDialogState;
  setTmTransitionDialog: React.Dispatch<React.SetStateAction<TmTransitionDialogState>>;
  setRoad: React.Dispatch<React.SetStateAction<boolean>>;
  showToast: (message: string, type?: "error" | "success" | "info") => void;
};

export type UseViewportRefreshParams = {
  forceRefresh: () => void;
  setViewportTick: React.Dispatch<React.SetStateAction<number>>;
};
