"use client";
import { useState, useCallback } from "react";

export function useSelectionMode() {
  const [selectionRect, setSelectionRect] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [isDrawingSelection, setIsDrawingSelection] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);

  const startSelection = useCallback((x: number, y: number) => {
    setIsDrawingSelection(true);
    setSelectionStart({ x, y });
  }, []);

  const updateSelection = useCallback(
    (x: number, y: number) => {
      if (selectionStart) {
        setSelectionRect({
          x1: selectionStart.x,
          y1: selectionStart.y,
          x2: x,
          y2: y
        });
      }
    },
    [selectionStart]
  );

  const finishSelection = useCallback(() => {
    setIsDrawingSelection(false);
    setSelectionStart(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionRect(null);
    setIsDrawingSelection(false);
    setSelectionStart(null);
  }, []);

  return {
    selectionRect,
    setSelectionRect,
    isDrawingSelection,
    selectionStart,
    selectionMode,
    setSelectionMode,
    startSelection,
    updateSelection,
    finishSelection,
    clearSelection
  };
}
