"use client";
import { useCallback, useEffect } from "react";
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
  setLastCanvasPos,
  textArtifacts,
  setTextArtifacts
}: UseCanvasPointerHandlersParams) {
  const stopPointerInteraction = useCallback(() => {
    if (selection.isDrawingSelection && selection.selectionStart) {
      selection.finishSelection();
    }

    canvasInteraction.setIsDragging(false);
    canvasInteraction.setDraggedCircle(null);
    canvasInteraction.setDragOffset(null);
    setDraggedSavedFA(null);
  }, [canvasInteraction, selection, setDraggedSavedFA]);

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRef.current || !rect) return;
    const cursorX = (clientX - rect.left - canvasInteraction.offset.x) / canvasInteraction.scale;
    const cursorY = (clientY - rect.top - canvasInteraction.offset.y) / canvasInteraction.scale;
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

      if (draggedSavedFA.artifactSnapshot.length > 0) {
        setTextArtifacts(prev => prev.map(artifact => {
          const snap = draggedSavedFA.artifactSnapshot.find(s => s.id === artifact.id);
          if (!snap) return artifact;
          return { ...artifact, position: { x: snap.x + dx, y: snap.y + dy } };
        }));
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
      x: prev.x + (clientX - canvasInteraction.lastPos.x),
      y: prev.y + (clientY - canvasInteraction.lastPos.y)
    }));
    canvasInteraction.setLastPos({ x: clientX, y: clientY });
  }, [canvasRef, canvasInteraction, setLastCanvasPos, importPreview, setImportCursor, draggedSavedFA, dfaManager, selection, setTextArtifacts]);

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
          liveStateSnapshot,
          artifactSnapshot: textArtifacts
            .filter(a => a.relatedDFAName === name)
            .map(a => ({ id: a.id, x: a.position.x, y: a.position.y }))
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
  }, [canvasRef, canvasInteraction, selection, editMode, dfaManager.savedDFAs, dfaManager.states, setSelectedDFAName, setDraggedSavedFA, textArtifacts]);

  const onMouseUp = useCallback(() => {
    stopPointerInteraction();
  }, [stopPointerInteraction]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const isTrackingOutsideCanvas =
      selection.isDrawingSelection ||
      canvasInteraction.draggedCircle !== null ||
      canvasInteraction.isDragging ||
      draggedSavedFA !== null;

    if (isTrackingOutsideCanvas) return;
    handlePointerMove(e.clientX, e.clientY);
  }, [canvasInteraction.draggedCircle, canvasInteraction.isDragging, draggedSavedFA, handlePointerMove, selection.isDrawingSelection]);

  useEffect(() => {
    const isTrackingOutsideCanvas =
      selection.isDrawingSelection ||
      canvasInteraction.draggedCircle !== null ||
      canvasInteraction.isDragging ||
      draggedSavedFA !== null;

    if (!isTrackingOutsideCanvas) return;

    const handleWindowMouseMove = (event: MouseEvent) => {
      handlePointerMove(event.clientX, event.clientY);
    };

    const handleWindowMouseUp = () => {
      stopPointerInteraction();
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [canvasInteraction.draggedCircle, canvasInteraction.isDragging, draggedSavedFA, handlePointerMove, selection.isDrawingSelection, stopPointerInteraction]);

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
