"use client";
import { useCallback, useEffect } from "react";
import { State } from "../lib/util-classes/state";
import { Transition } from "../lib/util-classes/transition";
import type { SelectionBounds, UseCanvasKeyboardShortcutsParams } from "../types/hooks";

export function useCanvasKeyboardShortcuts({
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
}: UseCanvasKeyboardShortcutsParams) {
  const deleteDFAByNames = useCallback((names: string[]) => {
    if (!names.length) return;
    const boundsToRemove = names
      .map(name => dfaManager.savedDFAs[name]?.bounds)
      .filter(Boolean) as SelectionBounds[];

    if (boundsToRemove.length > 0) {
      const toRemove = new Set<number>();
      dfaManager.states.forEach((st, index) => {
        const hit = boundsToRemove.some(b => {
          const minX = Math.min(b.x1, b.x2);
          const maxX = Math.max(b.x1, b.x2);
          const minY = Math.min(b.y1, b.y2);
          const maxY = Math.max(b.y1, b.y2);
          return st.x >= minX && st.x <= maxX && st.y >= minY && st.y <= maxY;
        });
        if (hit) toRemove.add(index);
      });

      if (toRemove.size > 0) {
        const indexMap = new Map<number, number>();
        const nextStates: State[] = [];
        dfaManager.states.forEach((st, index) => {
          if (toRemove.has(index)) return;
          indexMap.set(index, nextStates.length);
          nextStates.push(st);
        });

        dfaManager.setStates(nextStates);
        dfaManager.setArrowPairs(prev => {
          const nextPairs = prev
            .filter(pair => !toRemove.has(pair.from) && !toRemove.has(pair.to))
            .map(pair => pair.withEndpoints(indexMap.get(pair.from) ?? pair.from, indexMap.get(pair.to) ?? pair.to));
          setTransitionSlots(buildTransitionSlotsFromPairs(nextPairs));
          return nextPairs;
        });
        dfaManager.setArrowSelection([]);
      }
    }

    dfaManager.deleteDFAs(names);
    dfaManager.clearAlphabet();
    if (editingDFAName && names.includes(editingDFAName)) {
      setEditMode(false);
      setEditingDFAName(null);
      setEditingParentMode(null);
      dfaManager.setStates([]);
      dfaManager.setArrowPairs([]);
      dfaManager.setArrowSelection([]);
      setTransitionSlots({});
      dfaManager.clearAlphabet();
    }
    setSelectedDFAName(prev => (prev && names.includes(prev) ? null : prev));
  }, [buildTransitionSlotsFromPairs, dfaManager, editingDFAName, setEditMode, setEditingDFAName, setEditingParentMode, setSelectedDFAName, setTransitionSlots]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingTarget = !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTypingTarget && e.key !== "Escape") {
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedDFAName) {
          deleteDFAByNames([selectedDFAName]);
          return;
        }
        if (dfaManager.arrowSelection.length === 1) {
          const idx = dfaManager.arrowSelection[0];
          dfaManager.setStates(prev => {
            const nextStates = prev.filter((_, i) => i !== idx);
            const indexMap = new Map<number, number>();
            prev.forEach((_, oldIndex) => {
              if (oldIndex === idx) return;
              const newIndex = oldIndex > idx ? oldIndex - 1 : oldIndex;
              indexMap.set(oldIndex, newIndex);
            });
            dfaManager.setArrowPairs(prevPairs => {
              const nextPairs = prevPairs
                .filter(pair => pair.from !== idx && pair.to !== idx)
                .map(pair => pair.withEndpoints(indexMap.get(pair.from) ?? pair.from, indexMap.get(pair.to) ?? pair.to));
              setTransitionSlots(buildTransitionSlotsFromPairs(nextPairs));
              return nextPairs;
            });
            return nextStates;
          });
          dfaManager.setArrowSelection([]);
        } else if (dfaManager.arrowSelection.length === 2) {
          const [from, to] = dfaManager.arrowSelection;
          dfaManager.setArrowPairs(prev => {
            const nextPairs = prev.filter(p => !(p.from === from && p.to === to));
            setTransitionSlots(buildTransitionSlotsFromPairs(nextPairs));
            return nextPairs;
          });
          dfaManager.setArrowSelection([]);
        }
      } else if (e.key === "Escape") {
        if (importPreview) {
          setImportPreview(null);
          setImportCursor(null);
          return;
        }
        if (selection.isDrawingSelection) {
          selection.clearSelection();
        }
        if (selection.selectionMode) {
          selection.setSelectionMode(false);
        }
        if (road || roadSelection !== null) {
          setRoad(false);
          setRoadSelection(null);
          dfaManager.setArrowSelection([]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    buildTransitionSlotsFromPairs,
    deleteDFAByNames,
    dfaManager,
    importPreview,
    road,
    roadSelection,
    selectedDFAName,
    selection,
    setImportCursor,
    setImportPreview,
    setRoad,
    setRoadSelection,
    setTransitionSlots
  ]);
}
