"use client";
import React, { useRef, useState, useReducer, useCallback } from "react";
import SelectionMenu from "../components/SelectionMenuComponent";
import AutomatonCanvas from "../components/AutomatonCanvas";
import ArrowInputFields from "../components/ArrowInputFields";
import AutomatonNameDialog from "../components/AutomatonNameDialog";
import AutomatonTableDisplay from "../components/AutomatonTableDisplay";
import SelectionModeIndicator from "../components/SelectionModeIndicator";
import HamburgerMenu from "../components/HamburgerMenu";
import EditModeBanner from "../components/EditModeBanner";
import CanvasDialogs from "../components/CanvasDialogs";
import FloatingArtifacts from "../components/FloatingArtifacts";
import ToastAlert from "../components/ToastAlert";
import { useAutomatonManager } from "../hooks/useAutomatonManager";
import { useCanvasInteraction } from "../hooks/useCanvasInteraction";
import { useSelectionMode } from "../hooks/useSelectionMode";
import { useCanvasKeyboardShortcuts } from "../hooks/useCanvasKeyboardShortcuts";
import { useCanvasPointerHandlers } from "../hooks/useCanvasPointerHandlers";
import { useFinalizeSelectionFlow } from "../hooks/useFinalizeSelectionFlow";
import { useCanvasClickHandler } from "../hooks/useCanvasClickHandler";
import { useAutomatonWorkbenchActions } from "../hooks/useAutomatonWorkbenchActions";
import { useAutomatonEditFlow } from "../hooks/useAutomatonEditFlow";
import { useToast } from "../hooks/useToast";
import { useViewportRefresh } from "../hooks/useViewportRefresh";
import { useTransitionFlow } from "../hooks/useTransitionFlow";
import { Transition } from "../lib/util-classes/transition";
import type {
  OverwriteDialogState,
  DraggedSavedFAState,
  ImportPreviewState,
  RegexDialogState,
  TextArtifact,
  TmTransitionDialogState,
  TransitionCountDialogState
} from "../types/page";

export default function Canvas() {
  // Force update for AutomatonTableDisplay
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const [editMode, setEditMode] = useState(false);
  const [editingDFAName, setEditingDFAName] = useState<string | null>(null);
  const [editingParentMode, setEditingParentMode] = useState<"FA" | "TM" | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Mode states
  const [startingState, setStartgingState] = useState(false);
  const [state, setState] = useState(false);
  const [acceptState, setAcceptState] = useState(false);
  const [tmStateMode, setTmStateMode] = useState(false);
  const [tmAcceptMode, setTmAcceptMode] = useState(false);
  const [tmTransitionMode, setTmTransitionMode] = useState(false);
  const [road, setRoad] = useState(false);
  const [finalize, setFinalize] = useState(false);
  const [tmFinalize, setTmFinalize] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [nameDialogMode, setNameDialogMode] = useState<"FA" | "TM">("FA");
  const [dfaName, setDfaName] = useState("");
  const [transitionSlots, setTransitionSlots] = useState<Record<string, number>>({});
  const [viewportTick, setViewportTick] = useState(0);
  const [roadSelection, setRoadSelection] = useState<number | null>(null);
  const [selectedDFAName, setSelectedDFAName] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewState>(null);
  const [importCursor, setImportCursor] = useState<{ x: number; y: number } | null>(null);
  const [lastCanvasPos, setLastCanvasPos] = useState<{ x: number; y: number } | null>(null);
  const [textArtifacts, setTextArtifacts] = useState<TextArtifact[]>([]);
  const [draggedSavedFA, setDraggedSavedFA] = useState<DraggedSavedFAState>(null);
  const [overwriteDialog, setOverwriteDialog] = useState<OverwriteDialogState>({ isOpen: false, name: "", mode: "FA", selectionRect: null });
  const [regexDialog, setRegexDialog] = useState<RegexDialogState>({
    isOpen: false,
    regex: "(a|b)*abb",
    name: "Regex-NFA"
  });
  const [transitionCountDialog, setTransitionCountDialog] = useState<TransitionCountDialogState>({ isOpen: false, from: -1, to: -1, max: 0, value: "1" });
  const [tmTransitionDialog, setTmTransitionDialog] = useState<TmTransitionDialogState>({ isOpen: false, from: -1, to: -1, value: "0/1,R" });

  // Custom hooks
  const dfaManager = useAutomatonManager();
  const canvasInteraction = useCanvasInteraction();
  const selection = useSelectionMode();
  const { toast, showToast } = useToast();

  useFinalizeSelectionFlow({
    finalize,
    setFinalize,
    tmFinalize,
    setTmFinalize,
    selection,
    states: dfaManager.states,
    setNameDialogMode,
    setShowNameDialog,
    showToast
  });

  const buildTransitionSlotsFromPairs = useCallback((pairs: Transition[]) => {
    const next: Record<string, number> = {};
    pairs.forEach(pair => {
      const key = `${pair.from}-${pair.to}`;
      next[key] = (next[key] ?? 0) + 1;
    });
    return next;
  }, []);
  const {
    saveGeneratedAutomaton,
    handleExportSelected,
    handleRegexToFA,
    handleCloseRegexDialog,
    handleCreateRegexAutomaton,
    handleConvertSelectedNfaToDfa,
    handleCreateGnfa,
    handleCreateCfg,
    handleImportJson
  } = useAutomatonWorkbenchActions({
    dfaManager,
    selectedDFAName,
    setSelectedDFAName,
    setImportPreview,
    setImportCursor,
    lastCanvasPos,
    setTextArtifacts,
    regexDialog,
    setRegexDialog,
    showToast
  });

  useViewportRefresh({ forceRefresh: forceUpdate, setViewportTick });

  const {
    handleSaveDFA,
    handleCancelDialog,
    handleOverwriteConfirm,
    handleDoneEditing
  } = useAutomatonEditFlow({
    dfaManager,
    selection,
    dfaName,
    setDfaName,
    nameDialogMode,
    setNameDialogMode,
    setShowNameDialog,
    setFinalize,
    setTmFinalize,
    overwriteDialog,
    setOverwriteDialog,
    setTransitionSlots,
    buildTransitionSlotsFromPairs,
    editMode,
    setEditMode,
    editingDFAName,
    setEditingDFAName,
    setEditingParentMode,
    forceRefresh: forceUpdate,
    showToast
  });

  useCanvasKeyboardShortcuts({
    dfaManager,
    selection,
    selectedDFAName,
    setSelectedDFAName,
    editingDFAName,
    setEditMode,
    setEditingDFAName,
    setEditingParentMode,
    importPreview,
    setImportPreview,
    setImportCursor,
    road,
    roadSelection,
    setRoad,
    setRoadSelection,
    setTransitionSlots,
    buildTransitionSlotsFromPairs
  });

  const pointerHandlers = useCanvasPointerHandlers({
    canvasRef,
    canvasInteraction,
    selection,
    dfaManager,
    editMode,
    setSelectedDFAName,
    draggedSavedFA,
    setDraggedSavedFA,
    importPreview,
    setImportCursor,
    setLastCanvasPos
  });

  const {
    handleTransitionCountConfirm,
    handleTmTransitionConfirm
  } = useTransitionFlow({
    dfaManager,
    transitionSlots,
    setTransitionSlots,
    transitionCountDialog,
    setTransitionCountDialog,
    tmTransitionDialog,
    setTmTransitionDialog,
    setRoad,
    showToast
  });

  const handleCanvasClick = useCanvasClickHandler({
    selection,
    canvasRef,
    canvasInteraction,
    importPreview,
    setImportPreview,
    importCursor,
    setImportCursor,
    dfaManager,
    saveGeneratedAutomaton,
    setTransitionSlots,
    buildTransitionSlotsFromPairs,
    setEditMode,
    setEditingDFAName,
    editMode,
    selectedDFAName,
    setSelectedDFAName,
    road,
    setRoad,
    roadSelection,
    setRoadSelection,
    transitionSlots,
    setTransitionCountDialog,
    tmTransitionMode,
    setTmTransitionDialog,
    startingState,
    setStartgingState,
    state,
    setState,
    acceptState,
    setAcceptState,
    tmStateMode,
    setTmStateMode,
    tmAcceptMode,
    setTmAcceptMode,
    showToast
  });

  return (
    <>
      <EditModeBanner editMode={editMode} editingDFAName={editingDFAName} onDone={handleDoneEditing} />
      <SelectionMenu
        startingState={startingState}
        setStartgingState={setStartgingState}
        state={state}
        setState={setState}
        acceptState={acceptState}
        setAcceptState={setAcceptState}
        tmStateMode={tmStateMode}
        setTmStateMode={setTmStateMode}
        tmAcceptMode={tmAcceptMode}
        setTmAcceptMode={setTmAcceptMode}
        tmTransitionMode={tmTransitionMode}
        setTmTransitionMode={setTmTransitionMode}
        road={road}
        setRoad={setRoad}
        alphabet={dfaManager.alphabet}
        setAlphabet={dfaManager.setAlphabet}
        finalize={finalize}
        setFinalize={setFinalize}
        tmFinalize={tmFinalize}
        setTmFinalize={setTmFinalize}
        activeParentOverride={editingParentMode}
        alphabetOwnerLabel={editMode && editingDFAName ? editingDFAName : selectedDFAName ?? "Unsaved FA"}
        alphabetLocked={editMode ? false : false}
      />

      <HamburgerMenu
        onExportSelected={handleExportSelected}
        onImportJson={handleImportJson}
        onRegexToFA={handleRegexToFA}
        onConvertSelectedNfaToDfa={handleConvertSelectedNfaToDfa}
        onCreateGnfa={handleCreateGnfa}
        onCreateCfg={handleCreateCfg}
        onOpenChange={setIsMenuOpen}
      />


      <AutomatonCanvas
        ref={canvasRef}
        states={dfaManager.states}
        arrowPairs={dfaManager.arrowPairs}
        arrowSelection={dfaManager.arrowSelection}
        showLiveTransitionLabels={isMenuOpen || showNameDialog}
        selectionRect={selection.selectionRect}
        savedDFAs={dfaManager.savedDFAs}
        selectedDFAName={selectedDFAName}
        editMode={editMode}
        editingDFAName={editingDFAName}
        previewStates={importPreview?.states ?? null}
        previewArrowPairs={importPreview?.arrowPairs ?? null}
        previewPosition={importCursor}
        offset={canvasInteraction.offset}
        scale={canvasInteraction.scale}
        isDragging={canvasInteraction.isDragging}
        startingState={startingState}
        state={state}
        tmStateMode={tmStateMode}
        tmAcceptMode={tmAcceptMode}
        tmTransitionMode={tmTransitionMode}
        selectionMode={selection.selectionMode}
        renderTick={viewportTick}
        onMouseDown={pointerHandlers.onMouseDown}
        onMouseUp={pointerHandlers.onMouseUp}
        onMouseMove={pointerHandlers.onMouseMove}
        onWheel={canvasInteraction.onWheel}
        onClick={handleCanvasClick}
        onDoubleClick={pointerHandlers.onDoubleClick}
      />

      <ArrowInputFields
        arrowPairs={dfaManager.arrowPairs}
        states={dfaManager.states}
        alphabet={dfaManager.alphabet}
        transitionSlots={transitionSlots}
        scale={canvasInteraction.scale}
        offset={canvasInteraction.offset}
        canvasRef={canvasRef}
        showNameDialog={showNameDialog}
        visible={!isMenuOpen}
        onArrowLabelChange={(index, label) => {
          // Prevent duplicate labels between same from-to
          const pair = dfaManager.arrowPairs[index];
          if (!pair) return;
          if (label && dfaManager.arrowPairs.some((p, i) => i !== index && p.from === pair.from && p.to === pair.to && p.label === label)) {
            showToast("This symbol is already used for this transition.", "error");
            return;
          }
          dfaManager.updateArrowLabel(index, label);
        }}
      />

      <SelectionModeIndicator isActive={selection.selectionMode} />

      <AutomatonNameDialog
        isOpen={showNameDialog}
        dfaName={dfaName}
        title={nameDialogMode === "TM" ? "Name Your TM" : "Name Your FA"}
        placeholder={nameDialogMode === "TM" ? "Enter TM name..." : "Enter FA name..."}
        onNameChange={setDfaName}
        onSave={handleSaveDFA}
        onCancel={handleCancelDialog}
      />

      <AutomatonTableDisplay
        savedDFAs={dfaManager.savedDFAs}
        scale={canvasInteraction.scale}
        offset={canvasInteraction.offset}
        canvasRef={canvasRef}
        selectedDFAName={selectedDFAName}
        onSelect={(name) => setSelectedDFAName(name)}
      />

      <CanvasDialogs
        regexDialog={regexDialog}
        transitionCountDialog={transitionCountDialog}
        tmTransitionDialog={tmTransitionDialog}
        overwriteDialog={overwriteDialog}
        setRegexDialog={setRegexDialog}
        setTransitionCountDialog={setTransitionCountDialog}
        setTmTransitionDialog={setTmTransitionDialog}
        setOverwriteDialog={setOverwriteDialog}
        onCreateRegexAutomaton={handleCreateRegexAutomaton}
        onCloseRegexDialog={handleCloseRegexDialog}
        onTransitionCountConfirm={handleTransitionCountConfirm}
        onTmTransitionConfirm={handleTmTransitionConfirm}
        onOverwriteConfirm={handleOverwriteConfirm}
      />

      <FloatingArtifacts
        textArtifacts={textArtifacts}
        scale={canvasInteraction.scale}
        offset={canvasInteraction.offset}
        canvasRef={canvasRef}
        setTextArtifacts={setTextArtifacts}
      />

      <ToastAlert toast={toast} />
    </>
  );
}
