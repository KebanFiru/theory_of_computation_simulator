import type React from "react";
import type { State, Transition } from "../lib/util-classes";
import type { Offset, SavedDFAs, SelectionRect } from "./domain";

export type SelectionMenuType = {
  startingState: boolean;
  setStartgingState: (state: boolean) => void;
  state: boolean;
  setState: (state: boolean) => void;
  road: boolean;
  setRoad: (road: boolean) => void;
  finalize: boolean;
  setFinalize: (finalize: boolean) => void;
  tmFinalize: boolean;
  setTmFinalize: (tmFinalize: boolean) => void;
  acceptState: boolean;
  setAcceptState: (acceptState: boolean) => void;
  tmStateMode: boolean;
  setTmStateMode: (value: boolean) => void;
  tmAcceptMode: boolean;
  setTmAcceptMode: (value: boolean) => void;
  tmRejectMode: boolean;
  setTmRejectMode: (value: boolean) => void;
  tmTransitionMode: boolean;
  setTmTransitionMode: (value: boolean) => void;
  alphabet: string[];
  setAlphabet: (alphabet: string[]) => void;
};

export interface AutomatonCanvasProps {
  states: State[];
  arrowPairs: Transition[];
  arrowSelection: number[];
  showLiveTransitionLabels?: boolean;
  selectionRect: SelectionRect;
  savedDFAs: SavedDFAs;
  selectedDFAName?: string | null;
  editMode?: boolean;
  editingDFAName?: string | null;
  previewStates?: State[] | null;
  previewArrowPairs?: Transition[] | null;
  previewPosition?: { x: number; y: number } | null;
  offset: Offset;
  scale: number;
  isDragging: boolean;
  startingState: boolean;
  state: boolean;
  tmStateMode: boolean;
  tmAcceptMode: boolean;
  tmRejectMode: boolean;
  tmTransitionMode: boolean;
  selectionMode: boolean;
  renderTick: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onWheel: (e: React.WheelEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
}

export interface ArrowInputFieldsProps {
  arrowPairs: Transition[];
  states: State[];
  alphabet: string[];
  transitionSlots: Record<string, number>;
  scale: number;
  offset: Offset;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  showNameDialog: boolean;
  visible?: boolean;
  onArrowLabelChange: (index: number, label: string) => void;
}

export interface AutomatonNameDialogProps {
  isOpen: boolean;
  dfaName: string;
  title?: string;
  placeholder?: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export interface AutomatonTableDisplayProps {
  savedDFAs: SavedDFAs;
  scale: number;
  offset: Offset;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  selectedDFAName: string | null;
  onSelect: (name: string | null) => void;
}

export interface SelectionModeIndicatorProps {
  isActive: boolean;
}
