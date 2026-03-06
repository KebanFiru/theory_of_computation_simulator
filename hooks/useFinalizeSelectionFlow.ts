"use client";
import { useEffect } from "react";
import type { UseFinalizeSelectionFlowParams } from "../types/hooks";

export function useFinalizeSelectionFlow({
  finalize,
  setFinalize,
  tmFinalize,
  setTmFinalize,
  selection,
  states,
  setNameDialogMode,
  setShowNameDialog,
  showToast
}: UseFinalizeSelectionFlowParams) {
  useEffect(() => {
    if (!finalize) return;

    if (!selection.selectionMode && !selection.selectionRect) {
      selection.setSelectionMode(true);
      setFinalize(false);
      return;
    }

    if (selection.selectionRect) {
      const rect = selection.selectionRect;
      const minX = Math.min(rect.x1, rect.x2);
      const maxX = Math.max(rect.x1, rect.x2);
      const minY = Math.min(rect.y1, rect.y2);
      const maxY = Math.max(rect.y1, rect.y2);
      const hasStateInSelection = states.some(
        st => st.x >= minX && st.x <= maxX && st.y >= minY && st.y <= maxY
      );
      if (!hasStateInSelection) {
        showToast("No states found in the selection area.", "error");
        selection.clearSelection();
        selection.setSelectionMode(false);
        setFinalize(false);
        return;
      }
      setNameDialogMode("FA");
      setShowNameDialog(true);
      selection.setSelectionMode(false);
      setFinalize(false);
      return;
    }

    showToast("Please draw a selection rectangle around the DFA first.", "info");
    setFinalize(false);
  }, [finalize, selection, setFinalize, setNameDialogMode, setShowNameDialog, showToast, states]);

  useEffect(() => {
    if (!tmFinalize) return;

    if (!selection.selectionMode && !selection.selectionRect) {
      selection.setSelectionMode(true);
      setTmFinalize(false);
      return;
    }

    if (selection.selectionRect) {
      const rect = selection.selectionRect;
      const minX = Math.min(rect.x1, rect.x2);
      const maxX = Math.max(rect.x1, rect.x2);
      const minY = Math.min(rect.y1, rect.y2);
      const maxY = Math.max(rect.y1, rect.y2);
      const selectedTmStates = states.filter(
        st => st.x >= minX && st.x <= maxX && st.y >= minY && st.y <= maxY && st.color.startsWith("tm-")
      );
      const hasTmState = selectedTmStates.length > 0;
      if (!hasTmState) {
        showToast("No TM states found in the selection area.", "error");
        selection.clearSelection();
        selection.setSelectionMode(false);
        setTmFinalize(false);
        return;
      }

      const hasTmFinalState = selectedTmStates.some(st => st.color === "tm-blue");
      if (!hasTmFinalState) {
        showToast("TM must include at least one final state (tm-blue).", "error");
        selection.clearSelection();
        selection.setSelectionMode(false);
        setTmFinalize(false);
        return;
      }

      setNameDialogMode("TM");
      setShowNameDialog(true);
      selection.setSelectionMode(false);
      setTmFinalize(false);
      return;
    }

    showToast("Please draw a selection rectangle around the TM first.", "info");
    setTmFinalize(false);
  }, [tmFinalize, selection, setTmFinalize, setNameDialogMode, setShowNameDialog, showToast, states]);
}
