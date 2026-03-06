"use client";
import { useCallback, useEffect, useRef } from "react";
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
  const initializedEditNameRef = useRef<string | null>(null);

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

    const minX = Math.min(selectionRect.x1, selectionRect.x2);
    const maxX = Math.max(selectionRect.x1, selectionRect.x2);
    const minY = Math.min(selectionRect.y1, selectionRect.y2);
    const maxY = Math.max(selectionRect.y1, selectionRect.y2);

    const selectedIndexSet = new Set<number>();
    dfaManager.states.forEach((state, index) => {
      if (state.x >= minX && state.x <= maxX && state.y >= minY && state.y <= maxY) {
        selectedIndexSet.add(index);
      }
    });

    if (selectedIndexSet.size > 0) {
      const indexMap = new Map<number, number>();
      const nextStates: State[] = [];

      dfaManager.states.forEach((state, index) => {
        if (selectedIndexSet.has(index)) return;
        indexMap.set(index, nextStates.length);
        nextStates.push(state);
      });

      const nextArrowPairs = dfaManager.arrowPairs
        .filter(pair => !selectedIndexSet.has(pair.from) && !selectedIndexSet.has(pair.to))
        .map(pair => pair.withEndpoints(indexMap.get(pair.from) ?? pair.from, indexMap.get(pair.to) ?? pair.to));

      dfaManager.setStates(nextStates);
      dfaManager.setArrowPairs(nextArrowPairs);
      dfaManager.setArrowSelection([]);
      setTransitionSlots(buildTransitionSlotsFromPairs(nextArrowPairs));

      if (nextStates.length === 0) {
        dfaManager.clearAlphabet();
      }
    }

    showToast(mode === "TM" ? `Saved TM as ${name}.` : `Saved FA as ${name}.`, "success");
    closeNameFlow();
  }, [buildTransitionSlotsFromPairs, closeNameFlow, dfaManager, setTransitionSlots, showToast]);

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
    closeNameFlow();
  }, [closeNameFlow]);

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
      if (!nextName || !dfaManager.savedDFAs[nextName]) return;

      const saved = dfaManager.savedDFAs[nextName];
      const persistedAlphabet = dfaManager.dfaAlphabets[nextName];
      const fallbackAlphabet = (saved.table?.[0] ?? []).slice(1).map(symbol => String(symbol));
      const alphabetToUse = persistedAlphabet ? [...persistedAlphabet] : fallbackAlphabet;

      dfaManager.setAlphabet(alphabetToUse);
      if (!persistedAlphabet) {
        dfaManager.updateDfaAlphabet(nextName, alphabetToUse);
      }

      const snapshot = saved.snapshot;
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
    };

    window.addEventListener("editDFA", handler);
    return () => window.removeEventListener("editDFA", handler);
  }, [buildTransitionSlotsFromPairs, dfaManager, setEditMode, setEditingDFAName, setEditingParentMode, setTransitionSlots]);

  useEffect(() => {
    if (!editMode || !editingDFAName) {
      initializedEditNameRef.current = null;
      return;
    }

    if (initializedEditNameRef.current === editingDFAName) {
      return;
    }

    initializedEditNameRef.current = editingDFAName;

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
  }, [dfaManager, editMode, editingDFAName, forceRefresh, showToast]);

  const handleDoneEditing = useCallback(() => {
    if (editingDFAName) {
      if (dfaManager.states.length === 0) {
        showToast("Cannot save an empty DFA.", "error");
        return;
      }

      const minX = Math.min(...dfaManager.states.map(s => s.x));
      const maxX = Math.max(...dfaManager.states.map(s => s.x));
      const minY = Math.min(...dfaManager.states.map(s => s.y));
      const maxY = Math.max(...dfaManager.states.map(s => s.y));
      const padding = 24;
      const boundsToSave = {
        x1: minX - padding,
        y1: minY - padding,
        x2: maxX + padding,
        y2: maxY + padding
      };

      dfaManager.saveDFA(editingDFAName, boundsToSave, {
        forceOverwrite: true,
        onError: message => showToast(message, "error")
      });
    }
    dfaManager.setStates([]);
    dfaManager.setArrowPairs([]);
    dfaManager.setArrowSelection([]);
    dfaManager.clearAlphabet();
    setTransitionSlots({});
    setEditMode(false);
    setEditingDFAName(null);
    setEditingParentMode(null);
  }, [dfaManager, editingDFAName, setEditMode, setEditingDFAName, setEditingParentMode, setTransitionSlots, showToast]);

  return {
    handleSaveDFA,
    handleCancelDialog,
    handleOverwriteConfirm,
    handleDoneEditing
  };
}
