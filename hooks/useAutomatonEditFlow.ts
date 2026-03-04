"use client";
import { useCallback, useEffect } from "react";
import { State } from "../lib/util-classes/state";
import { Transition } from "../lib/util-classes/transition";
import type { UseAutomatonEditFlowParams } from "../types/hooks";

export function useAutomatonEditFlow({
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
  forceRefresh,
  showToast
}: UseAutomatonEditFlowParams) {
  const closeNameFlow = useCallback(() => {
    setShowNameDialog(false);
    setDfaName("");
    setNameDialogMode("FA");
    selection.clearSelection();
    selection.setSelectionMode(false);
    setFinalize(false);
    setTmFinalize(false);
  }, [selection, setDfaName, setFinalize, setNameDialogMode, setShowNameDialog, setTmFinalize]);

  const saveSelectionWithName = useCallback((
    name: string,
    mode: "FA" | "TM",
    selectionRect: { x1: number; y1: number; x2: number; y2: number },
    forceOverwrite: boolean
  ) => {
    const success = dfaManager.saveDFA(name, selectionRect, {
      forceOverwrite,
      onError: message => showToast(message, "error")
    });
    if (!success) return;
    showToast(mode === "TM" ? `Saved TM as ${name}.` : `Saved FA as ${name}.`, "success");
    closeNameFlow();
  }, [closeNameFlow, dfaManager, showToast]);

  const handleSaveDFA = useCallback(() => {
    if (!selection.selectionRect) return;
    const cleanName = dfaName.trim();
    if (!cleanName) {
      showToast("Please enter a name.", "error");
      return;
    }

    if (dfaManager.savedDFAs[cleanName]) {
      setOverwriteDialog({
        isOpen: true,
        name: cleanName,
        mode: nameDialogMode,
        selectionRect: { ...selection.selectionRect }
      });
      return;
    }

    saveSelectionWithName(cleanName, nameDialogMode, selection.selectionRect, false);
  }, [dfaName, dfaManager.savedDFAs, nameDialogMode, saveSelectionWithName, selection.selectionRect, setOverwriteDialog, showToast]);

  const handleCancelDialog = useCallback(() => {
    setShowNameDialog(false);
    setDfaName("");
    setNameDialogMode("FA");
  }, [setDfaName, setNameDialogMode, setShowNameDialog]);

  const handleOverwriteConfirm = useCallback(() => {
    if (!overwriteDialog.selectionRect) {
      setOverwriteDialog({ isOpen: false, name: "", mode: "FA", selectionRect: null });
      return;
    }
    saveSelectionWithName(overwriteDialog.name, overwriteDialog.mode, overwriteDialog.selectionRect, true);
    setOverwriteDialog({ isOpen: false, name: "", mode: "FA", selectionRect: null });
  }, [overwriteDialog, saveSelectionWithName, setOverwriteDialog]);

  useEffect(() => {
    const handler = (e: any) => {
      const nextName = e.detail?.name;
      if (nextName && dfaManager.dfaAlphabets[nextName] && dfaManager.savedDFAs[nextName]) {
        dfaManager.restoreAlphabet(nextName);
        const snapshot = dfaManager.savedDFAs[nextName].snapshot;
        if (snapshot) {
          dfaManager.setStates(snapshot.states.map((st: State) => State.from(st)));
          dfaManager.setArrowPairs(snapshot.arrowPairs.map(pair => Transition.from(pair)));
          setTransitionSlots(buildTransitionSlotsFromPairs(snapshot.arrowPairs));
        } else {
          dfaManager.setStates([]);
          dfaManager.setArrowPairs([]);
          setTransitionSlots({});
        }
        dfaManager.setArrowSelection([]);
        setEditMode(true);
        setEditingDFAName(nextName);
        const isTmSnapshot = snapshot?.states?.some((st: State) => st.color.startsWith("tm-")) ?? false;
        setEditingParentMode(isTmSnapshot ? "TM" : "FA");
      }
    };

    window.addEventListener("editDFA", handler);
    return () => window.removeEventListener("editDFA", handler);
  }, [buildTransitionSlotsFromPairs, dfaManager, setEditMode, setEditingDFAName, setEditingParentMode, setTransitionSlots]);

  useEffect(() => {
    if (editMode && editingDFAName) {
      dfaManager.updateDfaAlphabet(editingDFAName, dfaManager.alphabet);
      const bounds = dfaManager.savedDFAs[editingDFAName]?.bounds;
      if (bounds) {
        dfaManager.saveDFA(editingDFAName, bounds, {
          forceOverwrite: true,
          onError: message => showToast(message, "error")
        });
      } else if (dfaManager.states.length > 0) {
        const minX = Math.min(...dfaManager.states.map(s => s.x));
        const maxX = Math.max(...dfaManager.states.map(s => s.x));
        const minY = Math.min(...dfaManager.states.map(s => s.y));
        const maxY = Math.max(...dfaManager.states.map(s => s.y));
        const padding = 24;
        dfaManager.saveDFA(editingDFAName, { x1: minX - padding, y1: minY - padding, x2: maxX + padding, y2: maxY + padding }, {
          forceOverwrite: true,
          onError: message => showToast(message, "error")
        });
      }
      forceRefresh();
    }
  }, [dfaManager, editMode, editingDFAName, forceRefresh, showToast]);

  const handleDoneEditing = useCallback(() => {
    if (editingDFAName) {
      if (dfaManager.states.length === 0) {
        showToast("Cannot save an empty DFA.", "error");
        return;
      }
      const existingBounds = dfaManager.savedDFAs[editingDFAName]?.bounds;
      let boundsToSave = existingBounds;
      if (!boundsToSave) {
        const minX = Math.min(...dfaManager.states.map(s => s.x));
        const maxX = Math.max(...dfaManager.states.map(s => s.x));
        const minY = Math.min(...dfaManager.states.map(s => s.y));
        const maxY = Math.max(...dfaManager.states.map(s => s.y));
        const padding = 24;
        boundsToSave = {
          x1: minX - padding,
          y1: minY - padding,
          x2: maxX + padding,
          y2: maxY + padding
        };
      }
      dfaManager.saveDFA(editingDFAName, boundsToSave, {
        forceOverwrite: true,
        onError: message => showToast(message, "error")
      });
    }
    setEditMode(false);
    setEditingDFAName(null);
    setEditingParentMode(null);
  }, [dfaManager, editingDFAName, setEditMode, setEditingDFAName, setEditingParentMode, showToast]);

  return {
    handleSaveDFA,
    handleCancelDialog,
    handleOverwriteConfirm,
    handleDoneEditing
  };
}
