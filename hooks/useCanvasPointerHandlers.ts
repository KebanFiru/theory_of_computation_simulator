"use client";
import { useCallback } from "react";
import { State } from "../lib/util-classes/state";
import type { UseCanvasPointerHandlersParams } from "../types/hooks";

export function useCanvasPointerHandlers({
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
}: UseCanvasPointerHandlersParams) {
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRef.current || !rect) return;
    const x = (e.clientX - rect.left - canvasInteraction.offset.x) / canvasInteraction.scale;
    const y = (e.clientY - rect.top - canvasInteraction.offset.y) / canvasInteraction.scale;

    if (selection.selectionMode) {
      selection.startSelection(x, y);
      return;
    }

    if (!editMode) {
      const hitSavedDFA = Object.entries(dfaManager.savedDFAs).find(([, data]) => {
        const b = data.bounds;
        const minX = Math.min(b.x1, b.x2);
        const maxX = Math.max(b.x1, b.x2);
        const minY = Math.min(b.y1, b.y2);
        const maxY = Math.max(b.y1, b.y2);
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
      });

      if (hitSavedDFA) {
        const [name, data] = hitSavedDFA;
        const b = data.bounds;
        const minX = Math.min(b.x1, b.x2);
        const maxX = Math.max(b.x1, b.x2);
        const minY = Math.min(b.y1, b.y2);
        const maxY = Math.max(b.y1, b.y2);
        const liveStateSnapshot = dfaManager.states
          .map((state, index) => ({ index, x: state.x, y: state.y }))
          .filter(state => state.x >= minX && state.x <= maxX && state.y >= minY && state.y <= maxY);

        setSelectedDFAName(name);
        setDraggedSavedFA({
          name,
          anchor: { x, y },
          bounds: { ...data.bounds },
          snapshotStates: data.snapshot?.states?.map(state => State.from(state)) ?? [],
          liveStateSnapshot
        });
        return;
      }
    }

    const circleIdx = dfaManager.states.findIndex(
      c => Math.hypot(c.x - x, c.y - y) <= c.r
    );
    if (circleIdx !== -1) {
      canvasInteraction.setDraggedCircle(circleIdx);
      canvasInteraction.setDragOffset({
        x: x - dfaManager.states[circleIdx].x,
        y: y - dfaManager.states[circleIdx].y
      });
      return;
    }
    canvasInteraction.setIsDragging(true);
    canvasInteraction.setLastPos({ x: e.clientX, y: e.clientY });
  }, [canvasRef, canvasInteraction, selection, editMode, dfaManager.savedDFAs, dfaManager.states, setSelectedDFAName, setDraggedSavedFA]);

  const onMouseUp = useCallback(() => {
    if (selection.isDrawingSelection && selection.selectionStart) {
      selection.finishSelection();
    }

    canvasInteraction.setIsDragging(false);
    canvasInteraction.setDraggedCircle(null);
    canvasInteraction.setDragOffset(null);
    setDraggedSavedFA(null);
  }, [canvasInteraction, selection, setDraggedSavedFA]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRef.current || !rect) return;
    const cursorX = (e.clientX - rect.left - canvasInteraction.offset.x) / canvasInteraction.scale;
    const cursorY = (e.clientY - rect.top - canvasInteraction.offset.y) / canvasInteraction.scale;
    setLastCanvasPos({ x: cursorX, y: cursorY });

    if (importPreview) {
      setImportCursor({ x: cursorX, y: cursorY });
      return;
    }

    if (draggedSavedFA) {
      const dx = cursorX - draggedSavedFA.anchor.x;
      const dy = cursorY - draggedSavedFA.anchor.y;

      if (draggedSavedFA.liveStateSnapshot.length > 0) {
        const byIndex = new Map(draggedSavedFA.liveStateSnapshot.map(item => [item.index, item]));
        dfaManager.setStates(prev =>
          prev.map((state, index) => {
            const original = byIndex.get(index);
            if (!original) return state;
            return State.from(state).moveTo(original.x + dx, original.y + dy);
          })
        );
      }

      dfaManager.setSavedDFAs(prev => {
        const current = prev[draggedSavedFA.name];
        if (!current) return prev;

        const nextBounds = {
          x1: draggedSavedFA.bounds.x1 + dx,
          y1: draggedSavedFA.bounds.y1 + dy,
          x2: draggedSavedFA.bounds.x2 + dx,
          y2: draggedSavedFA.bounds.y2 + dy
        };

        const nextSnapshotStates = draggedSavedFA.snapshotStates.map(state =>
          State.from({
            ...state,
            x: state.x + dx,
            y: state.y + dy
          })
        );

        return {
          ...prev,
          [draggedSavedFA.name]: {
            ...current,
            bounds: nextBounds,
            snapshot: current.snapshot
              ? {
                  ...current.snapshot,
                  states: nextSnapshotStates
                }
              : current.snapshot
          }
        };
      });
      return;
    }

    if (selection.isDrawingSelection && selection.selectionStart) {
      selection.updateSelection(cursorX, cursorY);
      return;
    }

    if (canvasInteraction.draggedCircle !== null && canvasInteraction.dragOffset) {
      dfaManager.setStates(prev =>
        prev.map((c, i) =>
          i === canvasInteraction.draggedCircle
            ? State.from(c).moveTo(cursorX - canvasInteraction.dragOffset!.x, cursorY - canvasInteraction.dragOffset!.y)
            : c
        )
      );
      return;
    }
    if (!canvasInteraction.isDragging) return;
    canvasInteraction.setOffset(prev => ({
      x: prev.x + (e.clientX - canvasInteraction.lastPos.x),
      y: prev.y + (e.clientY - canvasInteraction.lastPos.y)
    }));
    canvasInteraction.setLastPos({ x: e.clientX, y: e.clientY });
  }, [canvasRef, canvasInteraction, setLastCanvasPos, importPreview, setImportCursor, draggedSavedFA, dfaManager, selection]);

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    if (selection.selectionMode || selection.isDrawingSelection) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRef.current || !rect) return;

    const canvasX = (e.clientX - rect.left - canvasInteraction.offset.x) / canvasInteraction.scale;
    const canvasY = (e.clientY - rect.top - canvasInteraction.offset.y) / canvasInteraction.scale;

    const clickedCircleIndex = dfaManager.states.findIndex(
      circle => Math.hypot(circle.x - canvasX, circle.y - canvasY) <= circle.r
    );

    if (clickedCircleIndex !== -1) {
      dfaManager.setArrowSelection([clickedCircleIndex]);
      return;
    }

    dfaManager.setArrowSelection([]);
  }, [canvasRef, canvasInteraction.offset.x, canvasInteraction.offset.y, canvasInteraction.scale, dfaManager, selection.isDrawingSelection, selection.selectionMode]);

  return {
    onMouseDown,
    onMouseUp,
    onMouseMove,
    onDoubleClick
  };
}
